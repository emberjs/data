import { assert, warn } from '@ember/debug';
import { isNone } from '@ember/utils';
import { DEBUG } from '@glimmer/env';

import type { IdentifierCache } from '../../identifiers/cache';
import { identifierCacheFor } from '../../identifiers/cache';
import type {
  ExistingResourceObject,
  NewResourceIdentifierObject,
  ResourceIdentifierObject,
} from '../../ts-interfaces/ember-data-json-api';
import type { StableRecordIdentifier } from '../../ts-interfaces/identifier';
import type { RecordInstance } from '../../ts-interfaces/record-instance';
import constructResource from '../../utils/construct-resource';
import type CoreStore from '../core-store';
import IdentityMap from '../identity-map';
import type InternalModelMap from '../internal-model-map';
import InternalModel from '../model/internal-model';

/**
  @module @ember-data/store
*/

const FactoryCache = new WeakMap<CoreStore, InternalModelFactory>();
type NewResourceInfo = { type: string; id: string | null };

const RecordCache = new WeakMap<RecordInstance, StableRecordIdentifier>();

export function peekRecordIdentifier(record: any): StableRecordIdentifier | undefined {
  return RecordCache.get(record);
}

/**
 * Retrieves the unique referentially-stable RecordIdentifier assigned to the given
 * record instance.
 *
 * @method recordIdentifierFor
 * @public
 * @static
 * @for @ember-data/store
 * @param {Object} record a record instance previously obstained from the store.
 * @returns
 */
export function recordIdentifierFor(record: RecordInstance): StableRecordIdentifier {
  let identifier = RecordCache.get(record);

  if (DEBUG && identifier === undefined) {
    throw new Error(`${record} is not a record instantiated by @ember-data/store`);
  }

  return identifier as StableRecordIdentifier;
}

export function setRecordIdentifier(record: RecordInstance, identifier: StableRecordIdentifier): void {
  if (DEBUG && RecordCache.has(record)) {
    throw new Error(`${record} was already assigned an identifier`);
  }

  /*
  It would be nice to do a reverse check here that an identifier has not
  previously been assigned a record; however, unload + rematerialization
  prevents us from having a great way of doing so when CustomRecordClasses
  don't necessarily give us access to a `isDestroyed` for dematerialized
  instance.
  */

  RecordCache.set(record, identifier);
}

export function internalModelFactoryFor(store: CoreStore): InternalModelFactory {
  let factory = FactoryCache.get(store);

  if (factory === undefined) {
    factory = new InternalModelFactory(store);
    FactoryCache.set(store, factory);
  }

  return factory;
}

/**
 * The InternalModelFactory handles the lifecyle of
 * instantiating, caching, and destroying InternalModel
 * instances.
 *
 * @class InternalModelFactory
 * @internal
 */
export default class InternalModelFactory {
  declare _identityMap: IdentityMap;
  declare identifierCache: IdentifierCache;
  declare store: CoreStore;

