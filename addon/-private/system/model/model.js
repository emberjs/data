import { isNone } from '@ember/utils';
import EmberError from '@ember/error';
import Evented from '@ember/object/evented';
import EmberObject, { computed, get } from '@ember/object';
import { DEBUG } from '@glimmer/env';
import { assert, warn, deprecate } from '@ember/debug';
import { PromiseObject } from '../promise-proxies';
import Errors from '../model/errors';
import {
  relationshipsByNameDescriptor,
  relationshipsObjectDescriptor,
  relatedTypesDescriptor,
  relationshipsDescriptor,
} from '../relationships/ext';

import Ember from 'ember';
import InternalModel from './internal-model';
import RootState from './states';
const { changeProperties } = Ember;

/**
  @module ember-data
*/

function findPossibleInverses(type, inverseType, name, relationshipsSoFar) {
  let possibleRelationships = relationshipsSoFar || [];

  let relationshipMap = get(inverseType, 'relationships');
  if (!relationshipMap) {
    return possibleRelationships;
  }

  let relationshipsForType = relationshipMap.get(type.modelName);
  let relationships = Array.isArray(relationshipsForType)
    ? relationshipsForType.filter(relationship => {
        let optionsForRelationship = inverseType.metaForProperty(relationship.name).options;

        if (!optionsForRelationship.inverse && optionsForRelationship.inverse !== null) {
          return true;
        }

        return name === optionsForRelationship.inverse;
      })
    : null;

  if (relationships) {
    possibleRelationships.push.apply(possibleRelationships, relationships);
  }

  //Recurse to support polymorphism
  if (type.superclass) {
    findPossibleInverses(type.superclass, inverseType, name, possibleRelationships);
  }

  return possibleRelationships;
}

const retrieveFromCurrentState = computed('currentState', function(key) {
  return get(this._internalModel.currentState, key);
}).readOnly();

