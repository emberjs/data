/**
  @module @ember-data/store
*/
import { getOwner, setOwner } from '@ember/application';
import { deprecate } from '@ember/application/deprecations';
import { assert } from '@ember/debug';
import EmberError from '@ember/error';
import { get } from '@ember/object';
import { assign } from '@ember/polyfills';
import { isPresent } from '@ember/utils';
import { DEBUG } from '@glimmer/env';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';

import CoreStore from './core-store';
import notifyChanges from './model/notify-changes';
import { getShimClass } from './model/shim-model-class';
import normalizeModelName from './normalize-model-name';
import { DSModelSchemaDefinitionService, getModelFactory } from './schema-definition-service';

type RelationshipsSchema = import('../ts-interfaces/record-data-schemas').RelationshipsSchema;
type SchemaDefinitionService = import('../ts-interfaces/schema-definition-service').SchemaDefinitionService;
type RecordDataRecordWrapper = import('../ts-interfaces/record-data-record-wrapper').RecordDataRecordWrapper;
type StableRecordIdentifier = import('../ts-interfaces/identifier').StableRecordIdentifier;
type NotificationManager = import('./record-notification-manager').default;
type DSModel = import('../ts-interfaces/ds-model').DSModel;
type ShimModelClass = import('./model/shim-model-class').default;
type DSModelClass = import('@ember-data/model').default;

/**
  The store service contains all of the data for records loaded from the server.
  It is also responsible for creating instances of `Model` that wrap
  the individual data for a record, so that they can be bound to in your
  Handlebars templates.

  By default, applications will have a single `Store` service that is
  automatically created.

  The store can be customized by extending the service in the following manner:

  ```app/services/store.js
  import Store from '@ember-data/store';

  export default class MyStore extends Store {}
  ```

  You can retrieve models from the store in several ways. To retrieve a record
  for a specific id, use the `Store`'s `findRecord()` method:

  ```javascript
  store.findRecord('person', 123).then(function (person) {
  });
  ```

  By default, the store will talk to your backend using a standard
  REST mechanism. You can customize how the store talks to your
  backend by specifying a custom adapter:

  ```app/adapters/application.js
  import DS from 'ember-data';

  export default Adapter.extend({
  });
  ```

  You can learn more about writing a custom adapter by reading the `Adapter`
  documentation.

  ### Store createRecord() vs. push() vs. pushPayload()

  The store provides multiple ways to create new record objects. They have
  some subtle differences in their use which are detailed below:

  [createRecord](Store/methods/createRecord?anchor=createRecord) is used for creating new
  records on the client side. This will return a new record in the
  `created.uncommitted` state. In order to persist this record to the
  backend, you will need to call `record.save()`.

  [push](Store/methods/push?anchor=push) is used to notify Ember Data's store of new or
  updated records that exist in the backend. This will return a record
  in the `loaded.saved` state. The primary use-case for `store#push` is
  to notify Ember Data about record updates (full or partial) that happen
  outside of the normal adapter methods (for example
  [SSE](http://dev.w3.org/html5/eventsource/) or [Web
  Sockets](http://www.w3.org/TR/2009/WD-websockets-20091222/)).

  [pushPayload](Store/methods/pushPayload?anchor=pushPayload) is a convenience wrapper for
  `store#push` that will deserialize payloads if the
  Serializer implements a `pushPayload` method.

  Note: When creating a new record using any of the above methods
  Ember Data will update `RecordArray`s such as those returned by
  `store#peekAll()` or `store#findAll()`. This means any
  data bindings or computed properties that depend on the RecordArray
  will automatically be synced to include the new or updated record
  values.

  @class Store
  @main @ember-data/store
  @extends Ember.Service
*/

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
      currentState: internalModel.currentState,
      container: null,
    };
    assign(createOptions, createRecordArgs);

    // ensure that `getOwner(this)` works inside a model instance
    setOwner(createOptions, getOwner(this));

    delete createOptions.container;
    let record = this._modelFactoryFor(modelName).create(createOptions);
    //todo optimize
    notificationManager.subscribe(identifier, (identifier, value) => notifyChanges(identifier, value, record, this));
    return record;
  }

  teardownRecord(record: DSModel) {
    record.destroy();
  }

  /**
  Returns the model class for the particular `modelName`.

  The class of a model might be useful if you want to get a list of all the
  relationship names of the model, see
  [`relationshipNames`](/ember-data/release/classes/Model?anchor=relationshipNames)
  for example.

  @method modelFor
  @param {String} modelName
  @return {Model}
    */
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

  /*
  Returns whether a ModelClass exists for a given modelName
  This exists for legacy support for the RESTSerializer,
  which due to how it must guess whether a key is a model
  must query for whether a match exists.

  We should investigate an RFC to make this public or removing
  this requirement.

  @private
 */
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
