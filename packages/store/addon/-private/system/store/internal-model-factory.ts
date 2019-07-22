import coerceId from '../coerce-id';
import { assert, warn } from '@ember/debug';
import { IdentifierCache, identifierCacheFor } from '../../identifiers/cache';
import InternalModel from '../model/internal-model';
import Store from '../store';
import IdentityMap from '../identity-map';
import { StableRecordIdentifier } from '../../ts-interfaces/identifier';
import InternalModelMap from '../internal-model-map';
import { isNone } from '@ember/utils';
import { IDENTIFIERS } from '@ember-data/canary-features';
import { Record } from '../../ts-interfaces/record';
import { ResourceIdentifierObject, ExistingResourceObject } from '../../ts-interfaces/ember-data-json-api';
import hasValidId from '../../utils/has-valid-id';
import { DEBUG } from '@glimmer/env';

/**
  @module @ember-data/store
*/

const FactoryCache = new WeakMap<Store, InternalModelFactory>();
const RecordCache = new WeakMap<Record, StableRecordIdentifier>();

export function recordIdentifierFor(record: Record): StableRecordIdentifier {
  let identifier = RecordCache.get(record);

  if (DEBUG && identifier === undefined) {
    throw new Error(`${record} is not a record instantiated by @ember-data/store`);
  }

  return identifier as StableRecordIdentifier;
}

