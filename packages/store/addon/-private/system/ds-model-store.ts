import { getOwner, setOwner } from '@ember/application';
import { assert, deprecate } from '@ember/debug';
import EmberError from '@ember/error';
import { get } from '@ember/object';
import { isPresent } from '@ember/utils';
import { DEBUG } from '@glimmer/env';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import type DSModelClass from '@ember-data/model';

import type { DSModel } from '../ts-interfaces/ds-model';
import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
import type { RecordDataRecordWrapper } from '../ts-interfaces/record-data-record-wrapper';
import type { RelationshipsSchema } from '../ts-interfaces/record-data-schemas';
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
      if (!CUSTOM_MODEL_CLASS || !this.getSchemaDefinitionService().doesTypeExist(modelName)) {
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

    if (CUSTOM_MODEL_CLASS) {
      return this.getSchemaDefinitionService().doesTypeExist(modelName);
    } else {
      assert(`You need to pass a model name to the store's hasModelFor method`, isPresent(modelName));
      assert(
        `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
        typeof modelName === 'string'
      );
      let normalizedModelName = normalizeModelName(modelName);
      let factory = getModelFactory(this, this._modelFactoryCache, normalizedModelName);

      return factory !== null;
    }
  }

  _relationshipMetaFor(modelName: string, id: string | null, key: string) {
    if (CUSTOM_MODEL_CLASS) {
      return this._relationshipsDefinitionFor(modelName)[key];
    } else {
      let modelClass = this.modelFor(modelName);
      let relationshipsByName = get(modelClass, 'relationshipsByName');
      return relationshipsByName.get(key);
    }
  }

  _attributesDefinitionFor(modelName: string, identifier?: StableRecordIdentifier) {
    if (CUSTOM_MODEL_CLASS) {
      if (identifier) {
        return this.getSchemaDefinitionService().attributesDefinitionFor(identifier);
      } else {
        return this.getSchemaDefinitionService().attributesDefinitionFor(modelName);
      }
    } else {
      let attributes = this._attributesDefCache[modelName];

      if (attributes === undefined) {
        let modelClass = this.modelFor(modelName);
        let attributeMap = get(modelClass, 'attributes');

        attributes = Object.create(null);
        attributeMap.forEach((meta, name) => (attributes[name] = meta));
        this._attributesDefCache[modelName] = attributes;
      }

      return attributes;
    }
  }

  _relationshipsDefinitionFor(modelName: string, identifier?: StableRecordIdentifier): RelationshipsSchema {
    if (CUSTOM_MODEL_CLASS) {
      if (identifier) {
        return this.getSchemaDefinitionService().relationshipsDefinitionFor(identifier);
      } else {
        return this.getSchemaDefinitionService().relationshipsDefinitionFor(modelName);
      }
    } else {
      let relationships = this._relationshipsDefCache[modelName];

      if (relationships === undefined) {
        let modelClass = this.modelFor(modelName);
        relationships = get(modelClass, 'relationshipsObject') || null;
        this._relationshipsDefCache[modelName] = relationships;
      }

      return relationships;
    }
  }

  getSchemaDefinitionService(): SchemaDefinitionService {
    if (CUSTOM_MODEL_CLASS) {
      if (!this._schemaDefinitionService) {
        this._schemaDefinitionService = new DSModelSchemaDefinitionService(this);
      }
      return this._schemaDefinitionService;
    } else {
      throw 'schema service is only available when custom model class feature flag is on';
    }
  }
}

let assertDestroyingStore: Function;
let assertDestroyedStoreOnly: Function;

if (DEBUG) {
  assertDestroyingStore = function assertDestroyedStore(store, method) {
    if (!store.shouldAssertMethodCallsOnDestroyedStore) {
      deprecate(
        `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
        !(store.isDestroying || store.isDestroyed),
        {
          id: 'ember-data:method-calls-on-destroyed-store',
          until: '3.8',
          for: '@ember-data/store',
          since: {
            available: '3.8',
            enabled: '3.8',
          },
        }
      );
    } else {
      assert(
        `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
        !(store.isDestroying || store.isDestroyed)
      );
    }
  };
  assertDestroyedStoreOnly = function assertDestroyedStoreOnly(store, method) {
    if (!store.shouldAssertMethodCallsOnDestroyedStore) {
      deprecate(
        `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
        !store.isDestroyed,
        {
          id: 'ember-data:method-calls-on-destroyed-store',
          until: '3.8',
          for: '@ember-data/store',
          since: {
            available: '3.8',
            enabled: '3.8',
          },
        }
      );
    } else {
      assert(
        `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
        !store.isDestroyed
      );
    }
  };
}

export default Store;