/**

  The model class that all Ember Data records descend from.
  This is the public API of Ember Data models. If you are using Ember Data
  in your application, this is the class you should use.

  @class Model
  @namespace DS
  @extends Ember.Object
  @uses Ember.Evented
*/
const Model = EmberObject.extend(Evented, {
  // until: "3.9" as we need to support 2.18
  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  },

  /**
    If this property is `true` the record is in the `empty`
    state. Empty is the first state all records enter after they have
    been created. Most records created by the store will quickly
    transition to the `loading` state if data needs to be fetched from
    the server or the `created` state if the record is created on the
    client. A record can also enter the empty state if the adapter is
    unable to locate the record.

    @property isEmpty
    @type {Boolean}
    @readOnly
  */
  isEmpty: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `loading` state. A
    record enters this state when the store asks the adapter for its
    data. It remains in this state until the adapter provides the
    requested data.

    @property isLoading
    @type {Boolean}
    @readOnly
  */
  isLoading: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `loaded` state. A
    record enters this state when its data is populated. Most of a
    record's lifecycle is spent inside substates of the `loaded`
    state.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.get('isLoaded'); // true

    store.findRecord('model', 1).then(function(model) {
      model.get('isLoaded'); // true
    });
    ```

    @property isLoaded
    @type {Boolean}
    @readOnly
  */
  isLoaded: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `dirty` state. The
    record has local changes that have not yet been saved by the
    adapter. This includes records that have been created (but not yet
    saved) or deleted.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.get('hasDirtyAttributes'); // true

    store.findRecord('model', 1).then(function(model) {
      model.get('hasDirtyAttributes'); // false
      model.set('foo', 'some value');
      model.get('hasDirtyAttributes'); // true
    });
    ```

    @since 1.13.0
    @property hasDirtyAttributes
    @type {Boolean}
    @readOnly
  */
  hasDirtyAttributes: computed('currentState.isDirty', function() {
    return this.get('currentState.isDirty');
  }),
  /**
    If this property is `true` the record is in the `saving` state. A
    record enters the saving state when `save` is called, but the
    adapter has not yet acknowledged that the changes have been
    persisted to the backend.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.get('isSaving'); // false
    let promise = record.save();
    record.get('isSaving'); // true
    promise.then(function() {
      record.get('isSaving'); // false
    });
    ```

    @property isSaving
    @type {Boolean}
    @readOnly
  */
  isSaving: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `deleted` state
    and has been marked for deletion. When `isDeleted` is true and
    `hasDirtyAttributes` is true, the record is deleted locally but the deletion
    was not yet persisted. When `isSaving` is true, the change is
    in-flight. When both `hasDirtyAttributes` and `isSaving` are false, the
    change has persisted.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.get('isDeleted');    // false
    record.deleteRecord();

    // Locally deleted
    record.get('isDeleted');           // true
    record.get('hasDirtyAttributes');  // true
    record.get('isSaving');            // false

    // Persisting the deletion
    let promise = record.save();
    record.get('isDeleted');    // true
    record.get('isSaving');     // true

    // Deletion Persisted
    promise.then(function() {
      record.get('isDeleted');          // true
      record.get('isSaving');           // false
      record.get('hasDirtyAttributes'); // false
    });
    ```

    @property isDeleted
    @type {Boolean}
    @readOnly
  */
  isDeleted: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `new` state. A
    record will be in the `new` state when it has been created on the
    client and the adapter has not yet report that it was successfully
    saved.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.get('isNew'); // true

    record.save().then(function(model) {
      model.get('isNew'); // false
    });
    ```

    @property isNew
    @type {Boolean}
    @readOnly
  */
  isNew: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `valid` state.

    A record will be in the `valid` state when the adapter did not report any
    server-side validation failures.

    @property isValid
    @type {Boolean}
    @readOnly
  */
  isValid: retrieveFromCurrentState,
  /**
    If the record is in the dirty state this property will report what
    kind of change has caused it to move into the dirty
    state. Possible values are:

    - `created` The record has been created by the client and not yet saved to the adapter.
    - `updated` The record has been updated by the client and not yet saved to the adapter.
    - `deleted` The record has been deleted by the client and not yet saved to the adapter.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.get('dirtyType'); // 'created'
    ```

    @property dirtyType
    @type {String}
    @readOnly
  */
  dirtyType: retrieveFromCurrentState,

  /**
    If `true` the adapter reported that it was unable to save local
    changes to the backend for any reason other than a server-side
    validation error.

    Example

    ```javascript
    record.get('isError'); // false
    record.set('foo', 'valid value');
    record.save().then(null, function() {
      record.get('isError'); // true
    });
    ```

    @property isError
    @type {Boolean}
    @readOnly
  */
  isError: false,

  /**
    If `true` the store is attempting to reload the record from the adapter.

    Example

    ```javascript
    record.get('isReloading'); // false
    record.reload();
    record.get('isReloading'); // true
    ```

    @property isReloading
    @type {Boolean}
    @readOnly
  */
  isReloading: false,

  /**
    All ember models have an id property. This is an identifier
    managed by an external source. These are always coerced to be
    strings before being used internally. Note when declaring the
    attributes for a model it is an error to declare an id
    attribute.

    ```javascript
    let record = store.createRecord('model');
    record.get('id'); // null

    store.findRecord('model', 1).then(function(model) {
      model.get('id'); // '1'
    });
    ```

    @property id
    @type {String}
  */

  /**
    @property currentState
    @private
    @type {Object}
  */
  currentState: RootState.empty, // defined here to avoid triggering setUnknownProperty

  /**
   @property _internalModel
   @private
   @type {Object}
   */
  _internalModel: null, // defined here to avoid triggering setUnknownProperty

  /**
   @property recordData
   @private
   @type undefined (reserved)
   */
  // will be defined here to avoid triggering setUnknownProperty

  /**
   @property store
   */
  store: null, // defined here to avoid triggering setUnknownProperty

  /**
    When the record is in the `invalid` state this object will contain
    any errors returned by the adapter. When present the errors hash
    contains keys corresponding to the invalid property names
    and values which are arrays of Javascript objects with two keys:

    - `message` A string containing the error message from the backend
    - `attribute` The name of the property associated with this error message

    ```javascript
    record.get('errors.length'); // 0
    record.set('foo', 'invalid value');
    record.save().catch(function() {
      record.get('errors').get('foo');
      // [{message: 'foo should be a number.', attribute: 'foo'}]
    });
    ```

    The `errors` property us useful for displaying error messages to
    the user.

    ```handlebars
    <label>Username: {{input value=username}} </label>
    {{#each model.errors.username as |error|}}
      <div class="error">
        {{error.message}}
      </div>
    {{/each}}
    <label>Email: {{input value=email}} </label>
    {{#each model.errors.email as |error|}}
      <div class="error">
        {{error.message}}
      </div>
    {{/each}}
    ```


    You can also access the special `messages` property on the error
    object to get an array of all the error strings.

    ```handlebars
    {{#each model.errors.messages as |message|}}
      <div class="error">
        {{message}}
      </div>
    {{/each}}
    ```

    @property errors
    @type {DS.Errors}
  */
  errors: computed(function() {
    let errors = Errors.create();

    errors._registerHandlers(
      this._internalModel,
      function() {
        this.send('becameInvalid');
      },
      function() {
        this.send('becameValid');
      }
    );
    return errors;
  }).readOnly(),

  /**
    This property holds the `DS.AdapterError` object with which
    last adapter operation was rejected.

    @property adapterError
    @type {DS.AdapterError}
  */
  adapterError: null,

  /**
    Create a JSON representation of the record, using the serialization
    strategy of the store's adapter.

   `serialize` takes an optional hash as a parameter, currently
    supported options are:

   - `includeId`: `true` if the record's ID should be included in the
      JSON representation.

    @method serialize
    @param {Object} options
    @return {Object} an object whose values are primitive JSON values only
  */
  serialize(options) {
    return this._internalModel.createSnapshot().serialize(options);
  },

  /**
    Use [DS.JSONSerializer](DS.JSONSerializer.html) to
    get the JSON representation of a record.

    `toJSON` takes an optional hash as a parameter, currently
    supported options are:

    - `includeId`: `true` if the record's ID should be included in the
      JSON representation.

    @method toJSON
    @param {Object} options
    @return {Object} A JSON representation of the object.
  */
  toJSON(options) {
    // container is for lazy transform lookups
    let serializer = this._internalModel.store.serializerFor('-default');
    let snapshot = this._internalModel.createSnapshot();

    return serializer.serialize(snapshot, options);
  },

  /**
    Fired when the record is ready to be interacted with,
    that is either loaded from the server or created locally.

    @event ready
  */
  ready: null,

  /**
    Fired when the record is loaded from the server.

    @event didLoad
  */
  didLoad: null,

  /**
    Fired when the record is updated.

    @event didUpdate
  */
  didUpdate: null,

  /**
    Fired when a new record is commited to the server.

    @event didCreate
  */
  didCreate: null,

  /**
    Fired when the record is deleted.

    @event didDelete
  */
  didDelete: null,

  /**
    Fired when the record becomes invalid.

    @event becameInvalid
  */
  becameInvalid: null,

  /**
    Fired when the record enters the error state.

    @event becameError
  */
  becameError: null,

  /**
    Fired when the record is rolled back.

    @event rolledBack
  */
  rolledBack: null,

  //TODO Do we want to deprecate these?
  /**
    @method send
    @private
    @param {String} name
    @param {Object} context
  */
  send(name, context) {
    return this._internalModel.send(name, context);
  },

  /**
    @method transitionTo
    @private
    @param {String} name
  */
  transitionTo(name) {
    return this._internalModel.transitionTo(name);
  },

  /**
    Marks the record as deleted but does not save it. You must call
    `save` afterwards if you want to persist it. You might use this
    method if you want to allow the user to still `rollbackAttributes()`
    after a delete was made.

    Example

    ```app/routes/model/delete.js
    import Route from '@ember/routing/route';

    export default Route.extend({
      actions: {
        softDelete() {
          this.get('controller.model').deleteRecord();
        },
        confirm() {
          this.get('controller.model').save();
        },
        undo() {
          this.get('controller.model').rollbackAttributes();
        }
      }
    });
    ```

    @method deleteRecord
  */
  deleteRecord() {
    this._internalModel.deleteRecord();
  },

  /**
    Same as `deleteRecord`, but saves the record immediately.

    Example

    ```app/routes/model/delete.js
    import Route from '@ember/routing/route';

    export default Route.extend({
      actions: {
        delete() {
          this.get('controller.model').destroyRecord().then(function() {
            controller.transitionToRoute('model.index');
          });
        }
      }
    });
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to your adapter via the snapshot

    ```js
    record.destroyRecord({ adapterOptions: { subscribe: false } });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default MyCustomAdapter.extend({
      deleteRecord(store, type, snapshot) {
        if (snapshot.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    });
    ```

    @method destroyRecord
    @param {Object} options
    @return {Promise} a promise that will be resolved when the adapter returns
    successfully or rejected if the adapter returns with an error.
  */
  destroyRecord(options) {
    this.deleteRecord();
    return this.save(options);
  },

  /**
    Unloads the record from the store. This will cause the record to be destroyed and freed up for garbage collection.

    @method unloadRecord
  */
  unloadRecord() {
    if (this.isDestroyed) {
      return;
    }
    this._internalModel.unloadRecord();
  },

  /**
    @method _notifyProperties
    @private
  */
  _notifyProperties(keys) {
    // changeProperties defers notifications until after the delegate
    // and protects with a try...finally block
    // previously used begin...endPropertyChanges but this is private API
    changeProperties(() => {
      let key;
      for (let i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        this.notifyPropertyChange(key);
      }
    });
  },

  /**
    Returns an object, whose keys are changed properties, and value is
    an [oldProp, newProp] array.

    The array represents the diff of the canonical state with the local state
    of the model. Note: if the model is created locally, the canonical state is
    empty since the adapter hasn't acknowledged the attributes yet:

    Example

    ```app/models/mascot.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      name: DS.attr('string'),
      isAdmin: DS.attr('boolean', {
        defaultValue: false
      })
    });
    ```

    ```javascript
    let mascot = store.createRecord('mascot');

    mascot.changedAttributes(); // {}

    mascot.set('name', 'Tomster');
    mascot.changedAttributes(); // { name: [undefined, 'Tomster'] }

    mascot.set('isAdmin', true);
    mascot.changedAttributes(); // { isAdmin: [undefined, true], name: [undefined, 'Tomster'] }

    mascot.save().then(function() {
      mascot.changedAttributes(); // {}

      mascot.set('isAdmin', false);
      mascot.changedAttributes(); // { isAdmin: [true, false] }
    });
    ```

    @method changedAttributes
    @return {Object} an object, whose keys are changed properties,
      and value is an [oldProp, newProp] array.
  */
  changedAttributes() {
    return this._internalModel.changedAttributes();
  },

  /**
    If the model `hasDirtyAttributes` this function will discard any unsaved
    changes. If the model `isNew` it will be removed from the store.

    Example

    ```javascript
    record.get('name'); // 'Untitled Document'
    record.set('name', 'Doc 1');
    record.get('name'); // 'Doc 1'
    record.rollbackAttributes();
    record.get('name'); // 'Untitled Document'
    ```

    @since 1.13.0
    @method rollbackAttributes
  */
  rollbackAttributes() {
    this._internalModel.rollbackAttributes();
  },

  /*
    @method _createSnapshot
    @private
  */
  _createSnapshot() {
    return this._internalModel.createSnapshot();
  },

  toStringExtension() {
    // the _internalModel guard exists, because some dev-only deprecation code
    // (addListener via validatePropertyInjections) invokes toString before the
    // object is real.
    return this._internalModel && this._internalModel.id;
  },

  /**
    Save the record and persist any changes to the record to an
    external source via the adapter.

    Example

    ```javascript
    record.set('name', 'Tomster');
    record.save().then(function() {
      // Success callback
    }, function() {
      // Error callback
    });
    ```

   If you pass an object using the `adapterOptions` property of the options
   argument it will be passed to your adapter via the snapshot.

    ```js
    record.save({ adapterOptions: { subscribe: false } });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default MyCustomAdapter.extend({
      updateRecord(store, type, snapshot) {
        if (snapshot.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    });
    ```

    @method save
    @param {Object} options
    @return {Promise} a promise that will be resolved when the adapter returns
    successfully or rejected if the adapter returns with an error.
  */
  save(options) {
    return PromiseObject.create({
      promise: this._internalModel.save(options).then(() => this),
    });
  },

  /**
    Reload the record from the adapter.

    This will only work if the record has already finished loading.

    Example

    ```app/routes/model/view.js
    import Route from '@ember/routing/route';

    export default Route.extend({
      actions: {
        reload() {
          this.controller.get('model').reload().then(function(model) {
            // do something with the reloaded model
          });
        }
      }
    });
    ```

    @method reload
    @param {Object} options optional, may include `adapterOptions` hash which will be passed to adapter request

   @return {Promise} a promise that will be resolved with the record when the
    adapter returns successfully or rejected if the adapter returns
    with an error.
  */
  reload(options) {
    let wrappedAdapterOptions;

    if (typeof options === 'object' && options !== null && options.adapterOptions) {
      wrappedAdapterOptions = {
        adapterOptions: options.adapterOptions,
      };
    }

    return PromiseObject.create({
      promise: this._internalModel.reload(wrappedAdapterOptions).then(() => this),
    });
  },

  /**
    Override the default event firing from Ember.Evented to
    also call methods with the given name.

    @method trigger
    @private
    @param {String} name
  */
  trigger(name) {
    let fn = this[name];

    if (typeof fn === 'function') {
      let length = arguments.length;
      let args = new Array(length - 1);

      for (let i = 1; i < length; i++) {
        args[i - 1] = arguments[i];
      }
      fn.apply(this, args);
    }

    this._super(...arguments);
  },

  attr() {
    assert(
      'The `attr` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?',
      false
    );
  },

  /**
    Get the reference for the specified belongsTo relationship.

    Example

    ```app/models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });
    ```

    ```javascript
    let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            data: { type: 'user', id: 1 }
          }
        }
      }
    });
    let userRef = blog.belongsTo('user');

    // check if the user relationship is loaded
    let isLoaded = userRef.value() !== null;

    // get the record of the reference (null if not yet available)
    let user = userRef.value();

    // get the identifier of the reference
    if (userRef.remoteType() === "id") {
      let id = userRef.id();
    } else if (userRef.remoteType() === "link") {
      let link = userRef.link();
    }

    // load user (via store.findRecord or store.findBelongsTo)
    userRef.load().then(...)

    // or trigger a reload
    userRef.reload().then(...)

    // provide data for reference
    userRef.push({
      type: 'user',
      id: 1,
      attributes: {
        username: "@user"
      }
    }).then(function(user) {
      userRef.value() === user;
    });
    ```

    @method belongsTo
    @param {String} name of the relationship
    @since 2.5.0
    @return {BelongsToReference} reference for this relationship
  */
  belongsTo(name) {
    return this._internalModel.referenceFor('belongsTo', name);
  },

  /**
    Get the reference for the specified hasMany relationship.

    Example

    ```javascript
    // models/blog.js
    export default DS.Model.extend({
      comments: DS.hasMany({ async: true })
    });

    let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: 1 },
              { type: 'comment', id: 2 }
            ]
          }
        }
      }
    });
    let commentsRef = blog.hasMany('comments');

    // check if the comments are loaded already
    let isLoaded = commentsRef.value() !== null;

    // get the records of the reference (null if not yet available)
    let comments = commentsRef.value();

    // get the identifier of the reference
    if (commentsRef.remoteType() === "ids") {
      let ids = commentsRef.ids();
    } else if (commentsRef.remoteType() === "link") {
      let link = commentsRef.link();
    }

    // load comments (via store.findMany or store.findHasMany)
    commentsRef.load().then(...)

    // or trigger a reload
    commentsRef.reload().then(...)

    // provide data for reference
    commentsRef.push([{ type: 'comment', id: 1 }, { type: 'comment', id: 2 }]).then(function(comments) {
      commentsRef.value() === comments;
    });
    ```

    @method hasMany
    @param {String} name of the relationship
    @since 2.5.0
    @return {HasManyReference} reference for this relationship
  */
  hasMany(name) {
    return this._internalModel.referenceFor('hasMany', name);
  },

  /**
   Provides info about the model for debugging purposes
   by grouping the properties into more semantic groups.

   Meant to be used by debugging tools such as the Chrome Ember Extension.

   - Groups all attributes in "Attributes" group.
   - Groups all belongsTo relationships in "Belongs To" group.
   - Groups all hasMany relationships in "Has Many" group.
   - Groups all flags in "Flags" group.
   - Flags relationship CPs as expensive properties.

   @method _debugInfo
   @for DS.Model
   @private
   */
  _debugInfo() {
    let attributes = ['id'];
    let relationships = {};
    let expensiveProperties = [];

    this.eachAttribute((name, meta) => attributes.push(name));

    let groups = [
      {
        name: 'Attributes',
        properties: attributes,
        expand: true,
      },
    ];

    this.eachRelationship((name, relationship) => {
      let properties = relationships[relationship.kind];

      if (properties === undefined) {
        properties = relationships[relationship.kind] = [];
        groups.push({
          name: relationship.name,
          properties,
          expand: true,
        });
      }
      properties.push(name);
      expensiveProperties.push(name);
    });

    groups.push({
      name: 'Flags',
      properties: [
        'isLoaded',
        'hasDirtyAttributes',
        'isSaving',
        'isDeleted',
        'isError',
        'isNew',
        'isValid',
      ],
    });

    return {
      propertyInfo: {
        // include all other mixins / properties (not just the grouped ones)
        includeOtherProperties: true,
        groups: groups,
        // don't pre-calculate unless cached
        expensiveProperties: expensiveProperties,
      },
    };
  },

  notifyBelongsToChange(key) {
    this.notifyPropertyChange(key);
  },
  /**
   Given a callback, iterates over each of the relationships in the model,
   invoking the callback with the name of each relationship and its relationship
   descriptor.


   The callback method you provide should have the following signature (all
   parameters are optional):

   ```javascript
   function(name, descriptor);
   ```

   - `name` the name of the current property in the iteration
   - `descriptor` the meta object that describes this relationship

   The relationship descriptor argument is an object with the following properties.

   - **key** <span class="type">String</span> the name of this relationship on the Model
   - **kind** <span class="type">String</span> "hasMany" or "belongsTo"
   - **options** <span class="type">Object</span> the original options hash passed when the relationship was declared
   - **parentType** <span class="type">DS.Model</span> the type of the Model that owns this relationship
   - **type** <span class="type">String</span> the type name of the related Model

   Note that in addition to a callback, you can also pass an optional target
   object that will be set as `this` on the context.

   Example

   ```app/serializers/application.js
   import DS from 'ember-data';

   export default DS.JSONSerializer.extend({
    serialize: function(record, options) {
      let json = {};

      record.eachRelationship(function(name, descriptor) {
        if (descriptor.kind === 'hasMany') {
          let serializedHasManyName = name.toUpperCase() + '_IDS';
          json[serializedHasManyName] = record.get(name).mapBy('id');
        }
      });

      return json;
    }
  });
   ```

   @method eachRelationship
   @param {Function} callback the callback to invoke
   @param {any} binding the value to which the callback's `this` should be bound
   */
  eachRelationship(callback, binding) {
    this.constructor.eachRelationship(callback, binding);
  },

  relationshipFor(name) {
    return get(this.constructor, 'relationshipsByName').get(name);
  },

  inverseFor(key) {
    return this.constructor.inverseFor(key, this._internalModel.store);
  },

  notifyHasManyAdded(key) {
    //We need to notifyPropertyChange in the adding case because we need to make sure
    //we fetch the newly added record in case it is unloaded
    //TODO(Igor): Consider whether we could do this only if the record state is unloaded
    this.notifyPropertyChange(key);
  },

  eachAttribute(callback, binding) {
    this.constructor.eachAttribute(callback, binding);
  },
});

