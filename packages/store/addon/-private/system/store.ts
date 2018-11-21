/**
  @module ember-data
*/
import CoreStore from './core-store';
import { assert, deprecate, warn, inspect } from '@ember/debug';
import normalizeModelName from './normalize-model-name';
import RecordDataDefault from './model/record-data';
import { DEBUG } from '@glimmer/env';
import { typeOf, isPresent, isNone } from '@ember/utils';
import EmberError from '@ember/error';
import { set, get, computed } from '@ember/object';
import { getOwner } from '@ember/application';
import Model from './model/model';
import ShimModelClass from './model/shim-model-class';
// Implementors Note:
//
//   The variables in this file are consistently named according to the following
//   scheme:
//
//   * +id+ means an identifier managed by an external source, provided inside
//     the data provided by that source. These are always coerced to be strings
//     before being used internally.
//   * +clientId+ means a transient numerical identifier generated at runtime by
//     the data store. It is important primarily because newly created objects may
//     not yet have an externally generated id.
//   * +internalModel+ means a record internalModel object, which holds metadata about a
//     record, even if it has not yet been fully materialized.
//   * +type+ means a DS.Model.

/**
  The store contains all of the data for records loaded from the server.
  It is also responsible for creating instances of `DS.Model` that wrap
  the individual data for a record, so that they can be bound to in your
  Handlebars templates.

  Define your application's store like this:

  ```app/services/store.js
  import DS from 'ember-data';

  export default DS.Store.extend({
  });
  ```

  Most Ember.js applications will only have a single `DS.Store` that is
  automatically created by their `Ember.Application`.

  You can retrieve models from the store in several ways. To retrieve a record
  for a specific id, use `DS.Store`'s `findRecord()` method:

  ```javascript
  store.findRecord('person', 123).then(function (person) {
  });
  ```

  By default, the store will talk to your backend using a standard
  REST mechanism. You can customize how the store talks to your
  backend by specifying a custom adapter:

  ```app/adapters/application.js
  import DS from 'ember-data';

  export default DS.Adapter.extend({
  });
  ```

  You can learn more about writing a custom adapter by reading the `DS.Adapter`
  documentation.

  ### Store createRecord() vs. push() vs. pushPayload()

  The store provides multiple ways to create new record objects. They have
  some subtle differences in their use which are detailed below:

  [createRecord](#method_createRecord) is used for creating new
  records on the client side. This will return a new record in the
  `created.uncommitted` state. In order to persist this record to the
  backend, you will need to call `record.save()`.

  [push](#method_push) is used to notify Ember Data's store of new or
  updated records that exist in the backend. This will return a record
  in the `loaded.saved` state. The primary use-case for `store#push` is
  to notify Ember Data about record updates (full or partial) that happen
  outside of the normal adapter methods (for example
  [SSE](http://dev.w3.org/html5/eventsource/) or [Web
  Sockets](http://www.w3.org/TR/2009/WD-websockets-20091222/)).

  [pushPayload](#method_pushPayload) is a convenience wrapper for
  `store#push` that will deserialize payloads if the
  Serializer implements a `pushPayload` method.

  Note: When creating a new record using any of the above methods
  Ember Data will update `DS.RecordArray`s such as those returned by
  `store#peekAll()` or `store#findAll()`. This means any
  data bindings or computed properties that depend on the RecordArray
  will automatically be synced to include the new or updated record
  values.

  @class Store
  @namespace DS
  @extends Ember.Service
*/
const Store = CoreStore.extend({
  /**
    @method init
    @private
  */
  init() {
    this._super(...arguments);
  },

  instantiateRecord(modelName, createOptions) {
    delete createOptions.container;
    return this._modelFactoryFor(modelName).create(createOptions);
  },

  /**
  Returns the model class for the particular `modelName`.

  The class of a model might be useful if you want to get a list of all the
  relationship names of the model, see
  [`relationshipNames`](https://emberjs.com/api/data/classes/DS.Model.html#property_relationshipNames)
  for example.

  @method modelFor
  @param {String} modelName
  @return {DS.Model}
    */
  modelFor(modelName) {
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
    let klass = maybeFactory.class ? maybeFactory.class : maybeFactory;
    if (!klass.isModel) {
      return new ShimModelClass(this, modelName);
    } else {
      return klass;
    }
  },

  _modelFactoryFor(modelName) {
    if (DEBUG) {
      assertDestroyedStoreOnly(this, '_modelFactoryFor');
    }
    assert(
      `You need to pass a model name to the store's _modelFactoryFor method`,
      isPresent(modelName)
    );
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);
    let factory = getModelFactory(this, this._modelFactoryCache, normalizedModelName);

    if (factory === null) {
      throw new EmberError(`No model was found for '${normalizedModelName}'`);
    }

    return factory;
  },

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
    // TODO NOW
    // remove 
    // return true;
    if (DEBUG) {
      assertDestroyingStore(this, '_hasModelFor');
    }
    assert(`You need to pass a model name to the store's hasModelFor method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);
    let factory = getModelFactory(this, this._modelFactoryCache, normalizedModelName);

    return factory !== null;
  },

  _relationshipMetaFor(modelName, id, key) {
    let modelClass = this.modelFor(modelName);
    let relationshipsByName = get(modelClass, 'relationshipsByName');
    return relationshipsByName.get(key);
  },

  _attributesDefinitionFor(modelName) {
    let attributes = this._attributesDefCache[modelName];

    if (attributes === undefined) {
      let modelClass = this.modelFor(modelName);
      let attributeMap = get(modelClass, 'attributes');

      attributes = Object.create(null);
      attributeMap.forEach((meta, name) => (attributes[name] = meta));
      this._attributesDefCache[modelName] = attributes;
    }

    return attributes;
  },

  _relationshipsDefinitionFor(modelName) {
    let relationships = this._relationshipsDefCache[modelName];

    if (relationships === undefined) {
      let modelClass = this.modelFor(modelName);
      relationships = get(modelClass, 'relationshipsObject') || null;
      this._relationshipsDefCache[modelName] = relationships;
    }

    return relationships;
  },

  _createRecordData(modelName, id, clientId, internalModel) {
    return this.createRecordDataFor(modelName, id, clientId, this.storeWrapper);
  },

  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    return new RecordDataDefault(modelName, id, clientId, storeWrapper, this);
  }
});


/**
 *
 * @param store
 * @param cache modelFactoryCache
 * @param normalizedModelName already normalized modelName
 * @return {*}
 */
function getModelFactory(store, cache, normalizedModelName) {
  let factory = cache[normalizedModelName];

  if (!factory) {
    factory = _lookupModelFactory(store, normalizedModelName);

    if (!factory) {
      //Support looking up mixins as base types for polymorphic relationships
      factory = _modelForMixin(store, normalizedModelName);
    }

    if (!factory) {
      // we don't cache misses in case someone wants to register a missing model
      return null;
    }

    let klass = factory.class;
    // assert(`'${inspect(klass)}' does not appear to be an ember-data model`, klass.isModel);

    // TODO: deprecate this
    if (klass.isModel) {
      let hasOwnModelNameSet = klass.modelName && klass.hasOwnProperty('modelName');
      if (!hasOwnModelNameSet) {
        klass.modelName = normalizedModelName;
      }
    }

    cache[normalizedModelName] = factory;
  }

  return factory;
}

function _lookupModelFactory(store, normalizedModelName) {
  let owner = getOwner(store);

  return owner.factoryFor(`model:${normalizedModelName}`);
}

/*
  In case someone defined a relationship to a mixin, for example:
  ```
    let Comment = DS.Model.extend({
      owner: belongsTo('commentable'. { polymorphic: true })
    });
    let Commentable = Ember.Mixin.create({
      comments: hasMany('comment')
    });
  ```
  we want to look up a Commentable class which has all the necessary
  relationship metadata. Thus, we look up the mixin and create a mock
  DS.Model, so we can access the relationship CPs of the mixin (`comments`)
  in this case
*/
function _modelForMixin(store, normalizedModelName) {
  let owner = getOwner(store);
  let MaybeMixin = owner.factoryFor(`mixin:${normalizedModelName}`);
  let mixin = MaybeMixin && MaybeMixin.class;

  if (mixin) {
    let ModelForMixin = Model.extend(mixin);
    ModelForMixin.reopenClass({
      __isMixin: true,
      __mixin: mixin,
    });

    //Cache the class as a model
    owner.register('model:' + normalizedModelName, ModelForMixin);
  }

  return _lookupModelFactory(store, normalizedModelName);
}

let assertDestroyingStore;
let assertDestroyedStoreOnly;

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
