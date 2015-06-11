import { PromiseObject } from "ember-data/system/promise-proxies";

/**
  @module ember-data
*/

var get = Ember.get;
var intersection = Ember.EnumerableUtils.intersection;
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
  _recordArrays: undefined,
  _relationships: undefined,
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

    store.find('model', 1).then(function(model) {
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
    record.get('isDirty'); // true

    store.find('model', 1).then(function(model) {
      model.get('isDirty'); // false
      model.set('foo', 'some value');
      model.get('isDirty'); // true
    });
    ```

    @property isDirty
    @type {Boolean}
    @readOnly
  */
  isDirty: retrieveFromCurrentState,
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
    `isDirty` is true, the record is deleted locally but the deletion
    was not yet persisted. When `isSaving` is true, the change is
    in-flight. When both `isDirty` and `isSaving` are false, the
    change has persisted.

    Example

    ```javascript
    var record = store.createRecord('model');
    record.get('isDeleted');    // false
    record.deleteRecord();

    // Locally deleted
    record.get('isDeleted');    // true
    record.get('isDirty');      // true
    record.get('isSaving');     // false

    // Persisting the deletion
    var promise = record.save();
    record.get('isDeleted');    // true
    record.get('isSaving');     // true

    // Deletion Persisted
    promise.then(function() {
      record.get('isDeleted');  // true
      record.get('isSaving');   // false
      record.get('isDirty');    // false
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

    store.find('model', 1).then(function(model) {
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
    return this._internalModel.getErrors();
  }).readOnly(),

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
  serialize: function(options) {
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
  toJSON: function(options) {
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

  /**
    @property data
    @private
    @type {Object}
  */
  data: Ember.computed.readOnly('_internalModel._data'),

  //TODO Do we want to deprecate these?
  /**
    @method send
    @private
    @param {String} name
    @param {Object} context
  */
  send: function(name, context) {
    return this._internalModel.send(name, context);
  },

  /**
    @method transitionTo
    @private
    @param {String} name
  */
  transitionTo: function(name) {
    return this._internalModel.transitionTo(name);
  },


  /**
    Marks the record as deleted but does not save it. You must call
    `save` afterwards if you want to persist it. You might use this
    method if you want to allow the user to still `rollback()` a
    delete after it was made.

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
          this.controller.get('model').rollback();
        }
      }
    });
    ```

    @method deleteRecord
  */
  deleteRecord: function() {
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

    @method destroyRecord
    @return {Promise} a promise that will be resolved when the adapter returns
    successfully or rejected if the adapter returns with an error.
  */
  destroyRecord: function() {
    this.deleteRecord();
    return this.save();
  },

  /**
    @method unloadRecord
    @private
  */
  unloadRecord: function() {
    if (this.isDestroyed) { return; }
    this._internalModel.unloadRecord();
  },

  /**
    @method _notifyProperties
    @private
  */
  _notifyProperties: function(keys) {
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

    Example

    ```app/models/mascot.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      name: attr('string')
    });
    ```

    ```javascript
    var mascot = store.createRecord('mascot');
    mascot.changedAttributes(); // {}
    mascot.set('name', 'Tomster');
    mascot.changedAttributes(); // {name: [undefined, 'Tomster']}
    ```

    @method changedAttributes
    @return {Object} an object, whose keys are changed properties,
      and value is an [oldProp, newProp] array.
  */
  changedAttributes: function() {
    var oldData = get(this._internalModel, '_data');
    var newData = get(this._internalModel, '_attributes');
    var diffData = Ember.create(null);
    var prop;

    for (prop in newData) {
      diffData[prop] = [oldData[prop], newData[prop]];
    }

    return diffData;
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
    If the model `isDirty` this function will discard any unsaved
    changes. If the model `isNew` it will be removed from the store.

    Example

    ```javascript
    record.get('name'); // 'Untitled Document'
    record.set('name', 'Doc 1');
    record.get('name'); // 'Doc 1'
    record.rollback();
    record.get('name'); // 'Untitled Document'
    ```

    @method rollback
  */
  rollback: function() {
    this._internalModel.rollback();
  },

  /*
    @method _createSnapshot
    @private
  */
  _createSnapshot: function() {
    return this._internalModel.createSnapshot();
  },

  toStringExtension: function() {
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
    @method save
    @return {Promise} a promise that will be resolved when the adapter returns
    successfully or rejected if the adapter returns with an error.
  */
  save: function() {
    var model = this;
    return PromiseObject.create({
      promise: this._internalModel.save().then(function() {
        return model;
      })
    });
  },

  /**
    Reload the record from the adapter.

    This will only work if the record has already finished loading
    and has not yet been modified (`isLoaded` but not `isDirty`,
    or `isSaving`).

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
  reload: function() {
    var model = this;
    return PromiseObject.create({
      promise: this._internalModel.reload().then(function() {
        return model;
      })
    });
  },


  /**
    Override the default event firing from Ember.Evented to
    also call methods with the given name.

    @method trigger
    @private
    @param {String} name
  */
  trigger: function(name) {
    var length = arguments.length;
    var args = new Array(length - 1);

    for (var i = 1; i < length; i++) {
      args[i - 1] = arguments[i];
    }

    Ember.tryInvoke(this, name, args);
    this._super.apply(this, arguments);
  },

  willDestroy: function() {
    //TODO Move!
    this._internalModel.recordObjectWillDestroy();
    this._super.apply(this, arguments);
    //TODO should we set internalModel to null here?
  },

  // This is a temporary solution until we refactor DS.Model to not
  // rely on the data property.
  willMergeMixin: function(props) {
    var constructor = this.constructor;
    Ember.assert('`' + intersection(Ember.keys(props), RESERVED_MODEL_PROPS)[0] + '` is a reserved property name on DS.Model objects. Please choose a different property name for ' + constructor.toString(), !intersection(Ember.keys(props), RESERVED_MODEL_PROPS)[0]);
  },

  attr: function() {
    Ember.assert("The `attr` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
  },

  belongsTo: function() {
    Ember.assert("The `belongsTo` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
  },

  hasMany: function() {
    Ember.assert("The `hasMany` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
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
  create: function() {
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
   @property
   @type String
   @readonly
  */
  modelName: null
});

export default Model;