/**
 @property data
 @private
 @deprecated
 @type {Object}
 */
Object.defineProperty(Model.prototype, 'data', {
  configurable: false,
  get() {
    deprecate(
      `Model.data was private and it's use has been deprecated. For public access, use the RecordData API or iterate attributes`,
      false,
      {
        id: 'ember-data:Model.data',
        until: '3.9',
      }
    );
    return this._internalModel._recordData._data;
  },
});

const ID_DESCRIPTOR = {
  configurable: false,
  set(id) {
    this._internalModel.setId(id);
  },

  get() {
    // the _internalModel guard exists, because some dev-only deprecation code
    // (addListener via validatePropertyInjections) invokes toString before the
    // object is real.
    return this._internalModel && this._internalModel.id;
  },
};

Object.defineProperty(Model.prototype, 'id', ID_DESCRIPTOR);

if (DEBUG) {
  let lookupDescriptor = function lookupDescriptor(obj, keyName) {
    let current = obj;
    do {
      let descriptor = Object.getOwnPropertyDescriptor(current, keyName);
      if (descriptor !== undefined) {
        return descriptor;
      }
      current = Object.getPrototypeOf(current);
    } while (current !== null);
    return null;
  };
  let isBasicDesc = function isBasicDesc(desc) {
    return (
      !desc ||
      (!desc.get &&
        !desc.set &&
        desc.enumerable === true &&
        desc.writable === true &&
        desc.configurable === true)
    );
  };
  let isDefaultEmptyDescriptor = function isDefaultEmptyDescriptor(obj, keyName) {
    let instanceDesc = lookupDescriptor(obj, keyName);
    return isBasicDesc(instanceDesc) && lookupDescriptor(obj.constructor, keyName) === null;
  };

  Model.reopen({
    init() {
      this._super(...arguments);

      if (!this._internalModel) {
        throw new EmberError(
          'You should not call `create` on a model. Instead, call `store.createRecord` with the attributes you would like to set.'
        );
      }

      if (
        !isDefaultEmptyDescriptor(this, '_internalModel') ||
        !(this._internalModel instanceof InternalModel)
      ) {
        throw new Error(
          `'_internalModel' is a reserved property name on instances of classes extending Model. Please choose a different property name for ${this.constructor.toString()}`
        );
      }

      if (
        !isDefaultEmptyDescriptor(this, 'recordData') ||
        this.recordData !== undefined ||
        this.recordData !== this._internalModel.recordData
      ) {
        throw new Error(
          `'recordData' is a reserved property name on instances of classes extending Model. Please choose a different property name for ${this.constructor.toString()}`
        );
      }

      if (
        !isDefaultEmptyDescriptor(this, 'currentState') ||
        this.get('currentState') !== this._internalModel.currentState
      ) {
        throw new Error(
          `'currentState' is a reserved property name on instances of classes extending Model. Please choose a different property name for ${this.constructor.toString()}`
        );
      }

      let idDesc = lookupDescriptor(this, 'id');

      if (idDesc.get !== ID_DESCRIPTOR.get) {
        throw new EmberError(
          `You may not set 'id' as an attribute on your model. Please remove any lines that look like: \`id: DS.attr('<type>')\` from ${this.constructor.toString()}`
        );
      }
    },
  });
}