export function setRecordIdentifier(record: Record, identifier: StableRecordIdentifier): void {
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

export function internalModelFactoryFor(store: Store): InternalModelFactory {
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
 * @internal
 */
export default class InternalModelFactory {
  private _identityMap: IdentityMap;
  private _newlyCreated: IdentityMap;
  public identifierCache: IdentifierCache;

  constructor(public store: Store) {
    this.identifierCache = identifierCacheFor(store);
    this.identifierCache.__configureMerge((identifier, matchedIdentifier, resourceData) => {
      const intendedIdentifier = identifier.id === resourceData.id ? identifier : matchedIdentifier;
      const altIdentifier = identifier.id === resourceData.id ? matchedIdentifier : identifier;

      // check for duplicate InternalModel's
      const map = this.modelMapFor(identifier.type);
      let im = map.get(intendedIdentifier.lid);
      let otherIm = map.get(altIdentifier.lid);

      // we cannot merge internalModels when both have records
      // (this may not be strictly true, we could probably swap the internalModel the record points at)
      if (im && otherIm && im.hasRecord && otherIm.hasRecord) {
        throw new Error(
          `Failed to update the 'id' for the RecordIdentifier '${identifier}' to '${resourceData.id}', because that id is already in use by '${matchedIdentifier}'`
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

      return intendedIdentifier;
    });
    this._identityMap = new IdentityMap();
    if (!IDENTIFIERS) {
      this._newlyCreated = new IdentityMap();
    }
  }

  /**
   * Retrieve the InternalModel for a given { type, id, lid }.
   *
   * If an InternalModel does not exist, it instantiates one.
   *
   * If an InternalModel does exist bus has a scheduled destroy,
   *   the scheduled destroy will be cancelled.
   *
   * @internal
   */
  lookup(modelName: string, id: string, clientId?: string | null, data?: ExistingResourceObject): InternalModel;
  lookup(modelName: string, id: null, clientId: string, data?: ExistingResourceObject): InternalModel;
  lookup(modelName: string, id: string | null, clientId?: string | null, data?: ExistingResourceObject): InternalModel {
    if (IDENTIFIERS && data !== undefined) {
      // if we've been given data associated with this lookup
      // we must first give secondary-caches for LIDs the
      // opportunity to populate based on it
      this.identifierCache.getOrCreateRecordIdentifier(data);
    }

    let trueId = id === null ? null : coerceId(id);

    if (!hasValidId(trueId, clientId)) {
      throw new Error(`Either id or clientId must be a valid id`);
    }
    let internalModel = this.peek(modelName, trueId, clientId);

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

    return this._build(modelName, trueId, clientId, false);
  }

  /**
   * Peek the InternalModel for a given { type, id, lid }.
   *
   * If an InternalModel does not exist, return `null`.
   *
   * @internal
   */
  peek(modelName: string, id: string, clientId?: string | null): InternalModel | null;
  peek(modelName: string, id: null, clientId: string): InternalModel | null;
  peek(modelName: string, id: string | null, clientId?: string | null): InternalModel | null {
    if (!hasValidId(id, clientId)) {
      throw new Error(`Either id or clientId must be a valid id`);
    }

    if (IDENTIFIERS) {
      let resource: ResourceIdentifierObject = { type: modelName, id };
      if (clientId) {
        resource.lid = clientId;
      }

      const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

      return this.modelMapFor(modelName).get(identifier.lid);
    } else {
      let internalModel: InternalModel | null = null;

      if (clientId) {
        internalModel = this._newlyCreatedModelsFor(modelName).get(clientId);
      }

      if (!internalModel && id) {
        internalModel = this.modelMapFor(modelName).get(id);
      }

      return internalModel;
    }
  }

  getByResource(resource: ResourceIdentifierObject): InternalModel {
    if (IDENTIFIERS) {
      if (!hasValidId(resource.id, resource.lid)) {
        throw new Error(`Either id or lid must be a valid id`);
      }

      return this.lookup(resource.type, resource.id, resource.lid || null);
    } else {
      let res = resource as { type: string; clientId?: string; id: string | null };
      let internalModel: InternalModel | null = null;

      if (res.clientId) {
        internalModel = this._newlyCreatedModelsFor(resource.type).get(res.clientId);
      }

      if (internalModel === null) {
        internalModel = this.lookup(res.type, res.id as string, resource.lid);
      }

      return internalModel;
    }
  }

  setRecordId(type: string, id: string, lid: string) {
    const internalModel = this.peek(type, id, lid);

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

    if (!IDENTIFIERS) {
      this.modelMapFor(internalModel.modelName).set(id, internalModel);
      this._newlyCreatedModelsFor(internalModel.modelName).remove(internalModel, lid);
    }

    const identifier = this.identifierCache.getOrCreateRecordIdentifier({ type: modelName, id, lid });

    if (identifier.id === null) {
      this.identifierCache.updateRecordIdentifier(identifier, { type: modelName, id });
    }

    internalModel.setId(id);
  }

  peekById(modelName: string, id: string): InternalModel | null {
    const identifier = this.identifierCache.peekRecordIdentifier({ type: modelName, id });

    let internalModel: InternalModel | null;

    if (IDENTIFIERS) {
      internalModel = identifier ? this.modelMapFor(modelName).get(identifier.lid) : null;
    } else {
      internalModel = this.modelMapFor(modelName).get(id);
    }

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

  build(modelName: string, id: string | null) {
    return this._build(modelName, id, null, true);
  }

  _build(type: string, id: string, lid: string | null | undefined, isCreate: false);
  _build(type: string, id: string | null, lid: null | undefined, isCreate: true);
  _build(type: string, id: string | null, lid: string | null | undefined, isCreate: boolean = false) {
    if (id) {
      let existingInternalModel = this.peekById(type, id);

      assert(
        `The id ${id} has already been used with another record for modelClass '${type}'.`,
        !existingInternalModel
      );
    }

    const { identifierCache } = this;
    let identifier: StableRecordIdentifier;

    if (isCreate === true) {
      identifier = identifierCache.createIdentifierForNewRecord({ type, id });
    } else {
      let resource: ResourceIdentifierObject = { type, id: id as string };
      if (lid) {
        resource.lid = lid;
      }

      identifier = identifierCache.getOrCreateRecordIdentifier(resource);
    }

    // lookupFactory should really return an object that creates
    // instances with the injections applied
    let internalModel = new InternalModel(this.store, identifier);

    if (IDENTIFIERS) {
      this.modelMapFor(type).add(internalModel, identifier.lid);
    } else {
      if (isCreate === true) {
        this._newlyCreatedModelsFor(identifier.type).add(internalModel, identifier.lid);
      }
      // TODO @runspired really?!
      this.modelMapFor(type).add(internalModel, identifier.id);
    }

    return internalModel;
  }

  remove(internalModel: InternalModel): void {
    let recordMap = this.modelMapFor(internalModel.modelName);
    let clientId = internalModel.identifier.lid;

    if (IDENTIFIERS) {
      recordMap.remove(internalModel, clientId);
    } else {
      if (internalModel.id) {
        recordMap.remove(internalModel, internalModel.id);
      }
      this._newlyCreatedModelsFor(internalModel.modelName).remove(internalModel, clientId);
    }

    const { identifier } = internalModel;
    this.identifierCache.forgetRecordIdentifier(identifier);
  }

  modelMapFor(modelName: string): InternalModelMap {
    return this._identityMap.retrieve(modelName);
  }

  _newlyCreatedModelsFor(modelName: string): InternalModelMap {
    return this._newlyCreated.retrieve(modelName);
  }

  clear(modelName?: string) {
    if (modelName === undefined) {
      this._identityMap.clear();
    } else {
      this.modelMapFor(modelName).clear();
    }
  }
}
