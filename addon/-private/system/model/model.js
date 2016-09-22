import Ember from 'ember';
import { assert, deprecate } from "ember-data/-private/debug";
import { PromiseObject } from "ember-data/-private/system/promise-proxies";
import Errors from "ember-data/-private/system/model/errors";
import DebuggerInfoMixin from 'ember-data/-private/system/debug/debug-info';
import { BelongsToMixin } from 'ember-data/-private/system/relationships/belongs-to';
import { HasManyMixin } from 'ember-data/-private/system/relationships/has-many';
import { DidDefinePropertyMixin, RelationshipsClassMethodsMixin, RelationshipsInstanceMethodsMixin } from 'ember-data/-private/system/relationships/ext';
import { AttrClassMethodsMixin, AttrInstanceMethodsMixin } from 'ember-data/-private/system/model/attr';
import isEnabled from 'ember-data/-private/features';

/**
  @module ember-data
*/

var get = Ember.get;

function intersection (array1, array2) {
  var result = [];
  array1.forEach((element) => {
    if (array2.indexOf(element) >= 0) {
      result.push(element);
    }
  });

  return result;
}

var RESERVED_MODEL_PROPS = [
  'currentState', 'data', 'store'
];

var retrieveFromCurrentState = Ember.computed('currentState', function(key) {
  return get(this._internalModel.currentState, key);
}).readOnly();