Model.reopenClass({
  isModel: true,

  /**
    Create should only ever be called by the store. To create an instance of a
    `DS.Model` in a dirty state use `store.createRecord`.

   To create instances of `DS.Model` in a clean state, use `store.push`

    @method create
    @private
    @static
  */

  /**
   Represents the model's class name as a string. This can be used to look up the model's class name through
   `DS.Store`'s modelFor method.

   `modelName` is generated for you by Ember Data. It will be a lowercased, dasherized string.
   For example:

   ```javascript
   store.modelFor('post').modelName; // 'post'
   store.modelFor('blog-post').modelName; // 'blog-post'
   ```

   The most common place you'll want to access `modelName` is in your serializer's `payloadKeyFromModelName` method. For example, to change payload
   keys to underscore (instead of dasherized), you might use the following code:

   ```javascript
   import { underscore } from '@ember/string';

   export default const PostSerializer = DS.RESTSerializer.extend({
     payloadKeyFromModelName(modelName) {
       return underscore(modelName);
     }
   });
   ```
   @property modelName
   @type String
   @readonly
   @static
  */
  modelName: null,

  /*
   These class methods below provide relationship
   introspection abilities about relationships.

   A note about the computed properties contained here:

   **These properties are effectively sealed once called for the first time.**
   To avoid repeatedly doing expensive iteration over a model's fields, these
   values are computed once and then cached for the remainder of the runtime of
   your application.

   If your application needs to modify a class after its initial definition
   (for example, using `reopen()` to add additional attributes), make sure you
   do it before using your model with the store, which uses these properties
   extensively.
   */

  /**
   For a given relationship name, returns the model type of the relationship.

   For example, if you define a model like this:

   ```app/models/post.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      comments: DS.hasMany('comment')
    });
   ```

   Calling `store.modelFor('post').typeForRelationship('comments', store)` will return `Comment`.

   @method typeForRelationship
   @static
   @param {String} name the name of the relationship
   @param {store} store an instance of DS.Store
   @return {DS.Model} the type of the relationship, or undefined
   */
  typeForRelationship(name, store) {
    let relationship = get(this, 'relationshipsByName').get(name);
    return relationship && store.modelFor(relationship.type);
  },

  inverseMap: computed(function() {
    return Object.create(null);
  }),

  /**
   Find the relationship which is the inverse of the one asked for.

   For example, if you define models like this:

   ```app/models/post.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      comments: DS.hasMany('message')
    });
   ```

   ```app/models/message.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      owner: DS.belongsTo('post')
    });
   ```

   ``` js
   store.modelFor('post').inverseFor('comments', store) // { type: App.Message, name: 'owner', kind: 'belongsTo' }
   store.modelFor('message').inverseFor('owner', store) // { type: App.Post, name: 'comments', kind: 'hasMany' }
   ```

   @method inverseFor
   @static
   @param {String} name the name of the relationship
   @param {DS.Store} store
   @return {Object} the inverse relationship, or null
   */
  inverseFor(name, store) {
    let inverseMap = get(this, 'inverseMap');
    if (inverseMap[name]) {
      return inverseMap[name];
    } else {
      let inverse = this._findInverseFor(name, store);
      inverseMap[name] = inverse;
      return inverse;
    }
  },

  //Calculate the inverse, ignoring the cache
  _findInverseFor(name, store) {
    let inverseType = this.typeForRelationship(name, store);
    if (!inverseType) {
      return null;
    }

    let propertyMeta = this.metaForProperty(name);
    //If inverse is manually specified to be null, like  `comments: DS.hasMany('message', { inverse: null })`
    let options = propertyMeta.options;
    if (options.inverse === null) {
      return null;
    }

    let inverseName, inverseKind, inverse, inverseOptions;

    //If inverse is specified manually, return the inverse
    if (options.inverse) {
      inverseName = options.inverse;
      inverse = get(inverseType, 'relationshipsByName').get(inverseName);

      assert(
        "We found no inverse relationships by the name of '" +
          inverseName +
          "' on the '" +
          inverseType.modelName +
          "' model. This is most likely due to a missing attribute on your model definition.",
        !isNone(inverse)
      );

      // TODO probably just return the whole inverse here
      inverseKind = inverse.kind;
      inverseOptions = inverse.options;
    } else {
      //No inverse was specified manually, we need to use a heuristic to guess one
      if (propertyMeta.type === propertyMeta.parentModelName) {
        warn(
          `Detected a reflexive relationship by the name of '${name}' without an inverse option. Look at https://guides.emberjs.com/current/models/relationships/#toc_reflexive-relations for how to explicitly specify inverses.`,
          false,
          {
            id: 'ds.model.reflexive-relationship-without-inverse',
          }
        );
      }

      let possibleRelationships = findPossibleInverses(this, inverseType, name);

      if (possibleRelationships.length === 0) {
        return null;
      }

      let filteredRelationships = possibleRelationships.filter(possibleRelationship => {
        let optionsForRelationship = inverseType.metaForProperty(possibleRelationship.name).options;
        return name === optionsForRelationship.inverse;
      });

      assert(
        "You defined the '" +
          name +
          "' relationship on " +
          this +
          ', but you defined the inverse relationships of type ' +
          inverseType.toString() +
          ' multiple times. Look at https://guides.emberjs.com/current/models/relationships/#toc_explicit-inverses for how to explicitly specify inverses',
        filteredRelationships.length < 2
      );

      if (filteredRelationships.length === 1) {
        possibleRelationships = filteredRelationships;
      }

      assert(
        "You defined the '" +
          name +
          "' relationship on " +
          this +
          ', but multiple possible inverse relationships of type ' +
          this +
          ' were found on ' +
          inverseType +
          '. Look at https://guides.emberjs.com/current/models/relationships/#toc_explicit-inverses for how to explicitly specify inverses',
        possibleRelationships.length === 1
      );

      inverseName = possibleRelationships[0].name;
      inverseKind = possibleRelationships[0].kind;
      inverseOptions = possibleRelationships[0].options;
    }

    assert(
      `The ${
        inverseType.modelName
      }:${inverseName} relationship declares 'inverse: null', but it was resolved as the inverse for ${
        this.modelName
      }:${name}.`,
      !inverseOptions || inverseOptions.inverse !== null
    );

    return {
      type: inverseType,
      name: inverseName,
      kind: inverseKind,
      options: inverseOptions,
    };
  },

  /**
   The model's relationships as a map, keyed on the type of the
   relationship. The value of each entry is an array containing a descriptor
   for each relationship with that type, describing the name of the relationship
   as well as the type.

   For example, given the following model definition:

   ```app/models/blog.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      users: DS.hasMany('user'),
      owner: DS.belongsTo('user'),
      posts: DS.hasMany('post')
    });
   ```

   This computed property would return a map describing these
   relationships, like this:

   ```javascript
   import Ember from 'ember';
   import Blog from 'app/models/blog';
   import User from 'app/models/user';
   import Post from 'app/models/post';

   let relationships = Ember.get(Blog, 'relationships');
   relationships.get(User);
   //=> [ { name: 'users', kind: 'hasMany' },
   //     { name: 'owner', kind: 'belongsTo' } ]
   relationships.get(Post);
   //=> [ { name: 'posts', kind: 'hasMany' } ]
   ```

   @property relationships
   @static
   @type Map
   @readOnly
   */

  relationships: relationshipsDescriptor,

  /**
   A hash containing lists of the model's relationships, grouped
   by the relationship kind. For example, given a model with this
   definition:

   ```app/models/blog.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      users: DS.hasMany('user'),
      owner: DS.belongsTo('user'),

      posts: DS.hasMany('post')
    });
   ```

   This property would contain the following:

   ```javascript
   import Ember from 'ember';
   import Blog from 'app/models/blog';

   let relationshipNames = Ember.get(Blog, 'relationshipNames');
   relationshipNames.hasMany;
   //=> ['users', 'posts']
   relationshipNames.belongsTo;
   //=> ['owner']
   ```

   @property relationshipNames
   @static
   @type Object
   @readOnly
   */
  relationshipNames: computed(function() {
    let names = {
      hasMany: [],
      belongsTo: [],
    };

    this.eachComputedProperty((name, meta) => {
      if (meta.isRelationship) {
        names[meta.kind].push(name);
      }
    });

    return names;
  }),

  /**
   An array of types directly related to a model. Each type will be
   included once, regardless of the number of relationships it has with
   the model.

   For example, given a model with this definition:

   ```app/models/blog.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      users: DS.hasMany('user'),
      owner: DS.belongsTo('user'),

      posts: DS.hasMany('post')
    });
   ```

   This property would contain the following:

   ```javascript
   import Ember from 'ember';
   import Blog from 'app/models/blog';

   let relatedTypes = Ember.get(Blog, 'relatedTypes');
   //=> [ User, Post ]
   ```

   @property relatedTypes
   @static
   @type Ember.Array
   @readOnly
   */
  relatedTypes: relatedTypesDescriptor,

  /**
   A map whose keys are the relationships of a model and whose values are
   relationship descriptors.

   For example, given a model with this
   definition:

   ```app/models/blog.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      users: DS.hasMany('user'),
      owner: DS.belongsTo('user'),

      posts: DS.hasMany('post')
    });
   ```

   This property would contain the following:

   ```javascript
   import Ember from 'ember';
   import Blog from 'app/models/blog';

   let relationshipsByName = Ember.get(Blog, 'relationshipsByName');
   relationshipsByName.get('users');
   //=> { key: 'users', kind: 'hasMany', type: 'user', options: Object, isRelationship: true }
   relationshipsByName.get('owner');
   //=> { key: 'owner', kind: 'belongsTo', type: 'user', options: Object, isRelationship: true }
   ```

   @property relationshipsByName
   @static
   @type Map
   @readOnly
   */
  relationshipsByName: relationshipsByNameDescriptor,

  relationshipsObject: relationshipsObjectDescriptor,

  /**
   A map whose keys are the fields of the model and whose values are strings
   describing the kind of the field. A model's fields are the union of all of its
   attributes and relationships.

   For example:

   ```app/models/blog.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      users: DS.hasMany('user'),
      owner: DS.belongsTo('user'),

      posts: DS.hasMany('post'),

      title: DS.attr('string')
    });
   ```

   ```js
   import Ember from 'ember';
   import Blog from 'app/models/blog';

   let fields = Ember.get(Blog, 'fields');
   fields.forEach(function(kind, field) {
      console.log(field, kind);
    });

   // prints:
   // users, hasMany
   // owner, belongsTo
   // posts, hasMany
   // title, attribute
   ```

   @property fields
   @static
   @type Map
   @readOnly
   */
  fields: computed(function() {
    let map = new Map();

    this.eachComputedProperty((name, meta) => {
      if (meta.isRelationship) {
        map.set(name, meta.kind);
      } else if (meta.isAttribute) {
        map.set(name, 'attribute');
      }
    });

    return map;
  }).readOnly(),

  /**
   Given a callback, iterates over each of the relationships in the model,
   invoking the callback with the name of each relationship and its relationship
   descriptor.

   @method eachRelationship
   @static
   @param {Function} callback the callback to invoke
   @param {any} binding the value to which the callback's `this` should be bound
   */
  eachRelationship(callback, binding) {
    get(this, 'relationshipsByName').forEach((relationship, name) => {
      callback.call(binding, name, relationship);
    });
  },

  /**
   Given a callback, iterates over each of the types related to a model,
   invoking the callback with the related type's class. Each type will be
   returned just once, regardless of how many different relationships it has
   with a model.

   @method eachRelatedType
   @static
   @param {Function} callback the callback to invoke
   @param {any} binding the value to which the callback's `this` should be bound
   */
  eachRelatedType(callback, binding) {
    let relationshipTypes = get(this, 'relatedTypes');

    for (let i = 0; i < relationshipTypes.length; i++) {
      let type = relationshipTypes[i];
      callback.call(binding, type);
    }
  },

  determineRelationshipType(knownSide, store) {
    let knownKey = knownSide.key;
    let knownKind = knownSide.kind;
    let inverse = this.inverseFor(knownKey, store);
    // let key;
    let otherKind;

    if (!inverse) {
      return knownKind === 'belongsTo' ? 'oneToNone' : 'manyToNone';
    }

    // key = inverse.name;
    otherKind = inverse.kind;

    if (otherKind === 'belongsTo') {
      return knownKind === 'belongsTo' ? 'oneToOne' : 'manyToOne';
    } else {
      return knownKind === 'belongsTo' ? 'oneToMany' : 'manyToMany';
    }
  },

  /**
   A map whose keys are the attributes of the model (properties
   described by DS.attr) and whose values are the meta object for the
   property.

   Example

   ```app/models/person.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
      birthday: DS.attr('date')
    });
   ```

   ```javascript
   import Ember from 'ember';
   import Person from 'app/models/person';

   let attributes = Ember.get(Person, 'attributes')

   attributes.forEach(function(meta, name) {
      console.log(name, meta);
    });

   // prints:
   // firstName {type: "string", isAttribute: true, options: Object, parentType: function, name: "firstName"}
   // lastName {type: "string", isAttribute: true, options: Object, parentType: function, name: "lastName"}
   // birthday {type: "date", isAttribute: true, options: Object, parentType: function, name: "birthday"}
   ```

   @property attributes
   @static
   @type {Map}
   @readOnly
   */
  attributes: computed(function() {
    let map = new Map();

    this.eachComputedProperty((name, meta) => {
      if (meta.isAttribute) {
        assert(
          "You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " +
            this.toString(),
          name !== 'id'
        );

        meta.name = name;
        map.set(name, meta);
      }
    });

    return map;
  }).readOnly(),

  /**
   A map whose keys are the attributes of the model (properties
   described by DS.attr) and whose values are type of transformation
   applied to each attribute. This map does not include any
   attributes that do not have an transformation type.

   Example

   ```app/models/person.js
   import DS from 'ember-data';

   export default DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr('string'),
      birthday: DS.attr('date')
    });
   ```

   ```javascript
   import Ember from 'ember';
   import Person from 'app/models/person';

   let transformedAttributes = Ember.get(Person, 'transformedAttributes')

   transformedAttributes.forEach(function(field, type) {
      console.log(field, type);
    });

   // prints:
   // lastName string
   // birthday date
   ```

   @property transformedAttributes
   @static
   @type {Map}
   @readOnly
   */
  transformedAttributes: computed(function() {
    let map = new Map();

    this.eachAttribute((key, meta) => {
      if (meta.type) {
        map.set(key, meta.type);
      }
    });

    return map;
  }).readOnly(),

  /**
   Iterates through the attributes of the model, calling the passed function on each
   attribute.

   The callback method you provide should have the following signature (all
   parameters are optional):

   ```javascript
   function(name, meta);
   ```

   - `name` the name of the current property in the iteration
   - `meta` the meta object for the attribute property in the iteration

   Note that in addition to a callback, you can also pass an optional target
   object that will be set as `this` on the context.

   Example

   ```javascript
   import DS from 'ember-data';

   let Person = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
      birthday: DS.attr('date')
    });

   Person.eachAttribute(function(name, meta) {
      console.log(name, meta);
    });

   // prints:
   // firstName {type: "string", isAttribute: true, options: Object, parentType: function, name: "firstName"}
   // lastName {type: "string", isAttribute: true, options: Object, parentType: function, name: "lastName"}
   // birthday {type: "date", isAttribute: true, options: Object, parentType: function, name: "birthday"}
   ```

   @method eachAttribute
   @param {Function} callback The callback to execute
   @param {Object} [binding] the value to which the callback's `this` should be bound
   @static
   */
  eachAttribute(callback, binding) {
    get(this, 'attributes').forEach((meta, name) => {
      callback.call(binding, name, meta);
    });
  },

  /**
   Iterates through the transformedAttributes of the model, calling
   the passed function on each attribute. Note the callback will not be
   called for any attributes that do not have an transformation type.

   The callback method you provide should have the following signature (all
   parameters are optional):

   ```javascript
   function(name, type);
   ```

   - `name` the name of the current property in the iteration
   - `type` a string containing the name of the type of transformed
   applied to the attribute

   Note that in addition to a callback, you can also pass an optional target
   object that will be set as `this` on the context.

   Example

   ```javascript
   import DS from 'ember-data';

   let Person = DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr('string'),
      birthday: DS.attr('date')
    });

   Person.eachTransformedAttribute(function(name, type) {
      console.log(name, type);
    });

   // prints:
   // lastName string
   // birthday date
   ```

   @method eachTransformedAttribute
   @param {Function} callback The callback to execute
   @param {Object} [binding] the value to which the callback's `this` should be bound
   @static
   */
  eachTransformedAttribute(callback, binding) {
    get(this, 'transformedAttributes').forEach((type, name) => {
      callback.call(binding, name, type);
    });
  },

  /**
   Returns the name of the model class.

   @method toString
   @static
   */
  toString() {
    return `model:${get(this, 'modelName')}`;
  },
});

export default Model;
