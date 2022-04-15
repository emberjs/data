import { getOwner, setOwner } from '@ember/application';
import { assert } from '@ember/debug';
import EmberError from '@ember/error';
import { isPresent } from '@ember/utils';
import { DEBUG } from '@glimmer/env';

import type DSModelClass from '@ember-data/model';

import type { DSModel } from '../ts-interfaces/ds-model';
import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
import type { RecordDataRecordWrapper } from '../ts-interfaces/record-data-record-wrapper';
import type { SchemaDefinitionService } from '../ts-interfaces/schema-definition-service';
import CoreStore from './core-store';
import type ShimModelClass from './model/shim-model-class';
import { getShimClass } from './model/shim-model-class';
import normalizeModelName from './normalize-model-name';
import type NotificationManager from './record-notification-manager';
import { DSModelSchemaDefinitionService, getModelFactory } from './schema-definition-service';

class Store extends CoreStore {
  public _modelFactoryCache = Object.create(null);
  private _relationshipsDefCache = Object.create(null);
  private _attributesDefCache = Object.create(null);

  instantiateRecord(
    identifier: StableRecordIdentifier,
    createRecordArgs: { [key: string]: any },
    recordDataFor: (identifier: StableRecordIdentifier) => RecordDataRecordWrapper,
    notificationManager: NotificationManager
  ): DSModel {
    let modelName = identifier.type;

    let internalModel = this._internalModelForResource(identifier);
    let createOptions: any = {
      store: this,
      _internalModel: internalModel,
      // TODO deprecate allowing unknown args setting
      _createProps: createRecordArgs,
      container: null,
    };

    // ensure that `getOwner(this)` works inside a model instance
    setOwner(createOptions, getOwner(this));

    delete createOptions.container;
    let record = this._modelFactoryFor(modelName).create(createOptions);
    return record;
  }

  teardownRecord(record: DSModel) {
    record.destroy();
  }

  modelFor(modelName: string): ShimModelClass | DSModelClass {
    if (DEBUG) {
      assertDestroyedStoreOnly(this, 'modelFor');
    }
    assert(`You need to pass a model name to the store's modelFor method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    let maybeFactory = this._modelFactoryFor(modelName);

    // for factorFor factory/class split
    let klass = maybeFactory && maybeFactory.class ? maybeFactory.class : maybeFactory;
    if (!klass || !klass.isModel) {
      if (!this.getSchemaDefinitionService().doesTypeExist(modelName)) {
        throw new EmberError(`No model was found for '${modelName}' and no schema handles the type`);
      }
      return getShimClass(this, modelName);
    } else {
      return klass;
    }
  }

  _modelFactoryFor(modelName: string): DSModelClass {
    if (DEBUG) {
      assertDestroyedStoreOnly(this, '_modelFactoryFor');
    }
    assert(`You need to pass a model name to the store's _modelFactoryFor method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);
    let factory = getModelFactory(this, this._modelFactoryCache, normalizedModelName);

    return factory;
  }

  _hasModelFor(modelName) {
    if (DEBUG) {
      assertDestroyingStore(this, '_hasModelFor');
    }
    assert(`You need to pass a model name to the store's hasModelFor method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    return this.getSchemaDefinitionService().doesTypeExist(modelName);
  }

  _relationshipMetaFor(modelName: string, id: string | null, key: string) {
    return this._relationshipsDefinitionFor({ type: modelName })[key];
  }

  getSchemaDefinitionService(): SchemaDefinitionService {
    if (!this._schemaDefinitionService) {
      this._schemaDefinitionService = new DSModelSchemaDefinitionService(this);
    }
    return this._schemaDefinitionService;
  }
}

let assertDestroyingStore: Function;
let assertDestroyedStoreOnly: Function;

if (DEBUG) {
  assertDestroyingStore = function assertDestroyedStore(store, method) {
    assert(
      `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
      !(store.isDestroying || store.isDestroyed)
    );
  };
  assertDestroyedStoreOnly = function assertDestroyedStoreOnly(store, method) {
    assert(
      `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
      !store.isDestroyed
    );
  };
}

export default Store;
