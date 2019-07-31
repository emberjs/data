import coerceId from '../coerce-id';
import { assert, warn } from '@ember/debug';
import InternalModel from '../model/internal-model';
import Store from '../store';
import IdentityMap from '../identity-map';
import InternalModelMap from '../internal-model-map';
import { isNone } from '@ember/utils';
import { JsonApiResourceIdentity } from '../../ts-interfaces/record-data-json-api';

/**
  @module @ember-data/store
*/

const FactoryCache = new WeakMap<object, InternalModelFactory>();

let globalClientIdCounter = 1;

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

  constructor(public store: Store) {
    this._identityMap = new IdentityMap();
    // To keep track of clientIds for newly created records
    this._newlyCreated = new IdentityMap();
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
  lookup(modelName: string, id: string | null, clientId?: string | null): InternalModel {
    let trueId = id === null ? null : coerceId(id);
    let internalModel = this.peekId(modelName, trueId, clientId);

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

    return this.build(modelName, trueId, null, clientId);
  }

  /**
   * Peek the InternalModel for a given { type, id, lid }.
   *
   * If an InternalModel does not exist, return `null`.
   *
   * @internal
   */
  peekId(modelName: string, id: string | null, clientId?: string | null): InternalModel | null {
    let internalModel: InternalModel | null = null;

    if (clientId) {
      internalModel = this._newlyCreatedModelsFor(modelName).get(clientId);
    }

    if (!internalModel && id) {
      internalModel = this.modelMapFor(modelName).get(id);
    }

    return internalModel;
  }

  getByResource(resource: JsonApiResourceIdentity): InternalModel {
    let internalModel: InternalModel | null = null;

    if (resource.clientId) {
      internalModel = this._newlyCreatedModelsFor(resource.type).get(resource.clientId);
    }

    if (internalModel === null) {
      internalModel = this.lookup(resource.type, resource.id, resource.clientId);
    }

    return internalModel;
  }

  setRecordId(type: string, id: string, lid: string) {
    const internalModel = this.peekId(type, id, lid);

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
    assert(
      `'${modelName}:${oldId}' was saved to the server, but the response returned the new id '${id}'. The store cannot assign a new id to a record that already has an id.`,
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

    let existingInternalModel = this.peekIdOnly(modelName, id);

    assert(
      `'${modelName}' was saved to the server, but the response returned the new id '${id}', which has already been used with another record.'`,
      isNone(existingInternalModel) || existingInternalModel === internalModel
    );

    this.modelMapFor(internalModel.modelName).set(id, internalModel);
    this._newlyCreatedModelsFor(internalModel.modelName).remove(internalModel, lid);

    internalModel.setId(id);
  }

  peekIdOnly(modelName: string, id: string): InternalModel | null {
    let internalModel: InternalModel | null = this.modelMapFor(modelName).get(id);

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

  build(modelName: string, id: string | null, data?: any, clientId?: string | null) {
    if (id) {
      let existingInternalModel = this.peekIdOnly(modelName, id);

      assert(
        `The id ${id} has already been used with another record for modelClass '${modelName}'.`,
        !existingInternalModel
      );
    }

    if (id === null && !clientId) {
      clientId = `client-id:${this.newClientId()}`;
    }

    // lookupFactory should really return an object that creates
    // instances with the injections applied
    let internalModel = new InternalModel(modelName, id, this.store, clientId);
    if (clientId) {
      this._newlyCreatedModelsFor(modelName).add(internalModel, clientId);
    }

    this.modelMapFor(modelName).add(internalModel, id);

    return internalModel;
  }

  newClientId() {
    return globalClientIdCounter++;
  }

  remove(internalModel: InternalModel): void {
    let recordMap = this.modelMapFor(internalModel.modelName);
    let id = internalModel.id;
    let clientId = internalModel.clientId;

    if (id) {
      recordMap.remove(internalModel, id);
    }

    if (clientId) {
      this._newlyCreatedModelsFor(internalModel.modelName).remove(internalModel, clientId);
    }
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