  constructor(store: CoreStore) {
    this.store = store;
    this.identifierCache = identifierCacheFor(store);
    this.identifierCache.__configureMerge((identifier, matchedIdentifier, resourceData) => {
      let intendedIdentifier = identifier;
      if (identifier.id !== matchedIdentifier.id) {
        intendedIdentifier = 'id' in resourceData && identifier.id === resourceData.id ? identifier : matchedIdentifier;
      } else if (identifier.type !== matchedIdentifier.type) {
        intendedIdentifier =
          'type' in resourceData && identifier.type === resourceData.type ? identifier : matchedIdentifier;
      }
      let altIdentifier = identifier === intendedIdentifier ? matchedIdentifier : identifier;

      // check for duplicate InternalModel's
      const map = this.modelMapFor(identifier.type);
      let im = map.get(intendedIdentifier.lid);
      let otherIm = map.get(altIdentifier.lid);

      // we cannot merge internalModels when both have records
      // (this may not be strictly true, we could probably swap the internalModel the record points at)
      if (im && otherIm && im.hasRecord && otherIm.hasRecord) {
        if ('id' in resourceData) {
          throw new Error(
            `Failed to update the 'id' for the RecordIdentifier '${identifier.type}:${identifier.id} (${identifier.lid})' to '${resourceData.id}', because that id is already in use by '${matchedIdentifier.type}:${matchedIdentifier.id} (${matchedIdentifier.lid})'`
          );
        }
        // TODO @runspired determine when this is even possible
        assert(
          `Failed to update the RecordIdentifier '${identifier.type}:${identifier.id} (${identifier.lid})' to merge with the detected duplicate identifier '${matchedIdentifier.type}:${matchedIdentifier.id} (${matchedIdentifier.lid})'`
        );
      }

      // remove otherIm from cache
      if (otherIm) {
        map.remove(otherIm, altIdentifier.lid);
      }

      if (im === null && otherIm === null) {
        // nothing more to do
        return intendedIdentifier;

        // only the other has an InternalModel
        // OR only the other has a Record
      } else if ((im === null && otherIm !== null) || (im && !im.hasRecord && otherIm && otherIm.hasRecord)) {
        if (im) {
          // TODO check if we are retained in any async relationships
          map.remove(im, intendedIdentifier.lid);
          // im.destroy();
        }
        im = otherIm;
        // TODO do we need to notify the id change?
        im._id = intendedIdentifier.id;
        map.add(im, intendedIdentifier.lid);

        // just use im
      } else {
        // otherIm.destroy();
      }

      /*
      TODO @runspired consider adding this to make polymorphism even nicer
      if (HAS_RECORD_DATA_PACKAGE) {
        if (identifier.type !== matchedIdentifier.type) {
          const graphFor = require('@ember-data/record-data/-private').graphFor;
          graphFor(this).registerPolymorphicType(identifier.type, matchedIdentifier.type);
        }
      }
      */

      return intendedIdentifier;
    });
    this._identityMap = new IdentityMap();
  }

  /**
   * Retrieve the InternalModel for a given { type, id, lid }.
   *
   * If an InternalModel does not exist, it instantiates one.
   *
   * If an InternalModel does exist bus has a scheduled destroy,
   *   the scheduled destroy will be cancelled.
   *
   * @method lookup
   * @private
   */
  lookup(resource: ResourceIdentifierObject, data?: ExistingResourceObject): InternalModel {
    if (data !== undefined) {
      // if we've been given data associated with this lookup
      // we must first give secondary-caches for LIDs the
      // opportunity to populate based on it
      this.identifierCache.getOrCreateRecordIdentifier(data);
    }

    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    const internalModel = this.peek(identifier);

    if (internalModel) {
      // unloadRecord is async, if one attempts to unload + then sync push,
      //   we must ensure the unload is canceled before continuing
      //   The createRecord path will take _existingInternalModelForId()
      //   which will call `destroySync` instead for this unload + then
      //   sync createRecord scenario. Once we have true client-side
      //   delete signaling, we should never call destroySync
      if (internalModel.hasScheduledDestroy()) {
        internalModel.cancelDestroy();
      }

      return internalModel;
    }

    return this._build(identifier, false);
  }

  /**
   * Peek the InternalModel for a given { type, id, lid }.
   *
   * If an InternalModel does not exist, return `null`.
   *
   * @method peek
   * @private
   */
  peek(identifier: StableRecordIdentifier): InternalModel | null {
    return this.modelMapFor(identifier.type).get(identifier.lid);
  }

  getByResource(resource: ResourceIdentifierObject): InternalModel {
    const normalizedResource = constructResource(resource);

    return this.lookup(normalizedResource);
  }