/**

  The model class that all Ember Data records descend from.
  This is the public API of Ember Data models. If you are using Ember Data
  in your application, this is the class you should use.
  If you are working on Ember Data internals, you most likely want to be dealing
  with `InternalModel`

  @class Model
  @namespace DS
  @extends Ember.Object
  @uses Ember.Evented
*/
var Model = Ember.Object.extend(Ember.Evented, {
  _internalModel: null,
  store: null,

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
    var record = store.createRecord('model');
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
    var record = store.createRecord('model');
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
  hasDirtyAttributes: Ember.computed('currentState.isDirty', function() {
    return this.get('currentState.isDirty');
  }),
  /**
    If this property is `true` the record is in the `saving` state. A
    record enters the saving state when `save` is called, but the
    adapter has not yet acknowledged that the changes have been
    persisted to the backend.

    Example

    ```javascript
    var record = store.createRecord('model');
    record.get('isSaving'); // false
    var promise = record.save();
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
    var record = store.createRecord('model');
    record.get('isDeleted');    // false
    record.deleteRecord();

    // Locally deleted
    record.get('isDeleted');           // true
    record.get('hasDirtyAttributes');  // true
    record.get('isSaving');            // false

    // Persisting the deletion
    var promise = record.save();
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
    var record = store.createRecord('model');
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
    var record = store.createRecord('model');
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
    If `true` the store is attempting to reload the record form the adapter.

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
    var record = store.createRecord('model');
    record.get('id'); // null

    store.findRecord('model', 1).then(function(model) {
      model.get('id'); // '1'
    });
    ```

    @property id
    @type {String}
  */
  id: null,

  /**
    @property currentState
    @private
    @type {Object}
  */

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
  errors: Ember.computed(function() {
    let errors = Errors.create();

    errors._registerHandlers(this._internalModel,
      function() {
        this.send('becameInvalid');
      },
      function() {
        this.send('becameValid');
      });
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
    return this.store.serialize(this, options);
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
    var serializer = this.store.serializerFor('-default');
    var snapshot = this._internalModel.createSnapshot();

    return serializer.serialize(snapshot, options);
  },

  /**
    Fired when the record is ready to be interacted with,
    that is either loaded from the server or created locally.

    @event ready
  */
  ready: Ember.K,

  /**
    Fired when the record is loaded from the server.

    @event didLoad
  */
  didLoad: Ember.K,

  /**
    Fired when the record is updated.

    @event didUpdate
  */
  didUpdate: Ember.K,

  /**
    Fired when a new record is commited to the server.

    @event didCreate
  */
  didCreate: Ember.K,

  /**
    Fired when the record is deleted.

    @event didDelete
  */
  didDelete: Ember.K,

  /**
    Fired when the record becomes invalid.

    @event becameInvalid
  */
  becameInvalid: Ember.K,

  /**
    Fired when the record enters the error state.

    @event becameError
  */
  becameError: Ember.K,

  /**
    Fired when the record is rolled back.

    @event rolledBack
  */
  rolledBack: Ember.K,

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
    after a delete it was made.

    Example

    ```app/routes/model/delete.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        softDelete: function() {
          this.controller.get('model').deleteRecord();
        },
        confirm: function() {
          this.controller.get('model').save();
        },
        undo: function() {
          this.controller.get('model').rollbackAttributes();
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
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        delete: function() {
          var controller = this.controller;
          controller.get('model').destroyRecord().then(function() {
            controller.transitionToRoute('model.index');
          });
        }
      }
    });
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to you adapter via the snapshot

    ```js
    record.destroyRecord({ adapterOptions: { subscribe: false } });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default MyCustomAdapter.extend({
      deleteRecord: function(store, type, snapshot) {
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
    @method unloadRecord
    @private
  */
  unloadRecord() {
    if (this.isDestroyed) { return; }
    this._internalModel.unloadRecord();
  },

  /**
    @method _notifyProperties
    @private
  */
  _notifyProperties(keys) {
    Ember.beginPropertyChanges();
    var key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      this.notifyPropertyChange(key);
    }
    Ember.endPropertyChanges();
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
      name: attr('string'),
      isAdmin: attr('boolean', {
        defaultValue: false
      })
    });
    ```

    ```javascript
    var mascot = store.createRecord('mascot');

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

  //TODO discuss with tomhuda about events/hooks
  //Bring back as hooks?
  /**
    @method adapterWillCommit
    @private
  adapterWillCommit: function() {
    this.send('willCommit');
  },

  /**
    @method adapterDidDirty
    @private
  adapterDidDirty: function() {
    this.send('becomeDirty');
    this.updateRecordArraysLater();
  },
  */

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
    return get(this, 'id');
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

   If you pass an object on the `adapterOptions` property of the options
   argument it will be passed to you adapter via the snapshot

    ```js
    record.save({ adapterOptions: { subscribe: false } });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default MyCustomAdapter.extend({
      updateRecord: function(store, type, snapshot) {
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
      promise: this._internalModel.save(options).then(() => this)
    });
  },

  /**
    Reload the record from the adapter.

    This will only work if the record has already finished loading.

    Example

    ```app/routes/model/view.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        reload: function() {
          this.controller.get('model').reload().then(function(model) {
            // do something with the reloaded model
          });
        }
      }
    });
    ```

    @method reload
    @return {Promise} a promise that will be resolved with the record when the
    adapter returns successfully or rejected if the adapter returns
    with an error.
  */
  reload() {
    return PromiseObject.create({
      promise: this._internalModel.reload().then(() => this)
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
    var length = arguments.length;
    var args = new Array(length - 1);

    for (var i = 1; i < length; i++) {
      args[i - 1] = arguments[i];
    }

    Ember.tryInvoke(this, name, args);
    this._super(...arguments);
  },

  willDestroy() {
    //TODO Move!
    this._super(...arguments);
    this._internalModel.clearRelationships();
    this._internalModel.recordObjectWillDestroy();
    //TODO should we set internalModel to null here?
  },

  // This is a temporary solution until we refactor DS.Model to not
  // rely on the data property.
  willMergeMixin(props) {
    var constructor = this.constructor;
    assert('`' + intersection(Object.keys(props), RESERVED_MODEL_PROPS)[0] + '` is a reserved property name on DS.Model objects. Please choose a different property name for ' + constructor.toString(), !intersection(Object.keys(props), RESERVED_MODEL_PROPS)[0]);
    assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + constructor.toString(), Object.keys(props).indexOf('id') === -1);
  },

  attr() {
    assert("The `attr` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
  },

  /**
    Get the reference for the specified belongsTo relationship.

    Example

    ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

    var blog = store.push({
      type: 'blog',
      id: 1,
      relationships: {
        user: { type: 'user', id: 1 }
      }
    });
    var userRef = blog.belongsTo('user');

    // check if the user relationship is loaded
    var isLoaded = userRef.value() !== null;

    // get the record of the reference (null if not yet available)
    var user = userRef.value();

    // get the identifier of the reference
    if (userRef.remoteType() === "id") {
      var id = userRef.id();
    } else if (userRef.remoteType() === "link") {
      var link = userRef.link();
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
  belongsTo: function(name) {
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

    var blog = store.push({
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
    });
    var commentsRef = blog.hasMany('comments');

    // check if the comments are loaded already
    var isLoaded = commentsRef.value() !== null;

    // get the records of the reference (null if not yet available)
    var comments = commentsRef.value();

    // get the identifier of the reference
    if (commentsRef.remoteType() === "ids") {
      var ids = commentsRef.ids();
    } else if (commentsRef.remoteType() === "link") {
      var link = commentsRef.link();
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
  hasMany: function(name) {
    return this._internalModel.referenceFor('hasMany', name);
  },

  setId: Ember.observer('id', function () {
    this._internalModel.setId(this.get('id'));
  })
});

/**
 @property data
 @private
 @type {Object}
 */
Object.defineProperty(Model.prototype, 'data', {
  get() {
    return this._internalModel._data;
  }
});

Model.reopenClass({
  /**
    Alias DS.Model's `create` method to `_create`. This allows us to create DS.Model
    instances from within the store, but if end users accidentally call `create()`
    (instead of `createRecord()`), we can raise an error.

    @method _create
    @private
    @static
  */
  _create: Model.create,

  /**
    Override the class' `create()` method to raise an error. This
    prevents end users from inadvertently calling `create()` instead
    of `createRecord()`. The store is still able to create instances
    by calling the `_create()` method. To create an instance of a
    `DS.Model` use [store.createRecord](DS.Store.html#method_createRecord).

    @method create
    @private
    @static
  */
  create() {
    throw new Ember.Error("You should not call `create` on a model. Instead, call `store.createRecord` with the attributes you would like to set.");
  },

  /**
   Represents the model's class name as a string. This can be used to look up the model through
   DS.Store's modelFor method.

   `modelName` is generated for you by Ember Data. It will be a lowercased, dasherized string.
   For example:

   ```javascript
   store.modelFor('post').modelName; // 'post'
   store.modelFor('blog-post').modelName; // 'blog-post'
   ```

   The most common place you'll want to access `modelName` is in your serializer's `payloadKeyFromModelName` method. For example, to change payload
   keys to underscore (instead of dasherized), you might use the following code:

   ```javascript
   export default var PostSerializer = DS.RESTSerializer.extend({
     payloadKeyFromModelName: function(modelName) {
       return Ember.String.underscore(modelName);
     }
   });
   ```
   @property modelName
   @type String
   @readonly
   @static
  */
  modelName: null
});

// if `Ember.setOwner` is defined, accessing `this.container` is
// deprecated (but functional). In "standard" Ember usage, this
// deprecation is actually created via an `.extend` of the factory
// inside the container itself, but that only happens on models
// with MODEL_FACTORY_INJECTIONS enabled :(
if (Ember.setOwner) {
  Object.defineProperty(Model.prototype, 'container', {
    configurable: true,
    enumerable: false,
    get() {
      deprecate('Using the injected `container` is deprecated. Please use the `getOwner` helper instead to access the owner of this object.',
                      false,
                      { id: 'ember-application.injected-container', until: '3.0.0' });

      return this.store.container;
    }
  });
}

if (isEnabled('ds-reset-attribute')) {
  Model.reopen({
    /**
      Discards any unsaved changes to the given attribute.

      Example

      ```javascript
      record.get('name'); // 'Untitled Document'
      record.set('name', 'Doc 1');
      record.get('name'); // 'Doc 1'
      record.resetAttribute('name');
      record.get('name'); // 'Untitled Document'
      ```

      @method resetAttribute
    */
    resetAttribute(attributeName) {
      if (attributeName in this._internalModel._attributes) {
        this.set(attributeName, this._internalModel.lastAcknowledgedValue(attributeName));
      }
    }
  });
}


Model.reopenClass(RelationshipsClassMethodsMixin);
Model.reopenClass(AttrClassMethodsMixin);

export default Model.extend(
  DebuggerInfoMixin,
  BelongsToMixin,
  DidDefinePropertyMixin,
  RelationshipsInstanceMethodsMixin,
  HasManyMixin,
  AttrInstanceMethodsMixin);
