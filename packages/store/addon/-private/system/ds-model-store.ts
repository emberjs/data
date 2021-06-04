import { getOwner, setOwner } from '@ember/application';
import { assert, deprecate } from '@ember/debug';
import EmberError from '@ember/error';
import { get } from '@ember/object';
import { assign } from '@ember/polyfills';
import { isPresent } from '@ember/utils';
import { DEBUG } from '@glimmer/env';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';

import CoreStore from './core-store';
import { getShimClass } from './model/shim-model-class';
import normalizeModelName from './normalize-model-name';
import { DSModelSchemaDefinitionService, getModelFactory } from './schema-definition-service';

type ModelRegistry = import('../ts-interfaces/registries').ModelRegistry;

type RelationshipsSchema = import('../ts-interfaces/record-data-schemas').RelationshipsSchema;
type SchemaDefinitionService = import('../ts-interfaces/schema-definition-service').SchemaDefinitionService;
type RecordDataRecordWrapper = import('../ts-interfaces/record-data-record-wrapper').RecordDataRecordWrapper;
type StableRecordIdentifier = import('../ts-interfaces/identifier').StableRecordIdentifier;
type NotificationManager = import('./record-notification-manager').default;
type DSModel = import('../ts-interfaces/ds-model').DSModel;
type ShimModelClass = import('./model/shim-model-class').default;
type DSModelClass = import('@ember-data/model').default;

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
      container: null,
    };
    assign(createOptions, createRecordArgs);

    // ensure that `getOwner(this)` works inside a model instance
    setOwner(createOptions, getOwner(this));

    delete createOptions.container;
    let record = this._modelFactoryFor(modelName).create(createOptions);
    return record;
  }

  teardownRecord(record: DSModel) {
    record.destroy();
  }

  modelFor(type: keyof ModelRegistry): ShimModelClass | DSModelClass {
    if (DEBUG) {
      assertDestroyedStoreOnly(this, 'modelFor');
    }
    assert(`You need to pass a model name to the store's modelFor method`, isPresent(type));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
      typeof type === 'string'
    );

    let maybeFactory = this._modelFactoryFor(type);

    // for factorFor factory/class split
    let klass = maybeFactory && maybeFactory.class ? maybeFactory.class : maybeFactory;
    if (!klass || !klass.isModel) {
      if (!CUSTOM_MODEL_CLASS || !this.getSchemaDefinitionService().doesTypeExist(type)) {
        throw new EmberError(`No model was found for '${type}' and no schema handles the type`);
      }
      return getShimClass(this, type);
    } else {
      return klass;
    }
  }

  _modelFactoryFor(type: keyof ModelRegistry): DSModelClass {
    if (DEBUG) {
      assertDestroyedStoreOnly(this, '_modelFactoryFor');
    }
    assert(`You need to pass a model name to the store's _modelFactoryFor method`, isPresent(type));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
      typeof type === 'string'
    );
    let normalizedModelName = normalizeModelName(type);
    let factory = getModelFactory(this, this._modelFactoryCache, normalizedModelName);

    return factory;
  }

  _hasModelFor(type: string): type is keyof ModelRegistry {
    if (DEBUG) {
      assertDestroyingStore(this, '_hasModelFor');
    }
    assert(`You need to pass a model name to the store's hasModelFor method`, isPresent(type));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
      typeof type === 'string'
    );

    if (CUSTOM_MODEL_CLASS) {
      return this.getSchemaDefinitionService().doesTypeExist(type);
    } else {
      assert(`You need to pass a model name to the store's hasModelFor method`, isPresent(type));
      assert(
        `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
        typeof type === 'string'
      );
      let normalizedModelName = normalizeModelName(type);
      let factory = getModelFactory(this, this._modelFactoryCache, normalizedModelName);

      return factory !== null;
    }
  }

  _relationshipMetaFor(type: keyof ModelRegistry, id: string | null, key: string) {
    if (CUSTOM_MODEL_CLASS) {
      return this._relationshipsDefinitionFor(type)[key];
    } else {
      let modelClass = this.modelFor(type);
      let relationshipsByName = get(modelClass, 'relationshipsByName');
      return relationshipsByName.get(key);
    }
  }

  _attributesDefinitionFor(type: keyof ModelRegistry, identifier?: StableRecordIdentifier) {
    if (CUSTOM_MODEL_CLASS) {
      if (identifier) {
        return this.getSchemaDefinitionService().attributesDefinitionFor(identifier);
      } else {
        return this.getSchemaDefinitionService().attributesDefinitionFor(type);
      }
    } else {
      let attributes = this._attributesDefCache[type];

      if (attributes === undefined) {
        let modelClass = this.modelFor(type);
        let attributeMap = get(modelClass, 'attributes');

        attributes = Object.create(null);
        attributeMap.forEach((meta, name) => (attributes[name] = meta));
        this._attributesDefCache[type] = attributes;
      }

      return attributes;
    }
  }

  _relationshipsDefinitionFor(type: keyof ModelRegistry, identifier?: StableRecordIdentifier): RelationshipsSchema {
    if (CUSTOM_MODEL_CLASS) {
      if (identifier) {
        return this.getSchemaDefinitionService().relationshipsDefinitionFor(identifier);
      } else {
        return this.getSchemaDefinitionService().relationshipsDefinitionFor(type);
      }
    } else {
      let relationships = this._relationshipsDefCache[type];

      if (relationships === undefined) {
        let modelClass = this.modelFor(type);
        relationships = get(modelClass, 'relationshipsObject') || null;
        this._relationshipsDefCache[type] = relationships;
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