  setRecordId(type: string, id: string, lid: string) {
    const resource: NewResourceIdentifierObject = { type, id: null, lid };
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    const internalModel = this.peek(identifier);

    if (internalModel === null) {
      throw new Error(`Cannot set the id ${id} on the record ${type}:${lid} as there is no such record in the cache.`);
    }

    let oldId = internalModel.id;
    let modelName = internalModel.modelName;

    // ID absolutely can't be missing if the oldID is empty (missing Id in response for a new record)
    assert(
      `'${modelName}' was saved to the server, but the response does not have an id and your record does not either.`,
      !(id === null && oldId === null)
    );

    // ID absolutely can't be different than oldID if oldID is not null
    // TODO this assertion and restriction may not strictly be needed in the identifiers world
    assert(
      `Cannot update the id for '${modelName}:${lid}' from '${oldId}' to '${id}'.`,
      !(oldId !== null && id !== oldId)
    );

    // ID can be null if oldID is not null (altered ID in response for a record)
    // however, this is more than likely a developer error.
    if (oldId !== null && id === null) {
      warn(
        `Your ${modelName} record was saved to the server, but the response does not have an id.`,
        !(oldId !== null && id === null)
      );
      return;
    }

    let existingInternalModel = this.peekById(modelName, id);

    assert(
      `'${modelName}' was saved to the server, but the response returned the new id '${id}', which has already been used with another record.'`,
      isNone(existingInternalModel) || existingInternalModel === internalModel
    );

    if (identifier.id === null) {
      this.identifierCache.updateRecordIdentifier(identifier, { type, id });
    }

    internalModel.setId(id, true);
  }

  peekById(type: string, id: string): InternalModel | null {
    const identifier = this.identifierCache.peekRecordIdentifier({ type, id });
    let internalModel = identifier ? this.modelMapFor(type).get(identifier.lid) : null;

    if (internalModel && internalModel.hasScheduledDestroy()) {
      // unloadRecord is async, if one attempts to unload + then sync create,
      //   we must ensure the unload is complete before starting the create
      //   The push path will take this.lookup()
      //   which will call `cancelDestroy` instead for this unload + then
      //   sync push scenario. Once we have true client-side
      //   delete signaling, we should never call destroySync
      internalModel.destroySync();
      internalModel = null;
    }
    return internalModel;
  }

  build(newResourceInfo: NewResourceInfo): InternalModel {
    return this._build(newResourceInfo, true);
  }

  _build(resource: StableRecordIdentifier, isCreate: false): InternalModel;
  _build(resource: NewResourceInfo, isCreate: true): InternalModel;
  _build(resource: StableRecordIdentifier | NewResourceInfo, isCreate: boolean = false): InternalModel {
    if (isCreate === true && resource.id) {
      let existingInternalModel = this.peekById(resource.type, resource.id);

      assert(
        `The id ${resource.id} has already been used with another '${resource.type}' record.`,
        !existingInternalModel
      );
    }

    const { identifierCache } = this;
    let identifier: StableRecordIdentifier;

    if (isCreate === true) {
      identifier = identifierCache.createIdentifierForNewRecord(resource);
    } else {
      identifier = resource as StableRecordIdentifier;
    }

    // lookupFactory should really return an object that creates
    // instances with the injections applied
    let internalModel = new InternalModel(this.store, identifier);

    this.modelMapFor(resource.type).add(internalModel, identifier.lid);

    return internalModel;
  }

  remove(internalModel: InternalModel): void {
    let recordMap = this.modelMapFor(internalModel.modelName);
    let clientId = internalModel.identifier.lid;

    recordMap.remove(internalModel, clientId);

    const { identifier } = internalModel;
    this.identifierCache.forgetRecordIdentifier(identifier);
  }

  modelMapFor(type: string): InternalModelMap {
    return this._identityMap.retrieve(type);
  }

  clear(type?: string) {
    if (type === undefined) {
      this._identityMap.clear();
    } else {
      this.modelMapFor(type).clear();
    }
  }
}
