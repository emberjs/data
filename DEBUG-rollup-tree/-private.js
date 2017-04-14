import Ember from 'ember';
import { assert, assertPolymorphicType, deprecate, instrument, runInDebug, warn } from 'ember-data/-debug';
import { singularize } from 'ember-inflector';
import { InvalidError } from 'ember-data/adapters/errors';
import VERSION from 'ember-data/version';

const { get: get$1 , RSVP: { Promise }} = Ember;

/**
  A `PromiseArray` is an object that acts like both an `Ember.Array`
  and a promise. When the promise is resolved the resulting value
  will be set to the `PromiseArray`'s `content` property. This makes
  it easy to create data bindings with the `PromiseArray` that will be
  updated when the promise resolves.

  For more information see the [Ember.PromiseProxyMixin
  documentation](/api/classes/Ember.PromiseProxyMixin.html).

  Example

  ```javascript
  let promiseArray = DS.PromiseArray.create({
    promise: $.getJSON('/some/remote/data.json')
  });

  promiseArray.get('length'); // 0

  promiseArray.then(function() {
    promiseArray.get('length'); // 100
  });
  ```

  @class PromiseArray
  @namespace DS
  @extends Ember.ArrayProxy
  @uses Ember.PromiseProxyMixin
*/
const PromiseArray = Ember.ArrayProxy.extend(Ember.PromiseProxyMixin);

/**
  A `PromiseObject` is an object that acts like both an `Ember.Object`
  and a promise. When the promise is resolved, then the resulting value
  will be set to the `PromiseObject`'s `content` property. This makes
  it easy to create data bindings with the `PromiseObject` that will
  be updated when the promise resolves.

  For more information see the [Ember.PromiseProxyMixin
  documentation](/api/classes/Ember.PromiseProxyMixin.html).

  Example

  ```javascript
  let promiseObject = DS.PromiseObject.create({
    promise: $.getJSON('/some/remote/data.json')
  });

  promiseObject.get('name'); // null

  promiseObject.then(function() {
    promiseObject.get('name'); // 'Tomster'
  });
  ```

  @class PromiseObject
  @namespace DS
  @extends Ember.ObjectProxy
  @uses Ember.PromiseProxyMixin
*/
let PromiseObject = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin);

function promiseObject(promise, label) {
  return PromiseObject.create({
    promise: Promise.resolve(promise, label)
  });
}

function promiseArray(promise, label) {
  return PromiseArray.create({
    promise: Promise.resolve(promise, label)
  });
}

/**
  A PromiseManyArray is a PromiseArray that also proxies certain method calls
  to the underlying manyArray.
  Right now we proxy:

    * `reload()`
    * `createRecord()`
    * `on()`
    * `one()`
    * `trigger()`
    * `off()`
    * `has()`

  @class PromiseManyArray
  @namespace DS
  @extends Ember.ArrayProxy
*/

function proxyToContent(method) {
  return function() {
    return get$1(this, 'content')[method](...arguments);
  };
}

const PromiseManyArray = PromiseArray.extend({
  reload() {
    assert('You are trying to reload an async manyArray before it has been created', get$1(this, 'content'));
    this.set('promise', this.get('content').reload());
    return this;
  },

  createRecord: proxyToContent('createRecord'),

  on: proxyToContent('on'),

  one: proxyToContent('one'),

  trigger: proxyToContent('trigger'),

  off: proxyToContent('off'),

  has: proxyToContent('has')
});

const get$2 = Ember.get;
const set = Ember.set;
const isEmpty = Ember.isEmpty;
const makeArray = Ember.makeArray;

const MapWithDefault = Ember.MapWithDefault;

/**
@module ember-data
*/

/**
  Holds validation errors for a given record, organized by attribute names.

  Every `DS.Model` has an `errors` property that is an instance of
  `DS.Errors`. This can be used to display validation error
  messages returned from the server when a `record.save()` rejects.

  For Example, if you had a `User` model that looked like this:

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    username: DS.attr('string'),
    email: DS.attr('string')
  });
  ```
  And you attempted to save a record that did not validate on the backend:

  ```javascript
  let user = store.createRecord('user', {
    username: 'tomster',
    email: 'invalidEmail'
  });
  user.save();
  ```

  Your backend would be expected to return an error response that described
  the problem, so that error messages can be generated on the app.

  API responses will be translated into instances of `DS.Errors` differently,
  depending on the specific combination of adapter and serializer used. You
  may want to check the documentation or the source code of the libraries
  that you are using, to know how they expect errors to be communicated.

  Errors can be displayed to the user by accessing their property name
  to get an array of all the error objects for that property. Each
  error object is a JavaScript object with two keys:

  - `message` A string containing the error message from the backend
  - `attribute` The name of the property associated with this error message

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

  @class Errors
  @namespace DS
  @extends Ember.Object
  @uses Ember.Enumerable
  @uses Ember.Evented
 */
var Errors = Ember.ArrayProxy.extend(Ember.Evented, {
  /**
    Register with target handler

    @method registerHandlers
    @param {Object} target
    @param {Function} becameInvalid
    @param {Function} becameValid
    @deprecated
  */
  registerHandlers(target, becameInvalid, becameValid) {
    deprecate(
      `Record errors will no longer be evented.`, false, {
        id: 'ds.errors.registerHandlers',
        until: '3.0.0'
      });

    this._registerHandlers(target, becameInvalid, becameValid);
  },


  /**
    Register with target handler

    @method _registerHandlers
    @private
  */
  _registerHandlers(target, becameInvalid, becameValid) {
    this.on('becameInvalid', target, becameInvalid);
    this.on('becameValid', target, becameValid);
  },


  /**
    @property errorsByAttributeName
    @type {Ember.MapWithDefault}
    @private
  */
  errorsByAttributeName: Ember.computed(function() {
    return MapWithDefault.create({
      defaultValue() {
        return Ember.A();
      }
    });
  }),

  /**
    Returns errors for a given attribute

    ```javascript
    let user = store.createRecord('user', {
      username: 'tomster',
      email: 'invalidEmail'
    });
    user.save().catch(function(){
      user.get('errors').errorsFor('email'); // returns:
      // [{attribute: "email", message: "Doesn't look like a valid email."}]
    });
    ```

    @method errorsFor
    @param {String} attribute
    @return {Array}
  */
  errorsFor(attribute) {
    return get$2(this, 'errorsByAttributeName').get(attribute);
  },

  /**
    An array containing all of the error messages for this
    record. This is useful for displaying all errors to the user.

    ```handlebars
    {{#each model.errors.messages as |message|}}
      <div class="error">
        {{message}}
      </div>
    {{/each}}
    ```

    @property messages
    @type {Array}
  */
  messages: Ember.computed.mapBy('content', 'message'),

  /**
    @property content
    @type {Array}
    @private
  */
  content: Ember.computed(function() {
    return Ember.A();
  }),

  /**
    @method unknownProperty
    @private
  */
  unknownProperty(attribute) {
    let errors = this.errorsFor(attribute);
    if (isEmpty(errors)) { return null; }
    return errors;
  },

  /**
    Total number of errors.

    @property length
    @type {Number}
    @readOnly
  */

  /**
    @property isEmpty
    @type {Boolean}
    @readOnly
  */
  isEmpty: Ember.computed.not('length').readOnly(),

  /**
    Adds error messages to a given attribute and sends
    `becameInvalid` event to the record.

    Example:

    ```javascript
    if (!user.get('username') {
      user.get('errors').add('username', 'This field is required');
    }
    ```

    @method add
    @param {String} attribute
    @param {(Array|String)} messages
    @deprecated
  */
  add(attribute, messages) {
    warn(`Interacting with a record errors object will no longer change the record state.`, false, {
      id: 'ds.errors.add'
    });

    let wasEmpty = get$2(this, 'isEmpty');

    this._add(attribute, messages);

    if (wasEmpty && !get$2(this, 'isEmpty')) {
      this.trigger('becameInvalid');
    }
  },


  /**
    Adds error messages to a given attribute without sending event.

    @method _add
    @private
  */
  _add(attribute, messages) {
    messages = this._findOrCreateMessages(attribute, messages);
    this.addObjects(messages);
    get$2(this, 'errorsByAttributeName').get(attribute).addObjects(messages);

    this.notifyPropertyChange(attribute);
  },

  /**
    @method _findOrCreateMessages
    @private
  */
  _findOrCreateMessages(attribute, messages) {
    let errors = this.errorsFor(attribute);
    let messagesArray = makeArray(messages);
    let _messages = new Array(messagesArray.length);

    for (let i = 0; i < messagesArray.length; i++) {
      let message = messagesArray[i];
      let err = errors.findBy('message', message);
      if (err) {
        _messages[i] = err;
      } else {
        _messages[i] = {
          attribute: attribute,
          message: message
        };
      }
    }

    return _messages;
  },

  /**
    Removes all error messages from the given attribute and sends
    `becameValid` event to the record if there no more errors left.

    Example:

    ```app/models/user.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      email: DS.attr('string'),
      twoFactorAuth: DS.attr('boolean'),
      phone: DS.attr('string')
    });
    ```

    ```app/routes/user/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        save: function(user) {
           if (!user.get('twoFactorAuth')) {
             user.get('errors').remove('phone');
           }
           user.save();
         }
      }
    });
    ```

    @method remove
    @param {String} attribute
    @deprecated
  */
  remove(attribute) {
    warn(`Interacting with a record errors object will no longer change the record state.`, false, {
      id: 'ds.errors.remove'
    });

    if (get$2(this, 'isEmpty')) { return; }

    this._remove(attribute);

    if (get$2(this, 'isEmpty')) {
      this.trigger('becameValid');
    }
  },

  /**
    Removes all error messages from the given attribute without sending event.

    @method _remove
    @private
  */
  _remove(attribute) {
    if (get$2(this, 'isEmpty')) { return; }

    let content = this.rejectBy('attribute', attribute);
    set(this, 'content', content);
    get$2(this, 'errorsByAttributeName').delete(attribute);

    this.notifyPropertyChange(attribute);
  },

  /**
    Removes all error messages and sends `becameValid` event
    to the record.

    Example:

    ```app/routes/user/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        retrySave: function(user) {
           user.get('errors').clear();
           user.save();
         }
      }
    });
    ```

    @method clear
    @deprecated
  */
  clear() {
    warn(`Interacting with a record errors object will no longer change the record state.`, false, {
      id: 'ds.errors.clear'
    });

    if (get$2(this, 'isEmpty')) { return; }

    this._clear();
    this.trigger('becameValid');
  },


  /**
    Removes all error messages.
    to the record.

    @method _clear
    @private
  */
  _clear() {
    if (get$2(this, 'isEmpty')) { return; }

    let errorsByAttributeName = get$2(this, 'errorsByAttributeName');
    let attributes = Ember.A();

    errorsByAttributeName.forEach(function(_, attribute) {
      attributes.push(attribute);
    });

    errorsByAttributeName.clear();
    attributes.forEach(function(attribute) {
      this.notifyPropertyChange(attribute);
    }, this);

    Ember.ArrayProxy.prototype.clear.call(this);
  },


  /**
    Checks if there is error messages for the given attribute.

    ```app/routes/user/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        save: function(user) {
           if (user.get('errors').has('email')) {
             return alert('Please update your email before attempting to save.');
           }
           user.save();
         }
      }
    });
    ```

    @method has
    @param {String} attribute
    @return {Boolean} true if there some errors on given attribute
  */
  has(attribute) {
    return !isEmpty(this.errorsFor(attribute));
  }
});

function isEnabled() {
  return Ember.FEATURES.isEnabled(...arguments);
}

/**
  @module ember-data
*/
/*
  This file encapsulates the various states that a record can transition
  through during its lifecycle.
*/
/**
  ### State

  Each record has a `currentState` property that explicitly tracks what
  state a record is in at any given time. For instance, if a record is
  newly created and has not yet been sent to the adapter to be saved,
  it would be in the `root.loaded.created.uncommitted` state.  If a
  record has had local modifications made to it that are in the
  process of being saved, the record would be in the
  `root.loaded.updated.inFlight` state. (This state paths will be
  explained in more detail below.)

  Events are sent by the record or its store to the record's
  `currentState` property. How the state reacts to these events is
  dependent on which state it is in. In some states, certain events
  will be invalid and will cause an exception to be raised.

  States are hierarchical and every state is a substate of the
  `RootState`. For example, a record can be in the
  `root.deleted.uncommitted` state, then transition into the
  `root.deleted.inFlight` state. If a child state does not implement
  an event handler, the state manager will attempt to invoke the event
  on all parent states until the root state is reached. The state
  hierarchy of a record is described in terms of a path string. You
  can determine a record's current state by getting the state's
  `stateName` property:

  ```javascript
  record.get('currentState.stateName');
  //=> "root.created.uncommitted"
   ```

  The hierarchy of valid states that ship with ember data looks like
  this:

  ```text
  * root
    * deleted
      * saved
      * uncommitted
      * inFlight
    * empty
    * loaded
      * created
        * uncommitted
        * inFlight
      * saved
      * updated
        * uncommitted
        * inFlight
    * loading
  ```

  The `DS.Model` states are themselves stateless. What that means is
  that, the hierarchical states that each of *those* points to is a
  shared data structure. For performance reasons, instead of each
  record getting its own copy of the hierarchy of states, each record
  points to this global, immutable shared instance. How does a state
  know which record it should be acting on? We pass the record
  instance into the state's event handlers as the first argument.

  The record passed as the first parameter is where you should stash
  state about the record if needed; you should never store data on the state
  object itself.

  ### Events and Flags

  A state may implement zero or more events and flags.

  #### Events

  Events are named functions that are invoked when sent to a record. The
  record will first look for a method with the given name on the
  current state. If no method is found, it will search the current
  state's parent, and then its grandparent, and so on until reaching
  the top of the hierarchy. If the root is reached without an event
  handler being found, an exception will be raised. This can be very
  helpful when debugging new features.

  Here's an example implementation of a state with a `myEvent` event handler:

  ```javascript
  aState: DS.State.create({
    myEvent: function(manager, param) {
      console.log("Received myEvent with", param);
    }
  })
  ```

  To trigger this event:

  ```javascript
  record.send('myEvent', 'foo');
  //=> "Received myEvent with foo"
  ```

  Note that an optional parameter can be sent to a record's `send()` method,
  which will be passed as the second parameter to the event handler.

  Events should transition to a different state if appropriate. This can be
  done by calling the record's `transitionTo()` method with a path to the
  desired state. The state manager will attempt to resolve the state path
  relative to the current state. If no state is found at that path, it will
  attempt to resolve it relative to the current state's parent, and then its
  parent, and so on until the root is reached. For example, imagine a hierarchy
  like this:

      * created
        * uncommitted <-- currentState
        * inFlight
      * updated
        * inFlight

  If we are currently in the `uncommitted` state, calling
  `transitionTo('inFlight')` would transition to the `created.inFlight` state,
  while calling `transitionTo('updated.inFlight')` would transition to
  the `updated.inFlight` state.

  Remember that *only events* should ever cause a state transition. You should
  never call `transitionTo()` from outside a state's event handler. If you are
  tempted to do so, create a new event and send that to the state manager.

  #### Flags

  Flags are Boolean values that can be used to introspect a record's current
  state in a more user-friendly way than examining its state path. For example,
  instead of doing this:

  ```javascript
  var statePath = record.get('stateManager.currentPath');
  if (statePath === 'created.inFlight') {
    doSomething();
  }
  ```

  You can say:

  ```javascript
  if (record.get('isNew') && record.get('isSaving')) {
    doSomething();
  }
  ```

  If your state does not set a value for a given flag, the value will
  be inherited from its parent (or the first place in the state hierarchy
  where it is defined).

  The current set of flags are defined below. If you want to add a new flag,
  in addition to the area below, you will also need to declare it in the
  `DS.Model` class.


   * [isEmpty](DS.Model.html#property_isEmpty)
   * [isLoading](DS.Model.html#property_isLoading)
   * [isLoaded](DS.Model.html#property_isLoaded)
   * [hasDirtyAttributes](DS.Model.html#property_hasDirtyAttributes)
   * [isSaving](DS.Model.html#property_isSaving)
   * [isDeleted](DS.Model.html#property_isDeleted)
   * [isNew](DS.Model.html#property_isNew)
   * [isValid](DS.Model.html#property_isValid)

  @namespace DS
  @class RootState
*/

function didSetProperty(internalModel, context) {
  if (context.value === context.originalValue) {
    delete internalModel._attributes[context.name];
    internalModel.send('propertyWasReset', context.name);
  } else if (context.value !== context.oldValue) {
    internalModel.send('becomeDirty');
  }

  internalModel.updateRecordArrays();
}

// Implementation notes:
//
// Each state has a boolean value for all of the following flags:
//
// * isLoaded: The record has a populated `data` property. When a
//   record is loaded via `store.find`, `isLoaded` is false
//   until the adapter sets it. When a record is created locally,
//   its `isLoaded` property is always true.
// * isDirty: The record has local changes that have not yet been
//   saved by the adapter. This includes records that have been
//   created (but not yet saved) or deleted.
// * isSaving: The record has been committed, but
//   the adapter has not yet acknowledged that the changes have
//   been persisted to the backend.
// * isDeleted: The record was marked for deletion. When `isDeleted`
//   is true and `isDirty` is true, the record is deleted locally
//   but the deletion was not yet persisted. When `isSaving` is
//   true, the change is in-flight. When both `isDirty` and
//   `isSaving` are false, the change has persisted.
// * isNew: The record was created on the client and the adapter
//   did not yet report that it was successfully saved.
// * isValid: The adapter did not report any server-side validation
//   failures.

// The dirty state is a abstract state whose functionality is
// shared between the `created` and `updated` states.
//
// The deleted state shares the `isDirty` flag with the
// subclasses of `DirtyState`, but with a very different
// implementation.
//
// Dirty states have three child states:
//
// `uncommitted`: the store has not yet handed off the record
//   to be saved.
// `inFlight`: the store has handed off the record to be saved,
//   but the adapter has not yet acknowledged success.
// `invalid`: the record has invalid information and cannot be
//   sent to the adapter yet.
const DirtyState = {
  initialState: 'uncommitted',

  // FLAGS
  isDirty: true,

  // SUBSTATES

  // When a record first becomes dirty, it is `uncommitted`.
  // This means that there are local pending changes, but they
  // have not yet begun to be saved, and are not invalid.
  uncommitted: {
    // EVENTS
    didSetProperty,

    //TODO(Igor) reloading now triggers a
    //loadingData event, though it seems fine?
    loadingData() { },

    propertyWasReset(internalModel, name) {
      if (!internalModel.hasChangedAttributes()) { internalModel.send('rolledBack'); }
    },

    pushedData(internalModel) {
      let token = heimdall.start('stats.uncommitted.pushedData');
      internalModel.updateChangedAttributes();

      if (!internalModel.hasChangedAttributes()) {
        internalModel.transitionTo('loaded.saved');
      }
      heimdall.stop(token);
    },

    becomeDirty() {},

    willCommit(internalModel) {
      internalModel.transitionTo('inFlight');
    },

    reloadRecord(internalModel, resolve) {
      resolve(internalModel.store._reloadRecord(internalModel));
    },

    rolledBack(internalModel) {
      internalModel.transitionTo('loaded.saved');
    },

    becameInvalid(internalModel) {
      internalModel.transitionTo('invalid');
    },

    rollback(internalModel) {
      internalModel.rollbackAttributes();
      internalModel.triggerLater('ready');
    }
  },

  // Once a record has been handed off to the adapter to be
  // saved, it is in the 'in flight' state. Changes to the
  // record cannot be made during this window.
  inFlight: {
    // FLAGS
    isSaving: true,

    // EVENTS
    didSetProperty,
    becomeDirty() { },
    pushedData() { },

    unloadRecord: assertAgainstUnloadRecord,

    // TODO: More robust semantics around save-while-in-flight
    willCommit() { },

    didCommit(internalModel) {
      internalModel.transitionTo('saved');
      internalModel.send('invokeLifecycleCallbacks', this.dirtyType);
    },

    becameInvalid(internalModel) {
      internalModel.transitionTo('invalid');
      internalModel.send('invokeLifecycleCallbacks');
    },

    becameError(internalModel) {
      internalModel.transitionTo('uncommitted');
      internalModel.triggerLater('becameError', internalModel);
    }
  },

  // A record is in the `invalid` if the adapter has indicated
  // the the record failed server-side invalidations.
  invalid: {
    // FLAGS
    isValid: false,

    // EVENTS
    deleteRecord(internalModel) {
      internalModel.transitionTo('deleted.uncommitted');
    },

    didSetProperty(internalModel, context) {
      internalModel.removeErrorMessageFromAttribute(context.name);

      didSetProperty(internalModel, context);

      if (!internalModel.hasErrors()) {
        this.becameValid(internalModel);
      }
    },

    becameInvalid() { },
    becomeDirty() { },
    pushedData() { },

    willCommit(internalModel) {
      internalModel.clearErrorMessages();
      internalModel.transitionTo('inFlight');
    },

    rolledBack(internalModel) {
      internalModel.clearErrorMessages();
      internalModel.transitionTo('loaded.saved');
      internalModel.triggerLater('ready');
    },

    becameValid(internalModel) {
      internalModel.transitionTo('uncommitted');
    },

    invokeLifecycleCallbacks(internalModel) {
      internalModel.triggerLater('becameInvalid', internalModel);
    }
  }
};

// The created and updated states are created outside the state
// chart so we can reopen their substates and add mixins as
// necessary.

function deepClone(object) {
  const clone = {};
  let value;

  for (let prop in object) {
    value = object[prop];
    if (value && typeof value === 'object') {
      clone[prop] = deepClone(value);
    } else {
      clone[prop] = value;
    }
  }

  return clone;
}

function mixin(original, hash) {
  for (let prop in hash) {
    original[prop] = hash[prop];
  }

  return original;
}

function dirtyState(options) {
  var newState = deepClone(DirtyState);
  return mixin(newState, options);
}

const createdState = dirtyState({
  dirtyType: 'created',
  // FLAGS
  isNew: true
});

createdState.invalid.rolledBack = function(internalModel) {
  internalModel.transitionTo('deleted.saved');
};

createdState.uncommitted.rolledBack = function(internalModel) {
  internalModel.transitionTo('deleted.saved');
};

const updatedState = dirtyState({
  dirtyType: 'updated'
});

function createdStateDeleteRecord(internalModel) {
  internalModel.transitionTo('deleted.saved');
  internalModel.send('invokeLifecycleCallbacks');
}

createdState.uncommitted.deleteRecord = createdStateDeleteRecord;

createdState.invalid.deleteRecord = createdStateDeleteRecord;

createdState.uncommitted.rollback = function(internalModel) {
  DirtyState.uncommitted.rollback.apply(this, arguments);
  internalModel.transitionTo('deleted.saved');
};

createdState.uncommitted.pushedData = function(internalModel) {
  internalModel.transitionTo('loaded.updated.uncommitted');
  internalModel.triggerLater('didLoad');
};

createdState.uncommitted.propertyWasReset = function() {};

function assertAgainstUnloadRecord(internalModel) {
  assert("You can only unload a record which is not inFlight. `" + internalModel + "`", false);
}

updatedState.inFlight.unloadRecord = assertAgainstUnloadRecord;

updatedState.uncommitted.deleteRecord = function(internalModel) {
  internalModel.transitionTo('deleted.uncommitted');
};

const RootState = {
  // FLAGS
  isEmpty: false,
  isLoading: false,
  isLoaded: false,
  isDirty: false,
  isSaving: false,
  isDeleted: false,
  isNew: false,
  isValid: true,

  // DEFAULT EVENTS

  // Trying to roll back if you're not in the dirty state
  // doesn't change your state. For example, if you're in the
  // in-flight state, rolling back the record doesn't move
  // you out of the in-flight state.
  rolledBack() { },
  unloadRecord(internalModel) {
  },

  propertyWasReset() { },

  // SUBSTATES

  // A record begins its lifecycle in the `empty` state.
  // If its data will come from the adapter, it will
  // transition into the `loading` state. Otherwise, if
  // the record is being created on the client, it will
  // transition into the `created` state.
  empty: {
    isEmpty: true,

    // EVENTS
    loadingData(internalModel, promise) {
      internalModel._loadingPromise = promise;
      internalModel.transitionTo('loading');
    },

    loadedData(internalModel) {
      internalModel.transitionTo('loaded.created.uncommitted');
      internalModel.triggerLater('ready');
    },

    pushedData(internalModel) {
      internalModel.transitionTo('loaded.saved');
      internalModel.triggerLater('didLoad');
      internalModel.triggerLater('ready');
    }
  },

  // A record enters this state when the store asks
  // the adapter for its data. It remains in this state
  // until the adapter provides the requested data.
  //
  // Usually, this process is asynchronous, using an
  // XHR to retrieve the data.
  loading: {
    // FLAGS
    isLoading: true,

    exit(internalModel) {
      internalModel._loadingPromise = null;
    },

    // EVENTS
    pushedData(internalModel) {
      internalModel.transitionTo('loaded.saved');
      internalModel.triggerLater('didLoad');
      internalModel.triggerLater('ready');
      //TODO this seems out of place here
      internalModel.didCleanError();
    },

    becameError(internalModel) {
      internalModel.triggerLater('becameError', internalModel);
    },

    notFound(internalModel) {
      internalModel.transitionTo('empty');
    }
  },

  // A record enters this state when its data is populated.
  // Most of a record's lifecycle is spent inside substates
  // of the `loaded` state.
  loaded: {
    initialState: 'saved',

    // FLAGS
    isLoaded: true,

    //TODO(Igor) Reloading now triggers a loadingData event,
    //but it should be ok?
    loadingData() { },

    // SUBSTATES

    // If there are no local changes to a record, it remains
    // in the `saved` state.
    saved: {
      setup(internalModel) {
        if (internalModel.hasChangedAttributes()) {
          internalModel.adapterDidDirty();
        }
      },

      // EVENTS
      didSetProperty,

      pushedData() { },

      becomeDirty(internalModel) {
        internalModel.transitionTo('updated.uncommitted');
      },

      willCommit(internalModel) {
        internalModel.transitionTo('updated.inFlight');
      },

      reloadRecord(internalModel, resolve) {
        resolve(internalModel.store._reloadRecord(internalModel));
      },

      deleteRecord(internalModel) {
        internalModel.transitionTo('deleted.uncommitted');
      },

      unloadRecord(internalModel) {
      },

      didCommit() {},

      // loaded.saved.notFound would be triggered by a failed
      // `reload()` on an unchanged record
      notFound() { }
    },

    // A record is in this state after it has been locally
    // created but before the adapter has indicated that
    // it has been saved.
    created: createdState,

    // A record is in this state if it has already been
    // saved to the server, but there are new local changes
    // that have not yet been saved.
    updated: updatedState
  },

  // A record is in this state if it was deleted from the store.
  deleted: {
    initialState: 'uncommitted',
    dirtyType: 'deleted',

    // FLAGS
    isDeleted: true,
    isLoaded: true,
    isDirty: true,

    // TRANSITIONS
    setup(internalModel) {
      internalModel.updateRecordArrays();
    },

    // SUBSTATES

    // When a record is deleted, it enters the `start`
    // state. It will exit this state when the record
    // starts to commit.
    uncommitted: {

      // EVENTS

      willCommit(internalModel) {
        internalModel.transitionTo('inFlight');
      },

      rollback(internalModel) {
        internalModel.rollbackAttributes();
        internalModel.triggerLater('ready');
      },

      pushedData()   { },
      becomeDirty()  { },
      deleteRecord() { },

      rolledBack(internalModel) {
        internalModel.transitionTo('loaded.saved');
        internalModel.triggerLater('ready');
      }
    },

    // After a record starts committing, but
    // before the adapter indicates that the deletion
    // has saved to the server, a record is in the
    // `inFlight` substate of `deleted`.
    inFlight: {
      // FLAGS
      isSaving: true,

      // EVENTS

      unloadRecord: assertAgainstUnloadRecord,

      // TODO: More robust semantics around save-while-in-flight
      willCommit() { },
      didCommit(internalModel) {
        internalModel.transitionTo('saved');

        internalModel.send('invokeLifecycleCallbacks');
      },

      becameError(internalModel) {
        internalModel.transitionTo('uncommitted');
        internalModel.triggerLater('becameError', internalModel);
      },

      becameInvalid(internalModel) {
        internalModel.transitionTo('invalid');
        internalModel.triggerLater('becameInvalid', internalModel);
      }
    },

    // Once the adapter indicates that the deletion has
    // been saved, the record enters the `saved` substate
    // of `deleted`.
    saved: {
      // FLAGS
      isDirty: false,

      setup(internalModel) {
        internalModel.clearRelationships();
      },

      invokeLifecycleCallbacks(internalModel) {
        internalModel.triggerLater('didDelete', internalModel);
        internalModel.triggerLater('didCommit', internalModel);
      },

      willCommit() { },
      didCommit()  { }
    },

    invalid: {
      isValid: false,

      didSetProperty(internalModel, context) {
        internalModel.removeErrorMessageFromAttribute(context.name);

        didSetProperty(internalModel, context);

        if (!internalModel.hasErrors()) {
          this.becameValid(internalModel);
        }
      },

      becameInvalid() { },
      becomeDirty()   { },
      deleteRecord()  { },
      willCommit()    { },

      rolledBack(internalModel) {
        internalModel.clearErrorMessages();
        internalModel.transitionTo('loaded.saved');
        internalModel.triggerLater('ready');
      },

      becameValid(internalModel) {
        internalModel.transitionTo('uncommitted');
      }

    }
  },

  invokeLifecycleCallbacks(internalModel, dirtyType) {
    if (dirtyType === 'created') {
      internalModel.triggerLater('didCreate', internalModel);
    } else {
      internalModel.triggerLater('didUpdate', internalModel);
    }

    internalModel.triggerLater('didCommit', internalModel);
  }
};

function wireState(object, parent, name) {
  // TODO: Use Object.create and copy instead
  object = mixin(parent ? Object.create(parent) : {}, object);
  object.parentState = parent;
  object.stateName = name;

  for (let prop in object) {
    if (!object.hasOwnProperty(prop) || prop === 'parentState' || prop === 'stateName') { continue; }
    if (typeof object[prop] === 'object') {
      object[prop] = wireState(object[prop], object, name + '.' + prop);
    }
  }

  return object;
}

var RootState$1 = wireState(RootState, null, 'root');

// All modelNames are dasherized internally. Changing this function may
// require changes to other normalization hooks (such as typeForRoot).

/**
 This method normalizes a modelName into the format Ember Data uses
 internally.

  @method normalizeModelName
  @public
  @param {String} modelName
  @return {String} normalizedModelName
  @for DS
*/
function normalizeModelName(modelName) {
  return Ember.String.dasherize(modelName);
}

function typeForRelationshipMeta(meta) {
  let modelName;

  modelName = meta.type || meta.key;
  if (meta.kind === 'hasMany') {
    modelName = singularize(normalizeModelName(modelName));
  }
  return modelName;
}

function relationshipFromMeta(meta) {
  return {
    key:  meta.key,
    kind: meta.kind,
    type: typeForRelationshipMeta(meta),
    options:    meta.options,
    name: meta.name,
    parentType: meta.parentType,
    isRelationship: true
  };
}

const Map$1 = Ember.Map;
const MapWithDefault$1 = Ember.MapWithDefault;

const relationshipsDescriptor = Ember.computed(function() {
  if (Ember.testing === true && relationshipsDescriptor._cacheable === true) {
    relationshipsDescriptor._cacheable = false;
  }

  let map = new MapWithDefault$1({
    defaultValue() { return []; }
  });

  // Loop through each computed property on the class
  this.eachComputedProperty((name, meta) => {
    // If the computed property is a relationship, add
    // it to the map.
    if (meta.isRelationship) {
      meta.key = name;
      let relationshipsForType = map.get(typeForRelationshipMeta(meta));

      relationshipsForType.push({
        name: name,
        kind: meta.kind
      });
    }
  });

  return map;
}).readOnly();

const relatedTypesDescriptor = Ember.computed(function() {
  if (Ember.testing === true && relatedTypesDescriptor._cacheable === true) {
    relatedTypesDescriptor._cacheable = false;
  }

  let modelName;
  let types = Ember.A();

  // Loop through each computed property on the class,
  // and create an array of the unique types involved
  // in relationships
  this.eachComputedProperty((name, meta) => {
    if (meta.isRelationship) {
      meta.key = name;
      modelName = typeForRelationshipMeta(meta);

      assert("You specified a hasMany (" + meta.type + ") on " + meta.parentType + " but " + meta.type + " was not found.", modelName);

      if (!types.includes(modelName)) {
        assert("Trying to sideload " + name + " on " + this.toString() + " but the type doesn't exist.", !!modelName);
        types.push(modelName);
      }
    }
  });

  return types;
}).readOnly();

const relationshipsByNameDescriptor = Ember.computed(function() {
  if (Ember.testing === true && relationshipsByNameDescriptor._cacheable === true) {
    relationshipsByNameDescriptor._cacheable = false;
  }

  let map = Map$1.create();

  this.eachComputedProperty((name, meta) => {
    if (meta.isRelationship) {
      meta.key = name;
      let relationship = relationshipFromMeta(meta);
      relationship.type = typeForRelationshipMeta(meta);
      map.set(name, relationship);
    }
  });

  return map;
}).readOnly();

const {
  get,
  computed,
  Map
} = Ember;

/**
  @module ember-data
*/

function findPossibleInverses(type, inverseType, name, relationshipsSoFar) {
  let possibleRelationships = relationshipsSoFar || [];

  let relationshipMap = get(inverseType, 'relationships');
  if (!relationshipMap) { return possibleRelationships; }

  let relationships = relationshipMap.get(type.modelName).filter(relationship => {
    let optionsForRelationship = inverseType.metaForProperty(relationship.name).options;

    if (!optionsForRelationship.inverse) {
      return true;
    }

    return name === optionsForRelationship.inverse;
  });

  if (relationships) {
    possibleRelationships.push.apply(possibleRelationships, relationships);
  }

  //Recurse to support polymorphism
  if (type.superclass) {
    findPossibleInverses(type.superclass, inverseType, name, possibleRelationships);
  }

  return possibleRelationships;
}

function intersection (array1, array2) {
  let result = [];
  array1.forEach((element) => {
    if (array2.indexOf(element) >= 0) {
      result.push(element);
    }
  });

  return result;
}

const RESERVED_MODEL_PROPS = [
  'currentState', 'data', 'store'
];

const retrieveFromCurrentState = computed('currentState', function(key) {
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
const Model = Ember.Object.extend(Ember.Evented, {
  _internalModel: null,
  store: null,
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
  id: null,

  /**
    @property currentState
    @private
    @type {Object}
  */
  currentState: RootState$1.empty,

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
    let serializer = this.store.serializerFor('-default');
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
          let controller = this.controller;
          controller.get('model').destroyRecord().then(function() {
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
    Unloads the record from the store. This will cause the record to be destroyed and freed up for garbage collection.

    @method unloadRecord
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
    let key;
    for (let i = 0, length = keys.length; i < length; i++) {
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

  // This is a temporary solution until we refactor DS.Model to not
  // rely on the data property.
  willMergeMixin(props) {
    let constructor = this.constructor;
    assert('`' + intersection(Object.keys(props), RESERVED_MODEL_PROPS)[0] + '` is a reserved property name on DS.Model objects. Please choose a different property name for ' + constructor.toString(), !intersection(Object.keys(props), RESERVED_MODEL_PROPS)[0]);
    assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + constructor.toString(), Object.keys(props).indexOf('id') === -1);
  },

  attr() {
    assert("The `attr` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
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

  setId: Ember.observer('id', function () {
    this._internalModel.setId(this.get('id'));
  }),

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
    let relationships = { };
    let expensiveProperties = [];

    this.eachAttribute((name, meta) => attributes.push(name));

    let groups = [
      {
        name: 'Attributes',
        properties: attributes,
        expand: true
      }
    ];

    this.eachRelationship((name, relationship) => {
      let properties = relationships[relationship.kind];

      if (properties === undefined) {
        properties = relationships[relationship.kind] = [];
        groups.push({
          name: relationship.name,
          properties,
          expand: true
        });
      }
      properties.push(name);
      expensiveProperties.push(name);
    });

    groups.push({
      name: 'Flags',
      properties: ['isLoaded', 'hasDirtyAttributes', 'isSaving', 'isDeleted', 'isError', 'isNew', 'isValid']
    });

    return {
      propertyInfo: {
        // include all other mixins / properties (not just the grouped ones)
        includeOtherProperties: true,
        groups: groups,
        // don't pre-calculate unless cached
        expensiveProperties: expensiveProperties
      }
    };
  },

  notifyBelongsToChanged(key) {
    this.notifyPropertyChange(key);
  },

  /**
   This Ember.js hook allows an object to be notified when a property
   is defined.

   In this case, we use it to be notified when an Ember Data user defines a
   belongs-to relationship. In that case, we need to set up observers for
   each one, allowing us to track relationship changes and automatically
   reflect changes in the inverse has-many array.

   This hook passes the class being set up, as well as the key and value
   being defined. So, for example, when the user does this:

   ```javascript
   DS.Model.extend({
    parent: DS.belongsTo('user')
  });
   ```

   This hook would be called with "parent" as the key and the computed
   property returned by `DS.belongsTo` as the value.

   @method didDefineProperty
   @param {Object} proto
   @param {String} key
   @param {Ember.ComputedProperty} value
   */
  didDefineProperty(proto, key, value) {
    // Check if the value being set is a computed property.
    if (value instanceof Ember.ComputedProperty) {

      // If it is, get the metadata for the relationship. This is
      // populated by the `DS.belongsTo` helper when it is creating
      // the computed property.
      let meta = value.meta();

      meta.parentType = proto.constructor;
    }
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
    return this.constructor.inverseFor(key, this.store);
  },

  notifyHasManyAdded(key) {
    //We need to notifyPropertyChange in the adding case because we need to make sure
    //we fetch the newly added record in case it is unloaded
    //TODO(Igor): Consider whether we could do this only if the record state is unloaded

    //Goes away once hasMany is double promisified
    this.notifyPropertyChange(key);
  },

  eachAttribute(callback, binding) {
    this.constructor.eachAttribute(callback, binding);
  }
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

runInDebug(function() {
  Model.reopen({
    init() {
      this._super(...arguments);

      if (!this._internalModel) {
        throw new Ember.Error('You should not call `create` on a model. Instead, call `store.createRecord` with the attributes you would like to set.');
      }
    }
  });
});

Model.reopenClass({
  isModel: true,

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
   export default const PostSerializer = DS.RESTSerializer.extend({
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

  inverseMap: Ember.computed(function() {
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
    if (inverseMap[name] !== undefined) {
      return inverseMap[name];
    } else {
      let relationship = get(this, 'relationshipsByName').get(name);
      if (!relationship) {
        inverseMap[name] = null;
        return null;
      }

      let options = relationship.options;
      if (options && options.inverse === null) {
        // populate the cache with a miss entry so we can skip getting and going
        // through `relationshipsByName`
        inverseMap[name] = null;
        return null;
      }

      return inverseMap[name] = this._findInverseFor(name, store);
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
    if (options.inverse === null) { return null; }

    let inverseName, inverseKind, inverse;

    //If inverse is specified manually, return the inverse
    if (options.inverse) {
      inverseName = options.inverse;
      inverse = Ember.get(inverseType, 'relationshipsByName').get(inverseName);

      assert("We found no inverse relationships by the name of '" + inverseName + "' on the '" + inverseType.modelName +
        "' model. This is most likely due to a missing attribute on your model definition.", !Ember.isNone(inverse));

      inverseKind = inverse.kind;
    } else {
      //No inverse was specified manually, we need to use a heuristic to guess one
      if (propertyMeta.type === propertyMeta.parentType.modelName) {
        warn(`Detected a reflexive relationship by the name of '${name}' without an inverse option. Look at http://emberjs.com/guides/models/defining-models/#toc_reflexive-relation for how to explicitly specify inverses.`, false, {
          id: 'ds.model.reflexive-relationship-without-inverse'
        });
      }

      let possibleRelationships = findPossibleInverses(this, inverseType, name);

      if (possibleRelationships.length === 0) { return null; }

      let filteredRelationships = possibleRelationships.filter((possibleRelationship) => {
        let optionsForRelationship = inverseType.metaForProperty(possibleRelationship.name).options;
        return name === optionsForRelationship.inverse;
      });

      assert("You defined the '" + name + "' relationship on " + this + ", but you defined the inverse relationships of type " +
        inverseType.toString() + " multiple times. Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
        filteredRelationships.length < 2);

      if (filteredRelationships.length === 1 ) {
        possibleRelationships = filteredRelationships;
      }

      assert("You defined the '" + name + "' relationship on " + this + ", but multiple possible inverse relationships of type " +
        this + " were found on " + inverseType + ". Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
        possibleRelationships.length === 1);

      inverseName = possibleRelationships[0].name;
      inverseKind = possibleRelationships[0].kind;
    }

    return {
      type: inverseType,
      name: inverseName,
      kind: inverseKind
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
   @type Ember.Map
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
  relationshipNames: Ember.computed(function() {
    let names = {
      hasMany: [],
      belongsTo: []
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
   @type Ember.Map
   @readOnly
   */
  relationshipsByName: relationshipsByNameDescriptor,

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
   @type Ember.Map
   @readOnly
   */
  fields: Ember.computed(function() {
    let map = Map.create();

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
   @type {Ember.Map}
   @readOnly
   */
  attributes: Ember.computed(function() {
    let map = Map.create();

    this.eachComputedProperty((name, meta) => {
      if (meta.isAttribute) {
        assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + this.toString(), name !== 'id');

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
   @type {Ember.Map}
   @readOnly
   */
  transformedAttributes: Ember.computed(function() {
    let map = Map.create();

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
  }
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

if (isEnabled('ds-rollback-attribute')) {
  Model.reopen({
    /**
      Discards any unsaved changes to the given attribute. This feature is not enabled by default. You must enable `ds-rollback-attribute` and be running a canary build.

      Example

      ```javascript
      record.get('name'); // 'Untitled Document'
      record.set('name', 'Doc 1');
      record.get('name'); // 'Doc 1'
      record.rollbackAttribute('name');
      record.get('name'); // 'Untitled Document'
      ```

      @method rollbackAttribute
    */
    rollbackAttribute(attributeName) {
      if (attributeName in this._internalModel._attributes) {
        this.set(attributeName, this._internalModel.lastAcknowledgedValue(attributeName));
      }
    }
  });
}

const EmberOrderedSet = Ember.OrderedSet;
const guidFor = Ember.guidFor;

function OrderedSet() {
  this._super$constructor();
}

OrderedSet.create = function() {
  let Constructor = this;
  return new Constructor();
};

OrderedSet.prototype = Object.create(EmberOrderedSet.prototype);
OrderedSet.prototype.constructor = OrderedSet;
OrderedSet.prototype._super$constructor = EmberOrderedSet;

OrderedSet.prototype.addWithIndex = function(obj, idx) {
  let guid = guidFor(obj);
  let presenceSet = this.presenceSet;
  let list = this.list;

  if (presenceSet[guid] === true) {
    return;
  }

  presenceSet[guid] = true;

  if (idx === undefined || idx === null) {
    list.push(obj);
  } else {
    list.splice(idx, 0, obj);
  }

  this.size += 1;

  return this;
};

/*
  This method normalizes a link to an "links object". If the passed link is
  already an object it's returned without any modifications.

  See http://jsonapi.org/format/#document-links for more information.

  @method _normalizeLink
  @private
  @param {String} link
  @return {Object|null}
  @for DS
*/
function _normalizeLink(link) {
  switch (typeof link) {
    case 'object': return link;
    case 'string': return { href: link };
  }
  return null;
}

/* global heimdall */
const {
  addCanonicalInternalModel,
  addCanonicalInternalModels,
  addInternalModel,
  addInternalModels,
  clear,
  findLink,
  flushCanonical,
  flushCanonicalLater,
  newRelationship,
  push,
  removeCanonicalInternalModel,
  removeCanonicalInternalModelFromInverse,
  removeCanonicalInternalModelFromOwn,
  removeCanonicalInternalModels,
  removeInternalModel,
  removeInternalModelFromInverse,
  removeInternalModelFromOwn,
  removeInternalModels,
  setHasData,
  setHasLoaded,
  updateLink,
  updateMeta,
  updateInternalModelsFromAdapter
} = heimdall.registerMonitor('system.relationships.state.relationship',
  'addCanonicalInternalModel',
  'addCanonicalInternalModels',
  'addInternalModel',
  'addInternalModels',
  'clear',
  'findLink',
  'flushCanonical',
  'flushCanonicalLater',
  'newRelationship',
  'push',
  'removeCanonicalInternalModel',
  'removeCanonicalInternalModelFromInverse',
  'removeCanonicalInternalModelFromOwn',
  'removeCanonicalInternalModels',
  'removeInternalModel',
  'removeInternalModelFromInverse',
  'removeInternalModelFromOwn',
  'removeInternalModels',
  'setHasData',
  'setHasLoaded',
  'updateLink',
  'updateMeta',
  'updateInternalModelsFromAdapter'
);

class Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    heimdall.increment(newRelationship);
    let async = relationshipMeta.options.async;
    let polymorphic = relationshipMeta.options.polymorphic;
    this.members = new OrderedSet();
    this.canonicalMembers = new OrderedSet();
    this.store = store;
    this.key = relationshipMeta.key;
    this.inverseKey = inverseKey;
    this.internalModel = internalModel;
    this.isAsync = typeof async === 'undefined' ? true : async;
    this.isPolymorphic = typeof polymorphic === 'undefined' ? true : polymorphic;
    this.relationshipMeta = relationshipMeta;
    //This probably breaks for polymorphic relationship in complex scenarios, due to
    //multiple possible modelNames
    this.inverseKeyForImplicit = this.internalModel.modelName + this.key;
    this.linkPromise = null;
    this.meta = null;
    this.hasData = false;
    this.hasLoaded = false;
  }

  get parentType() {
    return this.internalModel.modelName;
  }

  removeInverseRelationships() {
    if (!this.inverseKey) { return; }

    let allMembers =
      // we actually want a union of members and canonicalMembers
      // they should be disjoint but currently are not due to a bug
      this.members.toArray().concat(this.canonicalMembers.toArray());

    allMembers.forEach(inverseInternalModel => {
      let relationship = inverseInternalModel._relationships.get(this.inverseKey);
      relationship.inverseDidDematerialize();
    });
  }

  inverseDidDematerialize() {}

  updateMeta(meta) {
    heimdall.increment(updateMeta);
    this.meta = meta;
  }

  clear() {
    heimdall.increment(clear);

    let members = this.members.list;
    while (members.length > 0) {
      let member = members[0];
      this.removeInternalModel(member);
    }

    let canonicalMembers = this.canonicalMembers.list;
    while (canonicalMembers.length > 0) {
      let member = canonicalMembers[0];
      this.removeCanonicalInternalModel(member);
    }
  }

  removeInternalModels(internalModels) {
    heimdall.increment(removeInternalModels);
    internalModels.forEach((internalModel) => this.removeInternalModel(internalModel));
  }

  addInternalModels(internalModels, idx) {
    heimdall.increment(addInternalModels);
    internalModels.forEach(internalModel => {
      this.addInternalModel(internalModel, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  }

  addCanonicalInternalModels(internalModels, idx) {
    heimdall.increment(addCanonicalInternalModels);
    for (let i=0; i<internalModels.length; i++) {
      if (idx !== undefined) {
        this.addCanonicalInternalModel(internalModels[i], i+idx);
      } else {
        this.addCanonicalInternalModel(internalModels[i]);
      }
    }
  }

  addCanonicalInternalModel(internalModel, idx) {
    heimdall.increment(addCanonicalInternalModel);
    if (!this.canonicalMembers.has(internalModel)) {
      this.canonicalMembers.add(internalModel);
      this.setupInverseRelationship(internalModel);
    }
    this.flushCanonicalLater();
    this.setHasData(true);
  }

  setupInverseRelationship(internalModel) {
    if (this.inverseKey) {
      let relationships = internalModel._relationships;
      let relationshipExisted = relationships.has(this.inverseKey);
      let relationship = relationships.get(this.inverseKey);
      if (relationshipExisted || this.isPolymorphic) {
        // if we have only just initialized the inverse relationship, then it
        // already has this.internalModel in its canonicalMembers, so skip the
        // unnecessary work.  The exception to this is polymorphic
        // relationships whose members are determined by their inverse, as those
        // relationships cannot efficiently find their inverse payloads.
        relationship.addCanonicalInternalModel(this.internalModel);
      }
    } else {
      let relationships = internalModel._implicitRelationships;
      let relationship = relationships[this.inverseKeyForImplicit];
      if (!relationship) {
        relationship = relationships[this.inverseKeyForImplicit] =
          new Relationship(this.store, internalModel, this.key,  { options: {} });
      }
      relationship.addCanonicalInternalModel(this.internalModel);
    }
  }

  removeCanonicalInternalModels(internalModels, idx) {
    heimdall.increment(removeCanonicalInternalModels);
    for (let i=0; i<internalModels.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalInternalModel(internalModels[i], i+idx);
      } else {
        this.removeCanonicalInternalModel(internalModels[i]);
      }
    }
  }

  removeCanonicalInternalModel(internalModel, idx) {
    heimdall.increment(removeCanonicalInternalModel);
    if (this.canonicalMembers.has(internalModel)) {
      this.removeCanonicalInternalModelFromOwn(internalModel);
      if (this.inverseKey) {
        this.removeCanonicalInternalModelFromInverse(internalModel);
      } else {
        if (internalModel._implicitRelationships[this.inverseKeyForImplicit]) {
          internalModel._implicitRelationships[this.inverseKeyForImplicit].removeCanonicalInternalModel(this.internalModel);
        }
      }
    }
    this.flushCanonicalLater();
  }

  addInternalModel(internalModel, idx) {
    heimdall.increment(addInternalModel);
    if (!this.members.has(internalModel)) {
      this.members.addWithIndex(internalModel, idx);
      this.notifyRecordRelationshipAdded(internalModel, idx);
      if (this.inverseKey) {
        internalModel._relationships.get(this.inverseKey).addInternalModel(this.internalModel);
      } else {
        if (!internalModel._implicitRelationships[this.inverseKeyForImplicit]) {
          internalModel._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, internalModel, this.key,  { options: {} });
        }
        internalModel._implicitRelationships[this.inverseKeyForImplicit].addInternalModel(this.internalModel);
      }
      this.internalModel.updateRecordArrays();
    }
    this.setHasData(true);
  }

  removeInternalModel(internalModel) {
    heimdall.increment(removeInternalModel);
    if (this.members.has(internalModel)) {
      this.removeInternalModelFromOwn(internalModel);
      if (this.inverseKey) {
        this.removeInternalModelFromInverse(internalModel);
      } else {
        if (internalModel._implicitRelationships[this.inverseKeyForImplicit]) {
          internalModel._implicitRelationships[this.inverseKeyForImplicit].removeInternalModel(this.internalModel);
        }
      }
    }
  }

  removeInternalModelFromInverse(internalModel) {
    heimdall.increment(removeInternalModelFromInverse);
    let inverseRelationship = internalModel._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeInternalModelFromOwn(this.internalModel);
    }
  }

  removeInternalModelFromOwn(internalModel) {
    heimdall.increment(removeInternalModelFromOwn);
    this.members.delete(internalModel);
    this.notifyRecordRelationshipRemoved(internalModel);
    this.internalModel.updateRecordArrays();
  }

  removeCanonicalInternalModelFromInverse(internalModel) {
    heimdall.increment(removeCanonicalInternalModelFromInverse);
    let inverseRelationship = internalModel._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeCanonicalInternalModelFromOwn(this.internalModel);
    }
  }

  removeCanonicalInternalModelFromOwn(internalModel) {
    heimdall.increment(removeCanonicalInternalModelFromOwn);
    this.canonicalMembers.delete(internalModel);
    this.flushCanonicalLater();
  }

  flushCanonical() {
    heimdall.increment(flushCanonical);
    let list = this.members.list;
    this.willSync = false;
    //a hack for not removing new internalModels
    //TODO remove once we have proper diffing
    let newInternalModels = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].isNew()) {
        newInternalModels.push(list[i]);
      }
    }

    //TODO(Igor) make this less abysmally slow
    this.members = this.canonicalMembers.copy();
    for (let i = 0; i < newInternalModels.length; i++) {
      this.members.add(newInternalModels[i]);
    }
  }

  flushCanonicalLater() {
    heimdall.increment(flushCanonicalLater);
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    this.store._updateRelationshipState(this);
  }

  updateLink(link) {
    heimdall.increment(updateLink);
    warn(`You pushed a record of type '${this.internalModel.modelName}' with a relationship '${this.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`, this.isAsync || this.hasData , {
      id: 'ds.store.push-link-for-sync-relationship'
    });
    assert(`You have pushed a record of type '${this.internalModel.modelName}' with '${this.key}' as a link, but the value of that link is not a string.`, typeof link === 'string' || link === null);

    this.link = link;
    this.linkPromise = null;
    this.internalModel.notifyPropertyChange(this.key);
  }

  findLink() {
    heimdall.increment(findLink);
    if (this.linkPromise) {
      return this.linkPromise;
    } else {
      let promise = this.fetchLink();
      this.linkPromise = promise;
      return promise.then((result) => result);
    }
  }

  updateInternalModelsFromAdapter(internalModels) {
    heimdall.increment(updateInternalModelsFromAdapter);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(internalModels);
  }

  notifyRecordRelationshipAdded() { }
  notifyRecordRelationshipRemoved() { }

  /*
   `hasData` for a relationship is a flag to indicate if we consider the
   content of this relationship "known". Snapshots uses this to tell the
   difference between unknown (`undefined`) or empty (`null`). The reason for
   this is that we wouldn't want to serialize unknown relationships as `null`
   as that might overwrite remote state.

   All relationships for a newly created (`store.createRecord()`) are
   considered known (`hasData === true`).
   */
  setHasData(value) {
    heimdall.increment(setHasData);
    this.hasData = value;
  }

  /*
   `hasLoaded` is a flag to indicate if we have gotten data from the adapter or
   not when the relationship has a link.

   This is used to be able to tell when to fetch the link and when to return
   the local data in scenarios where the local state is considered known
   (`hasData === true`).

   Updating the link will automatically set `hasLoaded` to `false`.
   */
  setHasLoaded(value) {
    heimdall.increment(setHasLoaded);
    this.hasLoaded = value;
  }

  /*
   `push` for a relationship allows the store to push a JSON API Relationship
   Object onto the relationship. The relationship will then extract and set the
   meta, data and links of that relationship.

   `push` use `updateMeta`, `updateData` and `updateLink` to update the state
   of the relationship.
   */
  push(payload, initial) {
    heimdall.increment(push);

    let hasData = false;
    let hasLink = false;

    if (payload.meta) {
      this.updateMeta(payload.meta);
    }

    if (payload.data !== undefined) {
      hasData = true;
      this.updateData(payload.data, initial);
    }

    if (payload.links && payload.links.related) {
      let relatedLink = _normalizeLink(payload.links.related);
      if (relatedLink && relatedLink.href && relatedLink.href !== this.link) {
        hasLink = true;
        this.updateLink(relatedLink.href, initial);
      }
    }

    /*
     Data being pushed into the relationship might contain only data or links,
     or a combination of both.

     If we got data we want to set both hasData and hasLoaded to true since
     this would indicate that we should prefer the local state instead of
     trying to fetch the link or call findRecord().

     If we have no data but a link is present we want to set hasLoaded to false
     without modifying the hasData flag. This will ensure we fetch the updated
     link next time the relationship is accessed.
     */
    if (hasData) {
      this.setHasData(true);
      this.setHasLoaded(true);
    } else if (hasLink) {
      this.setHasLoaded(false);
    }
  }

  updateData() {}
}

const {
  get: get$7
} = Ember;

const {
  __bind,
  __guard,
  __objectIsAlive
} = heimdall.registerMonitor('system.store.common',
  '_bind',
  '_guard',
  '_objectIsAlive'
);

function _bind(fn, ...args) {
  heimdall.increment(__bind);

  return function() {
    return fn.apply(undefined, args);
  };
}

function _guard(promise, test) {
  heimdall.increment(__guard);
  let guarded = promise['finally'](function() {
    if (!test()) {
      guarded._subscribers.length = 0;
    }
  });

  return guarded;
}

function _objectIsAlive(object) {
  heimdall.increment(__objectIsAlive);
  return !(get$7(object, "isDestroyed") || get$7(object, "isDestroying"));
}

/**
  @namespace
  @method diff-array
  @for DS
  @param {Array} oldArray the old array
  @param {Array} newArray the new array
  @return {hash} {
      firstChangeIndex: <integer>,  // null if no change
      addedCount: <integer>,        // 0 if no change
      removedCount: <integer>       // 0 if no change
    }
*/
function diffArray(oldArray, newArray) {
  const oldLength = oldArray.length;
  const newLength = newArray.length;

  const shortestLength = Math.min(oldLength, newLength);
  let firstChangeIndex = null; // null signifies no changes

  // find the first change
  for (let i=0; i<shortestLength; i++) {
    // compare each item in the array
    if (oldArray[i] !== newArray[i]) {
      firstChangeIndex = i;
      break;
    }
  }

  if (firstChangeIndex === null && newLength !== oldLength) {
    // no change found in the overlapping block
    // and array lengths differ,
    // so change starts at end of overlap
    firstChangeIndex = shortestLength;
  }

  let addedCount = 0;
  let removedCount = 0;
  if (firstChangeIndex !== null) {
    // we found a change, find the end of the change
    let unchangedEndBlockLength = shortestLength - firstChangeIndex;
    // walk back from the end of both arrays until we find a change
    for (let i=1; i<=shortestLength; i++) {
      // compare each item in the array
      if (oldArray[oldLength-i] !== newArray[newLength-i]) {
        unchangedEndBlockLength = i-1;
        break;
      }
    }
    addedCount = newLength - unchangedEndBlockLength - firstChangeIndex;
    removedCount = oldLength - unchangedEndBlockLength - firstChangeIndex;
  }

  return {
    firstChangeIndex,
    addedCount,
    removedCount
  };
}

/**
  @module ember-data
*/
const { get: get$6 } = Ember;

/**
  A `ManyArray` is a `MutableArray` that represents the contents of a has-many
  relationship.

  The `ManyArray` is instantiated lazily the first time the relationship is
  requested.

  ### Inverses

  Often, the relationships in Ember Data applications will have
  an inverse. For example, imagine the following models are
  defined:

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    comments: DS.hasMany('comment')
  });
  ```

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  If you created a new instance of `App.Post` and added
  a `App.Comment` record to its `comments` has-many
  relationship, you would expect the comment's `post`
  property to be set to the post that contained
  the has-many.

  We call the record to which a relationship belongs the
  relationship's _owner_.

  @class ManyArray
  @namespace DS
  @extends Ember.Object
  @uses Ember.MutableArray, Ember.Evented
*/
var ManyArray = Ember.Object.extend(Ember.MutableArray, Ember.Evented, {
  init() {
    this._super(...arguments);

    /**
    The loading state of this array

    @property {Boolean} isLoaded
    */
    this.isLoaded = false;
    this.length = 0;

    /**
    Used for async `hasMany` arrays
    to keep track of when they will resolve.

    @property {Ember.RSVP.Promise} promise
    @private
    */
    this.promise = null;

    /**
    Metadata associated with the request for async hasMany relationships.

    Example

    Given that the server returns the following JSON payload when fetching a
    hasMany relationship:

    ```js
    {
      "comments": [{
        "id": 1,
        "comment": "This is the first comment",
      }, {
    // ...
      }],

      "meta": {
        "page": 1,
        "total": 5
      }
    }
    ```

    You can then access the metadata via the `meta` property:

    ```js
    post.get('comments').then(function(comments) {
      var meta = comments.get('meta');

    // meta.page => 1
    // meta.total => 5
    });
    ```

    @property {Object} meta
    @public
    */
    this.meta = this.meta ||  null;

    /**
    `true` if the relationship is polymorphic, `false` otherwise.

    @property {Boolean} isPolymorphic
    @private
    */
    this.isPolymorphic = this.isPolymorphic || false;

    /**
    The relationship which manages this array.

    @property {ManyRelationship} relationship
    @private
    */
    this.relationship = this.relationship || null;

    this.currentState = [];
    this.flushCanonical(false);
  },

  objectAt(index) {
    let internalModel = this.currentState[index];
    if (internalModel === undefined) { return; }

    return internalModel.getRecord();
  },

  flushCanonical(isInitialized = true) {
    // It’s possible the parent side of the relationship may have been unloaded by this point
    if (!_objectIsAlive(this)) {
      return;
    }
    let toSet = this.canonicalState;

    //a hack for not removing new records
    //TODO remove once we have proper diffing
    let newInternalModels = this.currentState.filter(
      // only add new internalModels which are not yet in the canonical state of this
      // relationship (a new internalModel can be in the canonical state if it has
      // been 'acknowleged' to be in the relationship via a store.push)
      (internalModel) => internalModel.isNew() && toSet.indexOf(internalModel) === -1
    );
    toSet = toSet.concat(newInternalModels);

    // diff to find changes
    let diff = diffArray(this.currentState, toSet);

    if (diff.firstChangeIndex !== null) { // it's null if no change found
      // we found a change
      this.arrayContentWillChange(diff.firstChangeIndex, diff.removedCount, diff.addedCount);
      this.set('length', toSet.length);
      this.currentState = toSet;
      this.arrayContentDidChange(diff.firstChangeIndex, diff.removedCount, diff.addedCount);
      if (isInitialized && diff.addedCount > 0) {
        //notify only on additions
        //TODO only notify if unloaded
        this.relationship.notifyHasManyChanged();
      }
    }
  },

  internalReplace(idx, amt, objects) {
    if (!objects) {
      objects = [];
    }
    this.arrayContentWillChange(idx, amt, objects.length);
    this.currentState.splice.apply(this.currentState, [idx, amt].concat(objects));
    this.set('length', this.currentState.length);
    this.arrayContentDidChange(idx, amt, objects.length);
  },

  //TODO(Igor) optimize
  _removeInternalModels(internalModels) {
    for (let i=0; i < internalModels.length; i++) {
      let index = this.currentState.indexOf(internalModels[i]);
      this.internalReplace(index, 1);
    }
  },

  //TODO(Igor) optimize
  _addInternalModels(internalModels, idx) {
    if (idx === undefined) {
      idx = this.currentState.length;
    }
    this.internalReplace(idx, 0, internalModels);
  },

  replace(idx, amt, objects) {
    let internalModels;
    if (amt > 0) {
      internalModels = this.currentState.slice(idx, idx+amt);
      this.get('relationship').removeInternalModels(internalModels);
    }
    if (objects) {
      this.get('relationship').addInternalModels(objects.map(obj => obj._internalModel), idx);
    }
  },

  /**
    Reloads all of the records in the manyArray. If the manyArray
    holds a relationship that was originally fetched using a links url
    Ember Data will revisit the original links url to repopulate the
    relationship.

    If the manyArray holds the result of a `store.query()` reload will
    re-run the original query.

    Example

    ```javascript
    var user = store.peekRecord('user', 1)
    user.login().then(function() {
      user.get('permissions').then(function(permissions) {
        return permissions.reload();
      });
    });
    ```

    @method reload
    @public
  */
  reload() {
    return this.relationship.reload();
  },

  /**
    Saves all of the records in the `ManyArray`.

    Example

    ```javascript
    store.findRecord('inbox', 1).then(function(inbox) {
      inbox.get('messages').then(function(messages) {
        messages.forEach(function(message) {
          message.set('isRead', true);
        });
        messages.save()
      });
    });
    ```

    @method save
    @return {DS.PromiseArray} promise
  */
  save() {
    let manyArray = this;
    let promiseLabel = 'DS: ManyArray#save ' + get$6(this, 'type');
    let promise = Ember.RSVP.all(this.invoke("save"), promiseLabel).
      then(() => manyArray, null, 'DS: ManyArray#save return ManyArray');

    return PromiseArray.create({ promise });
  },

  /**
    Create a child record within the owner

    @method createRecord
    @private
    @param {Object} hash
    @return {DS.Model} record
  */
  createRecord(hash) {
    const store = get$6(this, 'store');
    const type = get$6(this, 'type');

    assert(`You cannot add '${type.modelName}' records to this polymorphic relationship.`, !get$6(this, 'isPolymorphic'));
    let record = store.createRecord(type.modelName, hash);
    this.pushObject(record);

    return record;
  }
});

class ManyRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.belongsToType = relationshipMeta.type;
    this.canonicalState = [];
    this.isPolymorphic = relationshipMeta.options.polymorphic;
    this._manyArray = null;
    this.__loadingPromise = null;
  }

  get _loadingPromise() { return this.__loadingPromise; }
  _updateLoadingPromise(promise, content) {
    if (this.__loadingPromise) {
      if (content) {
        this.__loadingPromise.set('content', content);
      }
      this.__loadingPromise.set('promise', promise);
    } else {
      this.__loadingPromise = new PromiseManyArray({
        promise,
        content
      });
    }

    return this.__loadingPromise;
  }

  get manyArray() {
    if (!this._manyArray) {
      this._manyArray = ManyArray.create({
        canonicalState: this.canonicalState,
        store: this.store,
        relationship: this,
        type: this.store.modelFor(this.belongsToType),
        record: this.internalModel,
        meta: this.meta,
        isPolymorphic: this.isPolymorphic
      });
    }
    return this._manyArray;
  }

  removeInverseRelationships() {
    super.removeInverseRelationships();
    if (this._manyArray) {
      this._manyArray.destroy();
      this._manyArray = null;
    }

    if (this._loadingPromise) {
      this._loadingPromise.destroy();
    }
  }

  updateMeta(meta) {
    super.updateMeta(meta);
    if (this._manyArray) {
      this._manyArray.set('meta', meta);
    }
  }

  addCanonicalInternalModel(internalModel, idx) {
    if (this.canonicalMembers.has(internalModel)) {
      return;
    }
    if (idx !== undefined) {
      this.canonicalState.splice(idx, 0, internalModel);
    } else {
      this.canonicalState.push(internalModel);
    }
    super.addCanonicalInternalModel(internalModel, idx);
  }

  inverseDidDematerialize() {
    if (this._manyArray) {
      this._manyArray.destroy();
      this._manyArray = null;
    }
    this.notifyHasManyChanged();
  }

  addInternalModel(internalModel, idx) {
    if (this.members.has(internalModel)) {
      return;
    }

    assertPolymorphicType(this.internalModel, this.relationshipMeta, internalModel);
    super.addInternalModel(internalModel, idx);
    // make lazy later
    this.manyArray._addInternalModels([internalModel], idx);
  }

  removeCanonicalInternalModelFromOwn(internalModel, idx) {
    let i = idx;
    if (!this.canonicalMembers.has(internalModel)) {
      return;
    }
    if (i === undefined) {
      i = this.canonicalState.indexOf(internalModel);
    }
    if (i > -1) {
      this.canonicalState.splice(i, 1);
    }
    super.removeCanonicalInternalModelFromOwn(internalModel, idx);
  }

  flushCanonical() {
    if (this._manyArray) {
      this._manyArray.flushCanonical();
    }
    super.flushCanonical();
  }

  removeInternalModelFromOwn(internalModel, idx) {
    if (!this.members.has(internalModel)) {
      return;
    }
    super.removeInternalModelFromOwn(internalModel, idx);
    let manyArray = this.manyArray;
    if (idx !== undefined) {
      //TODO(Igor) not used currently, fix
      manyArray.currentState.removeAt(idx);
    } else {
      manyArray._removeInternalModels([internalModel]);
    }
  }

  notifyRecordRelationshipAdded(internalModel, idx) {
    this.internalModel.notifyHasManyAdded(this.key, internalModel, idx);
  }

  reload() {
    let manyArray = this.manyArray;
    let manyArrayLoadedState = manyArray.get('isLoaded');

    if (this._loadingPromise) {
      if (this._loadingPromise.get('isPending')) {
        return this._loadingPromise;
      }
      if (this._loadingPromise.get('isRejected')) {
        manyArray.set('isLoaded', manyArrayLoadedState);
      }
    }

    let promise;
    if (this.link) {
      promise = this.fetchLink();
    } else {
      promise = this.store._scheduleFetchMany(manyArray.currentState).then(() => manyArray);
    }

    this._updateLoadingPromise(promise);
    return this._loadingPromise;
  }

  computeChanges(internalModels = []) {
    let members = this.canonicalMembers;
    let internalModelsToRemove = [];
    let internalModelSet = setForArray(internalModels);

    members.forEach(member => {
      if (internalModelSet.has(member)) { return; }

      internalModelsToRemove.push(member);
    });

    this.removeCanonicalInternalModels(internalModelsToRemove);

    for (let i = 0, l = internalModels.length; i < l; i++) {
      let internalModel = internalModels[i];
      this.removeCanonicalInternalModel(internalModel);
      this.addCanonicalInternalModel(internalModel, i);
    }
  }

  setInitialInternalModels(internalModels) {
    if (!internalModels) {
      return;
    }

    let args = [0, this.canonicalState.length].concat(internalModels);
    this.canonicalState.splice.apply(this.canonicalState, args);
    internalModels.forEach(internalModel => {
      this.canonicalMembers.add(internalModel);
      this.members.add(internalModel);
      this.setupInverseRelationship(internalModel);
    });
  }

  fetchLink() {
    return this.store.findHasMany(this.internalModel, this.link, this.relationshipMeta).then(records => {
      if (records.hasOwnProperty('meta')) {
        this.updateMeta(records.meta);
      }
      this.store._backburner.join(() => {
        this.updateInternalModelsFromAdapter(records);
        this.manyArray.set('isLoaded', true);
      });
      return this.manyArray;
    });
  }

  findRecords() {
    let manyArray = this.manyArray;
    let internalModels = manyArray.currentState;

    //TODO CLEANUP
    return this.store.findMany(internalModels).then(() => {
      if (!manyArray.get('isDestroyed')) {
        //Goes away after the manyArray refactor
        manyArray.set('isLoaded', true);
      }
      return manyArray;
    });
  }

  notifyHasManyChanged() {
    this.internalModel.notifyHasManyAdded(this.key);
  }

  getRecords() {
    //TODO(Igor) sync server here, once our syncing is not stupid
    let manyArray = this.manyArray;
    if (this.isAsync) {
      let promise;
      if (this.link) {
        if (this.hasLoaded) {
          promise = this.findRecords();
        } else {
          promise = this.findLink().then(() => this.findRecords());
        }
      } else {
        promise = this.findRecords();
      }
      return this._updateLoadingPromise(promise, manyArray);
    } else {
      assert(`You looked up the '${this.key}' relationship on a '${this.internalModel.type.modelName}' with id ${this.internalModel.id} but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async ('DS.hasMany({ async: true })')`, manyArray.isEvery('isEmpty', false));

      //TODO(Igor) WTF DO I DO HERE?
      // TODO @runspired equal WTFs to Igor
      if (!manyArray.get('isDestroyed')) {
        manyArray.set('isLoaded', true);
      }
      return manyArray;
    }
  }

  updateData(data, initial) {
    let internalModels = this.store._pushResourceIdentifiers(this, data);
    if (initial) {
      this.setInitialInternalModels(internalModels);
    } else {
      this.updateInternalModelsFromAdapter(internalModels);
    }
  }
}

function setForArray(array) {
  var set = new OrderedSet();

  if (array) {
    for (var i=0, l=array.length; i<l; i++) {
      set.add(array[i]);
    }
  }

  return set;
}

class BelongsToRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.internalModel = internalModel;
    this.key = relationshipMeta.key;
    this.inverseInternalModel = null;
    this.canonicalState = null;
  }

  setInternalModel(internalModel) {
    if (internalModel) {
      this.addInternalModel(internalModel);
    } else if (this.inverseInternalModel) {
      this.removeInternalModel(this.inverseInternalModel);
    }
    this.setHasData(true);
    this.setHasLoaded(true);
  }

  setCanonicalInternalModel(internalModel) {
    if (internalModel) {
      this.addCanonicalInternalModel(internalModel);
    } else if (this.canonicalState) {
      this.removeCanonicalInternalModel(this.canonicalState);
    }
    this.flushCanonicalLater();
  }

  setInitialCanonicalInternalModel(internalModel) {
    if (!internalModel) { return; }

    // When we initialize a belongsTo relationship, we want to avoid work like
    // notifying our internalModel that we've "changed" and excessive thrash on
    // setting up inverse relationships
    this.canonicalMembers.add(internalModel);
    this.members.add(internalModel);
    this.inverseInternalModel = this.canonicalState = internalModel;
    this.setupInverseRelationship(internalModel);
  }

  addCanonicalInternalModel(internalModel) {
    if (this.canonicalMembers.has(internalModel)) { return;}

    if (this.canonicalState) {
      this.removeCanonicalInternalModel(this.canonicalState);
    }

    this.canonicalState = internalModel;
    super.addCanonicalInternalModel(internalModel);
  }

  inverseDidDematerialize() {
    this.notifyBelongsToChanged();
  }

  flushCanonical() {
    //temporary fix to not remove newly created records if server returned null.
    //TODO remove once we have proper diffing
    if (this.inverseInternalModel && this.inverseInternalModel.isNew() && !this.canonicalState) {
      return;
    }
    if (this.inverseInternalModel !== this.canonicalState) {
      this.inverseInternalModel = this.canonicalState;
      this.notifyBelongsToChanged();
    }

    super.flushCanonical();
  }

  addInternalModel(internalModel) {
    if (this.members.has(internalModel)) { return; }

    assertPolymorphicType(this.internalModel, this.relationshipMeta, internalModel);

    if (this.inverseInternalModel) {
      this.removeInternalModel(this.inverseInternalModel);
    }

    this.inverseInternalModel = internalModel;
    super.addInternalModel(internalModel);
    this.notifyBelongsToChanged();
  }

  setRecordPromise(newPromise) {
    let content = newPromise.get && newPromise.get('content');
    assert("You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.", content !== undefined);
    this.setInternalModel(content ? content._internalModel : content);
  }

  removeInternalModelFromOwn(internalModel) {
    if (!this.members.has(internalModel)) { return;}
    this.inverseInternalModel = null;
    super.removeInternalModelFromOwn(internalModel);
    this.notifyBelongsToChanged();
  }

  notifyBelongsToChanged() {
    this.internalModel.notifyBelongsToChanged(this.key);
  }

  removeCanonicalInternalModelFromOwn(internalModel) {
    if (!this.canonicalMembers.has(internalModel)) { return;}
    this.canonicalState = null;
    super.removeCanonicalInternalModelFromOwn(internalModel);
  }

  findRecord() {
    if (this.inverseInternalModel) {
      return this.store._findByInternalModel(this.inverseInternalModel);
    } else {
      return Ember.RSVP.Promise.resolve(null);
    }
  }

  fetchLink() {
    return this.store.findBelongsTo(this.internalModel, this.link, this.relationshipMeta).then((internalModel) => {
      if (internalModel) {
        this.addInternalModel(internalModel);
      }
      return internalModel;
    });
  }

  getRecord() {
    //TODO(Igor) flushCanonical here once our syncing is not stupid
    if (this.isAsync) {
      let promise;
      if (this.link) {
        if (this.hasLoaded) {
          promise = this.findRecord();
        } else {
          promise = this.findLink().then(() => this.findRecord());
        }
      } else {
        promise = this.findRecord();
      }

      return PromiseObject.create({
        promise: promise,
        content: this.inverseInternalModel ? this.inverseInternalModel.getRecord() : null
      });
    } else {
      if (this.inverseInternalModel === null) {
        return null;
      }
      let toReturn = this.inverseInternalModel.getRecord();
      assert("You looked up the '" + this.key + "' relationship on a '" + this.internalModel.modelName + "' with id " + this.internalModel.id +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)", toReturn === null || !toReturn.get('isEmpty'));
      return toReturn;
    }
  }

  reload() {
    // TODO handle case when reload() is triggered multiple times

    if (this.link) {
      return this.fetchLink();
    }

    // reload record, if it is already loaded
    if (this.inverseInternalModel && this.inverseInternalModel.hasRecord) {
      return this.inverseInternalModel.getRecord().reload();
    }

    return this.findRecord();
  }

  updateData(data, initial) {
    assert(`Ember Data expected the data for the ${this.key} relationship on a ${this.internalModel.toString()} to be in a JSON API format and include an \`id\` and \`type\` property but it found ${Ember.inspect(data)}. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`, data === null || data.id !== undefined && data.type !== undefined);
    let internalModel = this.store._pushResourceIdentifier(this, data);
    if (initial) {
      this.setInitialCanonicalInternalModel(internalModel);
    } else {
      this.setCanonicalInternalModel(internalModel);
    }
  }
}

const { get: get$5 } = Ember;

function shouldFindInverse(relationshipMeta) {
  let options = relationshipMeta.options;
  return !(options && options.inverse === null);
}

function createRelationshipFor(internalModel, relationshipMeta, store) {
  let inverseKey;
  let inverse = null;

  if (shouldFindInverse(relationshipMeta)) {
    inverse = internalModel.type.inverseFor(relationshipMeta.key, store);
  } else {
    runInDebug(() => {
      internalModel.type.typeForRelationship(relationshipMeta.key, store);
    });
  }

  if (inverse) {
    inverseKey = inverse.name;
  }

  if (relationshipMeta.kind === 'hasMany') {
    return new ManyRelationship(store, internalModel, inverseKey, relationshipMeta);
  } else {
    return new BelongsToRelationship(store, internalModel, inverseKey, relationshipMeta);
  }
}

class Relationships {
  constructor(internalModel) {
    this.internalModel = internalModel;
    this.initializedRelationships = Object.create(null);
  }

  // TODO @runspired deprecate this as it was never truly a record instance
  get record() {
    return this.internalModel;
  }

  has(key) {
    return !!this.initializedRelationships[key];
  }

  get(key) {
    let relationships = this.initializedRelationships;
    let relationship = relationships[key];
    let internalModel = this.internalModel;

    if (!relationship) {
      let relationshipsByName = get$5(internalModel.type, 'relationshipsByName');
      let rel = relationshipsByName.get(key);

      if (!rel) { return undefined; }

      let relationshipPayload = internalModel.store._relationshipsPayloads.get(internalModel.modelName, internalModel.id, key);

      relationship = relationships[key] = createRelationshipFor(internalModel, rel, internalModel.store);

      if (relationshipPayload) {
        relationship.push(relationshipPayload, true);
      }
    }

    return relationship;
  }
}

/**
  @module ember-data
*/

const {
  get: get$8
} = Ember;

/**
  @class Snapshot
  @namespace DS
  @private
  @constructor
  @param {DS.Model} internalModel The model to create a snapshot from
*/
class Snapshot {
  constructor(internalModel, options = {}) {
    this._attributes = Object.create(null);
    this._belongsToRelationships = Object.create(null);
    this._belongsToIds = Object.create(null);
    this._hasManyRelationships = Object.create(null);
    this._hasManyIds = Object.create(null);
    this._internalModel = internalModel;

    let record = internalModel.getRecord();

    /**
     The underlying record for this snapshot. Can be used to access methods and
     properties defined on the record.

     Example

     ```javascript
     let json = snapshot.record.toJSON();
     ```

     @property record
     @type {DS.Model}
     */
    this.record = record;
    record.eachAttribute((keyName) => this._attributes[keyName] = get$8(record, keyName));

    /**
     The id of the snapshot's underlying record

     Example

     ```javascript
     // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
     postSnapshot.id; // => '1'
     ```

     @property id
     @type {String}
     */
    this.id = internalModel.id;

    /**
     A hash of adapter options
     @property adapterOptions
     @type {Object}
     */
    this.adapterOptions = options.adapterOptions;
    this.include = options.include;

    /**
     The name of the type of the underlying record for this snapshot, as a string.

     @property modelName
     @type {String}
     */
    this.modelName = internalModel.modelName;

    this._changedAttributes = record.changedAttributes();
  }

  /**
   The type of the underlying record for this snapshot, as a DS.Model.

   @property type
   @type {DS.Model}
   */
  get type() {
    // TODO @runspired we should deprecate this in favor of modelClass but only once
    // we've cleaned up the internals enough that a public change to follow suite is
    // uncontroversial.
    return this._internalModel.modelClass;
  }

  /**
   Returns the value of an attribute.

   Example

   ```javascript
   // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
   postSnapshot.attr('author'); // => 'Tomster'
   postSnapshot.attr('title'); // => 'Ember.js rocks'
   ```

   Note: Values are loaded eagerly and cached when the snapshot is created.

   @method attr
   @param {String} keyName
   @return {Object} The attribute value or undefined
   */
  attr(keyName) {
    if (keyName in this._attributes) {
      return this._attributes[keyName];
    }
    throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no attribute named '" + keyName + "' defined.");
  }

  /**
   Returns all attributes and their corresponding values.

   Example

   ```javascript
   // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
   postSnapshot.attributes(); // => { author: 'Tomster', title: 'Ember.js rocks' }
   ```

   @method attributes
   @return {Object} All attributes of the current snapshot
   */
  attributes() {
    return Ember.copy(this._attributes);
  }

  /**
   Returns all changed attributes and their old and new values.

   Example

   ```javascript
   // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
   postModel.set('title', 'Ember.js rocks!');
   postSnapshot.changedAttributes(); // => { title: ['Ember.js rocks', 'Ember.js rocks!'] }
   ```

   @method changedAttributes
   @return {Object} All changed attributes of the current snapshot
   */
  changedAttributes() {
    let changedAttributes = Object.create(null);
    let changedAttributeKeys = Object.keys(this._changedAttributes);

    for (let i=0, length = changedAttributeKeys.length; i < length; i++) {
      let key = changedAttributeKeys[i];
      changedAttributes[key] = Ember.copy(this._changedAttributes[key]);
    }

    return changedAttributes;
  }

  /**
   Returns the current value of a belongsTo relationship.

   `belongsTo` takes an optional hash of options as a second parameter,
   currently supported options are:

   - `id`: set to `true` if you only want the ID of the related record to be
   returned.

   Example

   ```javascript
   // store.push('post', { id: 1, title: 'Hello World' });
   // store.createRecord('comment', { body: 'Lorem ipsum', post: post });
   commentSnapshot.belongsTo('post'); // => DS.Snapshot
   commentSnapshot.belongsTo('post', { id: true }); // => '1'

   // store.push('comment', { id: 1, body: 'Lorem ipsum' });
   commentSnapshot.belongsTo('post'); // => undefined
   ```

   Calling `belongsTo` will return a new Snapshot as long as there's any known
   data for the relationship available, such as an ID. If the relationship is
   known but unset, `belongsTo` will return `null`. If the contents of the
   relationship is unknown `belongsTo` will return `undefined`.

   Note: Relationships are loaded lazily and cached upon first access.

   @method belongsTo
   @param {String} keyName
   @param {Object} [options]
   @return {(DS.Snapshot|String|null|undefined)} A snapshot or ID of a known
   relationship or null if the relationship is known but unset. undefined
   will be returned if the contents of the relationship is unknown.
   */
  belongsTo(keyName, options) {
    let id = options && options.id;
    let relationship, inverseInternalModel, hasData;
    let result;

    if (id && keyName in this._belongsToIds) {
      return this._belongsToIds[keyName];
    }

    if (!id && keyName in this._belongsToRelationships) {
      return this._belongsToRelationships[keyName];
    }

    relationship = this._internalModel._relationships.get(keyName);
    if (!(relationship && relationship.relationshipMeta.kind === 'belongsTo')) {
      throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no belongsTo relationship named '" + keyName + "' defined.");
    }

    hasData = get$8(relationship, 'hasData');
    inverseInternalModel = get$8(relationship, 'inverseInternalModel');

    if (hasData) {
      if (inverseInternalModel && !inverseInternalModel.isDeleted()) {
        if (id) {
          result = get$8(inverseInternalModel, 'id');
        } else {
          result = inverseInternalModel.createSnapshot();
        }
      } else {
        result = null;
      }
    }

    if (id) {
      this._belongsToIds[keyName] = result;
    } else {
      this._belongsToRelationships[keyName] = result;
    }

    return result;
  }

  /**
   Returns the current value of a hasMany relationship.

   `hasMany` takes an optional hash of options as a second parameter,
   currently supported options are:

   - `ids`: set to `true` if you only want the IDs of the related records to be
   returned.

   Example

   ```javascript
   // store.push('post', { id: 1, title: 'Hello World', comments: [2, 3] });
   postSnapshot.hasMany('comments'); // => [DS.Snapshot, DS.Snapshot]
   postSnapshot.hasMany('comments', { ids: true }); // => ['2', '3']

   // store.push('post', { id: 1, title: 'Hello World' });
   postSnapshot.hasMany('comments'); // => undefined
   ```

   Note: Relationships are loaded lazily and cached upon first access.

   @method hasMany
   @param {String} keyName
   @param {Object} [options]
   @return {(Array|undefined)} An array of snapshots or IDs of a known
   relationship or an empty array if the relationship is known but unset.
   undefined will be returned if the contents of the relationship is unknown.
   */
  hasMany(keyName, options) {
    let ids = options && options.ids;
    let relationship, members, hasData;
    let results;

    if (ids && keyName in this._hasManyIds) {
      return this._hasManyIds[keyName];
    }

    if (!ids && keyName in this._hasManyRelationships) {
      return this._hasManyRelationships[keyName];
    }

    relationship = this._internalModel._relationships.get(keyName);
    if (!(relationship && relationship.relationshipMeta.kind === 'hasMany')) {
      throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no hasMany relationship named '" + keyName + "' defined.");
    }

    hasData = get$8(relationship, 'hasData');
    members = get$8(relationship, 'members');

    if (hasData) {
      results = [];
      members.forEach((member) => {
        if (!member.isDeleted()) {
          if (ids) {
            results.push(member.id);
          } else {
            results.push(member.createSnapshot());
          }
        }
      });
    }

    if (ids) {
      this._hasManyIds[keyName] = results;
    } else {
      this._hasManyRelationships[keyName] = results;
    }

    return results;
  }

  /**
    Iterates through all the attributes of the model, calling the passed
    function on each attribute.

    Example

    ```javascript
    snapshot.eachAttribute(function(name, meta) {
      // ...
    });
    ```

    @method eachAttribute
    @param {Function} callback the callback to execute
    @param {Object} [binding] the value to which the callback's `this` should be bound
  */
  eachAttribute(callback, binding) {
    this.record.eachAttribute(callback, binding);
  }

  /**
    Iterates through all the relationships of the model, calling the passed
    function on each relationship.

    Example

    ```javascript
    snapshot.eachRelationship(function(name, relationship) {
      // ...
    });
    ```

    @method eachRelationship
    @param {Function} callback the callback to execute
    @param {Object} [binding] the value to which the callback's `this` should be bound
  */
  eachRelationship(callback, binding) {
    this.record.eachRelationship(callback, binding);
  }

  /**
    Serializes the snapshot using the serializer for the model.

    Example

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      createRecord(store, type, snapshot) {
        var data = snapshot.serialize({ includeId: true });
        var url = `/${type.modelName}`;

        return fetch(url, {
          method: 'POST',
          body: data,
        }).then((response) => response.json())
      }
    });
    ```

    @method serialize
    @param {Object} options
    @return {Object} an object whose values are primitive JSON values only
   */
  serialize(options) {
    return this.record.store.serializerFor(this.modelName).serialize(this, options);
  }
}

const get$9 = Ember.get;

/*
  Check if the passed model has a `type` attribute or a relationship named `type`.

  @method modelHasAttributeOrRelationshipNamedType
  @param modelClass
 */
function modelHasAttributeOrRelationshipNamedType(modelClass) {
  return get$9(modelClass, 'attributes').has('type') || get$9(modelClass, 'relationshipsByName').has('type');
}

/*
  ember-container-inject-owner is a new feature in Ember 2.3 that finally provides a public
  API for looking items up.  This function serves as a super simple polyfill to avoid
  triggering deprecations.
 */
function getOwner(context) {
  let owner;

  if (Ember.getOwner) {
    owner = Ember.getOwner(context);
  } else if (context.container) {
    owner = context.container;
  }

  if (owner && owner.lookupFactory && !owner._lookupFactory) {
    // `owner` is a container, we are just making this work
    owner._lookupFactory = owner.lookupFactory;
    owner.register = function() {
      let registry = owner.registry || owner._registry || owner;

      return registry.register(...arguments);
    };
  }

  return owner;
}

var Reference = function(store, internalModel) {
  this.store = store;
  this.internalModel = internalModel;
};

Reference.prototype = {
  constructor: Reference
};

/**
   An RecordReference is a low level API that allows users and
   addon author to perform meta-operations on a record.

   @class RecordReference
   @namespace DS
*/
const RecordReference = function(store, internalModel) {
  this._super$constructor(store, internalModel);
  this.type = internalModel.modelName;
  this._id = internalModel.id;
};

RecordReference.prototype = Object.create(Reference.prototype);
RecordReference.prototype.constructor = RecordReference;
RecordReference.prototype._super$constructor = Reference;

/**
   The `id` of the record that this reference refers to.

   Together, the `type` and `id` properties form a composite key for
   the identity map.

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   userRef.id(); // '1'
   ```

   @method id
   @return {String} The id of the record.
*/
RecordReference.prototype.id = function() {
  return this._id;
};

/**
   How the reference will be looked up when it is loaded: Currently
   this always return `identity` to signifying that a record will be
   loaded by the `type` and `id`.

   Example

   ```javascript
   const userRef = store.getReference('user', 1);

   userRef.remoteType(); // 'identity'
   ```

   @method remoteType
   @return {String} 'identity'
*/
RecordReference.prototype.remoteType = function() {
  return 'identity';
};

/**
  This API allows you to provide a reference with new data. The
  simplest usage of this API is similar to `store.push`: you provide a
  normalized hash of data and the object represented by the reference
  will update.

  If you pass a promise to `push`, Ember Data will not ask the adapter
  for the data if another attempt to fetch it is made in the
  interim. When the promise resolves, the underlying object is updated
  with the new data, and the promise returned by *this function* is resolved
  with that object.

  For example, `recordReference.push(promise)` will be resolved with a
  record.

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   // provide data for reference
   userRef.push({ data: { id: 1, username: "@user" }}).then(function(user) {
     userRef.value() === user;
   });
   ```

  @method push
  @param {Promise|Object}
  @return Promise<record> a promise for the value (record or relationship)
*/
RecordReference.prototype.push = function(objectOrPromise) {
  return Ember.RSVP.resolve(objectOrPromise).then((data) => {
    return this.store.push(data);
  });
};

/**
  If the entity referred to by the reference is already loaded, it is
  present as `reference.value`. Otherwise the value returned by this function
  is `null`.

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   userRef.value(); // user
   ```

   @method value
   @return {DS.Model} the record for this RecordReference
*/
RecordReference.prototype.value = function() {
  if (this.internalModel.hasRecord) {
    return this.internalModel.getRecord();
  }
};

/**
   Triggers a fetch for the backing entity based on its `remoteType`
   (see `remoteType` definitions per reference type).

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   // load user (via store.find)
   userRef.load().then(...)
   ```

   @method load
   @return {Promise<record>} the record for this RecordReference
*/
RecordReference.prototype.load = function() {
  return this.store.findRecord(this.type, this._id);
};

/**
   Reloads the record if it is already loaded. If the record is not
   loaded it will load the record via `store.findRecord`

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   // or trigger a reload
   userRef.reload().then(...)
   ```

   @method reload
   @return {Promise<record>} the record for this RecordReference
*/
RecordReference.prototype.reload = function() {
  let record = this.value();
  if (record) {
    return record.reload();
  }

  return this.load();
};

// TODO import from here because else creates circular
// import Model from 'ember-data/model';
/**
   A BelongsToReference is a low level API that allows users and
   addon author to perform meta-operations on a belongs-to
   relationship.

   @class BelongsToReference
   @namespace DS
   @extends DS.Reference
*/
const BelongsToReference = function(store, parentInternalModel, belongsToRelationship) {
  this._super$constructor(store, parentInternalModel);
  this.belongsToRelationship = belongsToRelationship;
  this.type = belongsToRelationship.relationshipMeta.type;
  this.parent = parentInternalModel.recordReference;

  // TODO inverse
};

BelongsToReference.prototype = Object.create(Reference.prototype);
BelongsToReference.prototype.constructor = BelongsToReference;
BelongsToReference.prototype._super$constructor = Reference;

/**
   This returns a string that represents how the reference will be
   looked up when it is loaded. If the relationship has a link it will
   use the "link" otherwise it defaults to "id".

   Example

   ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

    let blog = store.push({
      type: 'blog',
      id: 1,
      relationships: {
        user: {
          data: { type: 'user', id: 1 }
        }
      }
    });
    let userRef = blog.belongsTo('user');

    // get the identifier of the reference
    if (userRef.remoteType() === "id") {
      let id = userRef.id();
    } else if (userRef.remoteType() === "link") {
      let link = userRef.link();
    }
    ```

   @method remoteType
   @return {String} The name of the remote type. This should either be "link" or "id"
*/
BelongsToReference.prototype.remoteType = function() {
  if (this.belongsToRelationship.link) {
    return "link";
  }

  return "id";
};

/**
   The `id` of the record that this reference refers to. Together, the
   `type()` and `id()` methods form a composite key for the identity
   map. This can be used to access the id of an async relationship
   without triggering a fetch that would normally happen if you
   attempted to use `record.get('relationship.id')`.

   Example

   ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

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

    // get the identifier of the reference
    if (userRef.remoteType() === "id") {
      let id = userRef.id();
    }
    ```

   @method id
   @return {String} The id of the record in this belongsTo relationship.
*/
BelongsToReference.prototype.id = function() {
  let inverseInternalModel = this.belongsToRelationship.inverseInternalModel;
  return inverseInternalModel && inverseInternalModel.id;
};

/**
   The link Ember Data will use to fetch or reload this belongs-to
   relationship.

   Example

   ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

    let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            links: {
              related: '/articles/1/author'
            }
          }
        }
      }
    });
    let userRef = blog.belongsTo('user');

    // get the identifier of the reference
    if (userRef.remoteType() === "link") {
      let link = userRef.link();
    }
    ```

   @method link
   @return {String} The link Ember Data will use to fetch or reload this belongs-to relationship.
*/
BelongsToReference.prototype.link = function() {
  return this.belongsToRelationship.link;
};

/**
   The meta data for the belongs-to relationship.

   Example

   ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

    let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            links: {
              related: {
                href: '/articles/1/author',
                meta: {
                  lastUpdated: 1458014400000
                }
              }
            }
          }
        }
      }
    });

    let userRef = blog.belongsTo('user');

    userRef.meta() // { lastUpdated: 1458014400000 }
    ```

   @method meta
   @return {Object} The meta information for the belongs-oo relationship.
*/
BelongsToReference.prototype.meta = function() {
  return this.belongsToRelationship.meta;
};

/**
   `push` can be used to update the data in the relationship and Ember
   Data will treat the new data as the conanical value of this
   relationship on the backend.

   Example

    ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

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

    // provide data for reference
    userRef.push({
      data: {
        type: 'user',
        id: 1,
        attributes: {
          username: "@user"
        }
      }
    }).then(function(user) {
      userRef.value() === user;
    });
    ```

   @method push
   @param {Object|Promise} objectOrPromise a promise that resolves to a JSONAPI document object describing the new value of this relationship.
   @return {Promise<record>} A promise that resolves with the new value in this belongs-to relationship.
*/
BelongsToReference.prototype.push = function(objectOrPromise) {
  return Ember.RSVP.resolve(objectOrPromise).then((data) => {
    let record;

    if (data instanceof Model) {
      if (isEnabled('ds-overhaul-references')) {
        deprecate("BelongsToReference#push(DS.Model) is deprecated. Update relationship via `model.set('relationshipName', value)` instead.", false, {
          id: 'ds.references.belongs-to.push-record',
          until: '3.0'
        });
      }
      record = data;
    } else {
      record = this.store.push(data);
    }

    assertPolymorphicType(this.internalModel, this.belongsToRelationship.relationshipMeta, record._internalModel);

    this.belongsToRelationship.setCanonicalInternalModel(record._internalModel);

    return record;
  });
};

/**
   `value()` synchronously returns the current value of the belongs-to
   relationship. Unlike `record.get('relationshipName')`, calling
   `value()` on a reference does not trigger a fetch if the async
   relationship is not yet loaded. If the relationship is not loaded
   it will always return `null`.

   Example

    ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

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

    userRef.value(); // null

    // provide data for reference
    userRef.push({
      data: {
        type: 'user',
        id: 1,
        attributes: {
          username: "@user"
        }
      }
    }).then(function(user) {
      userRef.value(); // user
    });
    ```

   @method value
   @param {Object|Promise} objectOrPromise a promise that resolves to a JSONAPI document object describing the new value of this relationship.
   @return {DS.Model} the record in this relationship
*/
BelongsToReference.prototype.value = function() {
  let inverseInternalModel = this.belongsToRelationship.inverseInternalModel;

  if (inverseInternalModel && inverseInternalModel.isLoaded()) {
    return inverseInternalModel.getRecord();
  }

  return null;
};

/**
   Loads a record in a belongs to relationship if it is not already
   loaded. If the relationship is already loaded this method does not
   trigger a new load.

   Example

    ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

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

    userRef.value(); // null

    userRef.load().then(function(user) {
      userRef.value() === user
    });

   @method load
   @return {Promise} a promise that resolves with the record in this belongs-to relationship.
*/
BelongsToReference.prototype.load = function() {
  if (this.remoteType() === "id") {
    return this.belongsToRelationship.getRecord();
  }

  if (this.remoteType() === "link") {
    return this.belongsToRelationship.findLink().then((internalModel) => {
      return this.value();
    });
  }
};

/**
   Triggers a reload of the value in this relationship. If the
   remoteType is `"link"` Ember Data will use the relationship link to
   reload the relationship. Otherwise it will reload the record by its
   id.

   Example

    ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

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

    userRef.reload().then(function(user) {
      userRef.value() === user
    });

   @method reload
   @return {Promise} a promise that resolves with the record in this belongs-to relationship after the reload has completed.
*/
BelongsToReference.prototype.reload = function() {
  return this.belongsToRelationship.reload().then((internalModel) => {
    return this.value();
  });
};

const {
  RSVP: { resolve },
  get: get$10
} = Ember;

/**
   A HasManyReference is a low level API that allows users and addon
   author to perform meta-operations on a has-many relationship.

   @class HasManyReference
   @namespace DS
*/
const HasManyReference = function(store, parentInternalModel, hasManyRelationship) {
  this._super$constructor(store, parentInternalModel);
  this.hasManyRelationship = hasManyRelationship;
  this.type = hasManyRelationship.relationshipMeta.type;
  this.parent = parentInternalModel.recordReference;

  // TODO inverse
};

HasManyReference.prototype = Object.create(Reference.prototype);
HasManyReference.prototype.constructor = HasManyReference;
HasManyReference.prototype._super$constructor = Reference;

/**
   This returns a string that represents how the reference will be
   looked up when it is loaded. If the relationship has a link it will
   use the "link" otherwise it defaults to "id".

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   // get the identifier of the reference
   if (commentsRef.remoteType() === "ids") {
     let ids = commentsRef.ids();
   } else if (commentsRef.remoteType() === "link") {
     let link = commentsRef.link();
   }
   ```

   @method remoteType
   @return {String} The name of the remote type. This should either be "link" or "ids"
*/
HasManyReference.prototype.remoteType = function() {
  if (this.hasManyRelationship.link) {
    return "link";
  }

  return "ids";
};

/**
   The link Ember Data will use to fetch or reload this has-many
   relationship.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           links: {
             related: '/posts/1/comments'
           }
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.link(); // '/posts/1/comments'
   ```

   @method link
   @return {String} The link Ember Data will use to fetch or reload this has-many relationship.
*/
HasManyReference.prototype.link = function() {
  return this.hasManyRelationship.link;
};

/**
   `ids()` returns an array of the record ids in this relationship.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.ids(); // ['1']
   ```

   @method remoteType
   @return {Array} The ids in this has-many relationship
*/
HasManyReference.prototype.ids = function() {
  let members = this.hasManyRelationship.members.toArray();

  return members.map(function(internalModel) {
    return internalModel.id;
  });
};

/**
   The link Ember Data will use to fetch or reload this has-many
   relationship.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           links: {
             related: {
               href: '/posts/1/comments',
               meta: {
                 count: 10
               }
             }
           }
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.meta(); // { count: 10 }
   ```

   @method meta
   @return {Object} The meta information for the has-many relationship.
*/
HasManyReference.prototype.meta = function() {
  return this.hasManyRelationship.meta;
};

/**
   `push` can be used to update the data in the relationship and Ember
   Data will treat the new data as the canonical value of this
   relationship on the backend.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.ids(); // ['1']

   commentsRef.push([
     [{ type: 'comment', id: 2 }],
     [{ type: 'comment', id: 3 }],
   ])

   commentsRef.ids(); // ['2', '3']
   ```

   @method push
   @param {Array|Promise} objectOrPromise a promise that resolves to a JSONAPI document object describing the new value of this relationship.
   @return {DS.ManyArray}
*/
HasManyReference.prototype.push = function(objectOrPromise) {
  return resolve(objectOrPromise).then((payload) => {
    let array = payload;

    if (isEnabled("ds-overhaul-references")) {
      deprecate("HasManyReference#push(array) is deprecated. Push a JSON-API document instead.", !Array.isArray(payload), {
        id: 'ds.references.has-many.push-array',
        until: '3.0'
      });
    }

    let useLegacyArrayPush = true;
    if (typeof payload === "object" && payload.data) {
      array = payload.data;
      useLegacyArrayPush = array.length && array[0].data;

      if (isEnabled('ds-overhaul-references')) {
        deprecate("HasManyReference#push() expects a valid JSON-API document.", !useLegacyArrayPush, {
          id: 'ds.references.has-many.push-invalid-json-api',
          until: '3.0'
        });
      }
    }

    if (!isEnabled('ds-overhaul-references')) {
      useLegacyArrayPush = true;
    }

    let internalModels;
    if (useLegacyArrayPush) {
      internalModels = array.map((obj) => {
        let record = this.store.push(obj);

        runInDebug(() => {
          let relationshipMeta = this.hasManyRelationship.relationshipMeta;
          assertPolymorphicType(this.internalModel, relationshipMeta, record._internalModel);
        });

        return record._internalModel;
      });
    } else {
      let records = this.store.push(payload);
      internalModels = Ember.A(records).mapBy('_internalModel');

      runInDebug(() => {
        internalModels.forEach((internalModel) => {
          let relationshipMeta = this.hasManyRelationship.relationshipMeta;
          assertPolymorphicType(this.internalModel, relationshipMeta, internalModel);
        });
      });
    }

    this.hasManyRelationship.computeChanges(internalModels);

    return this.hasManyRelationship.manyArray;
  });
};

HasManyReference.prototype._isLoaded = function() {
  let hasData = get$10(this.hasManyRelationship, 'hasData');
  if (!hasData) {
    return false;
  }

  let members = this.hasManyRelationship.members.toArray();

  return members.every(function(internalModel) {
    return internalModel.isLoaded() === true;
  });
};

/**
   `value()` sycronously returns the current value of the has-many
    relationship. Unlike `record.get('relationshipName')`, calling
    `value()` on a reference does not trigger a fetch if the async
    relationship is not yet loaded. If the relationship is not loaded
    it will always return `null`.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   post.get('comments').then(function(comments) {
     commentsRef.value() === comments
   })
   ```

   @method value
   @return {DS.ManyArray}
*/
HasManyReference.prototype.value = function() {
  if (this._isLoaded()) {
    return this.hasManyRelationship.manyArray;
  }

  return null;
};

/**
   Loads the relationship if it is not already loaded.  If the
   relationship is already loaded this method does not trigger a new
   load.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.load().then(function(comments) {
     //...
   });
   ```

   @method load
   @return {Promise} a promise that resolves with the ManyArray in
   this has-many relationship.
*/
HasManyReference.prototype.load = function() {
  if (!this._isLoaded()) {
    return this.hasManyRelationship.getRecords();
  }

  return resolve(this.hasManyRelationship.manyArray);
};

/**
   Reloads this has-many relationship.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.reload().then(function(comments) {
     //...
   });
   ```

   @method reload
   @return {Promise} a promise that resolves with the ManyArray in this has-many relationship.
*/
HasManyReference.prototype.reload = function() {
  return this.hasManyRelationship.reload();
};

const {
  get: get$4,
  set: set$2,
  copy: copy$1,
  Error: EmberError$1,
  inspect: inspect$1,
  isEmpty: isEmpty$1,
  isEqual,
  setOwner,
  RSVP: RSVP$1,
  RSVP: { Promise: Promise$2 }
} = Ember;

const assign = Ember.assign || Ember.merge;

/*
  The TransitionChainMap caches the `state.enters`, `state.setups`, and final state reached
  when transitioning from one state to another, so that future transitions can replay the
  transition without needing to walk the state tree, collect these hook calls and determine
   the state to transition into.

   A future optimization would be to build a single chained method out of the collected enters
   and setups. It may also be faster to do a two level cache (from: { to }) instead of caching based
   on a key that adds the two together.
 */
const TransitionChainMap = Object.create(null);

const _extractPivotNameCache = Object.create(null);
const _splitOnDotCache = Object.create(null);

function splitOnDot(name) {
  return _splitOnDotCache[name] || (
    _splitOnDotCache[name] = name.split('.')
  );
}

function extractPivotName(name) {
  return _extractPivotNameCache[name] || (
    _extractPivotNameCache[name] = splitOnDot(name)[0]
  );
}

function areAllModelsUnloaded(internalModels) {
  for (let i=0; i<internalModels.length; ++i) {
    let record = internalModels[i]._record;
    if (record && !(record.get('isDestroyed') || record.get('isDestroying'))) {
      return false;
    }
  }
  return true;
}

// this (and all heimdall instrumentation) will be stripped by a babel transform
//  https://github.com/heimdalljs/babel5-plugin-strip-heimdall
const {
  _triggerDeferredTriggers,
  changedAttributes,
  createSnapshot,
  flushChangedAttributes,
  hasChangedAttributes,
  materializeRecord,
  new_InternalModel,
  send,
  setupData,
  transitionTo,
  updateChangedAttributes
} = heimdall.registerMonitor('InternalModel',
  '_triggerDeferredTriggers',
  'changedAttributes',
  'createSnapshot',
  'flushChangedAttributes',
  'hasChangedAttributes',
  'materializeRecord',
  'new_InternalModel',
  'send',
  'setupData',
  'transitionTo',
  'updateChangedAttributes'
);

let InternalModelReferenceId = 1;
let nextBfsId = 1;

/*
  `InternalModel` is the Model class that we use internally inside Ember Data to represent models.
  Internal ED methods should only deal with `InternalModel` objects. It is a fast, plain Javascript class.

  We expose `DS.Model` to application code, by materializing a `DS.Model` from `InternalModel` lazily, as
  a performance optimization.

  `InternalModel` should never be exposed to application code. At the boundaries of the system, in places
  like `find`, `push`, etc. we convert between Models and InternalModels.

  We need to make sure that the properties from `InternalModel` are correctly exposed/proxied on `Model`
  if they are needed.

  @private
  @class InternalModel
*/
class InternalModel {
  constructor(modelName, id, store, data) {
    heimdall.increment(new_InternalModel);
    this.id = id;

    // this ensure ordered set can quickly identify this as unique
    this[Ember.GUID_KEY] = InternalModelReferenceId++ + 'internal-model';

    this.store = store;
    this.modelName = modelName;
    this._loadingPromise = null;
    this._record = null;
    this._isDestroyed = false;
    this.isError = false;
    this._isUpdatingRecordArrays = false; // used by the recordArrayManager

    // During dematerialization we don't want to rematerialize the record.  The
    // reason this might happen is that dematerialization removes records from
    // record arrays,  and Ember arrays will always `objectAt(0)` and
    // `objectAt(len - 1)` to test whether or not `firstObject` or `lastObject`
    // have changed.
    this._isDematerializing = false;

    this.resetRecord();

    if (data) {
      this.__data = data;
    }

    // caches for lazy getters
    this._modelClass = null;
    this.__deferredTriggers = null;
    this.__recordArrays = null;
    this._references = null;
    this._recordReference = null;
    this.__relationships = null;
    this.__implicitRelationships = null;

    // Used during the mark phase of unloading to avoid checking the same internal
    // model twice in the same scan
    this._bfsId = 0;
  }

  get modelClass() {
    return this._modelClass || (this._modelClass = this.store._modelFor(this.modelName));
  }

  get type() {
    return this.modelClass;
  }

  get recordReference() {
    if (this._recordReference === null) {
      this._recordReference = new RecordReference(this.store, this);
    }
    return this._recordReference;
  }

  get _recordArrays() {
    if (this.__recordArrays === null) {
      this.__recordArrays = OrderedSet.create();
    }
    return this.__recordArrays;
  }

  get references() {
    if (this._references === null) {
      this._references = Object.create(null);
    }
    return this._references;
  }

  get _deferredTriggers() {
    if (this.__deferredTriggers === null) {
      this.__deferredTriggers = [];
    }
    return this.__deferredTriggers;
  }

  get _attributes() {
    if (this.__attributes === null) {
      this.__attributes = Object.create(null);
    }
    return this.__attributes;
  }

  set _attributes(v) {
    this.__attributes = v;
  }

  get _relationships() {
    if (this.__relationships === null) {
      this.__relationships = new Relationships(this);
    }

    return this.__relationships;
  }

  get _inFlightAttributes() {
    if (this.__inFlightAttributes === null) {
      this.__inFlightAttributes = Object.create(null);
    }
    return this.__inFlightAttributes;
  }

  set _inFlightAttributes(v) {
    this.__inFlightAttributes = v;
  }

  get _data() {
    if (this.__data === null) {
      this.__data = Object.create(null);
    }
    return this.__data;
  }

  set _data(v) {
    this.__data = v;
  }

  /*
   implicit relationships are relationship which have not been declared but the inverse side exists on
   another record somewhere
   For example if there was

   ```app/models/comment.js
   import DS from 'ember-data';

   export default DS.Model.extend({
   name: DS.attr()
   })
   ```

   but there is also

   ```app/models/post.js
   import DS from 'ember-data';

   export default DS.Model.extend({
   name: DS.attr(),
   comments: DS.hasMany('comment')
   })
   ```

   would have a implicit post relationship in order to be do things like remove ourselves from the post
   when we are deleted
  */
  get _implicitRelationships() {
    if (this.__implicitRelationships === null) {
      this.__implicitRelationships = Object.create(null);
    }
    return this.__implicitRelationships;
  }

  isHiddenFromRecordArrays() {
    // During dematerialization we don't want to rematerialize the record.
    // recordWasDeleted can cause other records to rematerialize because it
    // removes the internal model from the array and Ember arrays will always
    // `objectAt(0)` and `objectAt(len -1)` to check whether `firstObject` or
    // `lastObject` have changed.  When this happens we don't want those
    // models to rematerialize their records.

    return this._isDematerializing ||
      this.isDestroyed ||
      this.currentState.stateName === 'root.deleted.saved' ||
      this.isEmpty();
  }

  isEmpty() {
    return this.currentState.isEmpty;
  }

  isLoading() {
    return this.currentState.isLoading;
  }

  isLoaded() {
    return this.currentState.isLoaded;
  }

  hasDirtyAttributes() {
    return this.currentState.hasDirtyAttributes;
  }

  isSaving() {
    return this.currentState.isSaving;
  }

  isDeleted() {
    return this.currentState.isDeleted;
  }

  isNew() {
    return this.currentState.isNew;
  }

  isValid() {
    return this.currentState.isValid;
  }

  dirtyType() {
    return this.currentState.dirtyType;
  }

  getRecord() {
    if (!this._record && !this._isDematerializing) {
      heimdall.increment(materializeRecord);
      let token = heimdall.start('InternalModel.getRecord');

      // lookupFactory should really return an object that creates
      // instances with the injections applied
      let createOptions = {
        store: this.store,
        _internalModel: this,
        id: this.id,
        currentState: this.currentState,
        isError: this.isError,
        adapterError: this.error
      };

      if (setOwner) {
        // ensure that `getOwner(this)` works inside a model instance
        setOwner(createOptions, getOwner(this.store));
      } else {
        createOptions.container = this.store.container;
      }

      this._record = this.store.modelFactoryFor(this.modelName).create(createOptions);

      this._triggerDeferredTriggers();
      heimdall.stop(token);
    }

    return this._record;
  }

  resetRecord() {
    this._record = null;
    this.dataHasInitialized = false;
    this.isReloading = false;
    this.error = null;
    this.currentState = RootState$1.empty;
    this.__attributes = null;
    this.__inFlightAttributes = null;
    this._data = null;
  }

  dematerializeRecord() {
    if (this._record) {
      this._isDematerializing = true;
      this._record.destroy();
      this.destroyRelationships();
      this.updateRecordArrays();
      this.resetRecord();
    }
  }

  deleteRecord() {
    this.send('deleteRecord');
  }

  save(options) {
    let promiseLabel = "DS: Model#save " + this;
    let resolver = RSVP$1.defer(promiseLabel);

    this.store.scheduleSave(this, resolver, options);
    return resolver.promise;
  }

  startedReloading() {
    this.isReloading = true;
    if (this.hasRecord) {
      set$2(this._record, 'isReloading', true);
    }
  }

  finishedReloading() {
    this.isReloading = false;
    if (this.hasRecord) {
      set$2(this._record, 'isReloading', false);
    }
  }

  reload() {
    this.startedReloading();
    let internalModel = this;
    let promiseLabel = "DS: Model#reload of " + this;

    return new Promise$2(function(resolve) {
      internalModel.send('reloadRecord', resolve);
    }, promiseLabel).then(function() {
      internalModel.didCleanError();
      return internalModel;
    }, function(error) {
      internalModel.didError(error);
      throw error;
    }, "DS: Model#reload complete, update flags").finally(function () {
      internalModel.finishedReloading();
      internalModel.updateRecordArrays();
    });
  }

  /**
    Computes the set of internal models reachable from `this` across exactly one
    relationship.

    @return {Array} An array containing the internal models that `this` belongs
    to or has many.
  */
  _directlyRelatedInternalModels() {
    let array = [];
    this.type.eachRelationship((key, relationship) => {
      if (this._relationships.has(key)) {
        let relationship = this._relationships.get(key);
        let localRelationships = relationship.members.toArray();
        let serverRelationships = relationship.canonicalMembers.toArray();

        array = array.concat(localRelationships, serverRelationships);
      }
    });
    return array;
  }


  /**
    Computes the set of internal models reachable from this internal model.

    Reachability is determined over the relationship graph (ie a graph where
    nodes are internal models and edges are belongs to or has many
    relationships).

    @return {Array} An array including `this` and all internal models reachable
    from `this`.
  */
  _allRelatedInternalModels() {
    let array = [];
    let queue = [];
    let bfsId = nextBfsId++;
    queue.push(this);
    this._bfsId = bfsId;
    while (queue.length > 0) {
      let node = queue.shift();
      array.push(node);
      let related = node._directlyRelatedInternalModels();
      for (let i=0; i<related.length; ++i) {
        let internalModel = related[i];
        assert('Internal Error: seen a future bfs iteration', internalModel._bfsId <= bfsId);
        if (internalModel._bfsId < bfsId) {
          queue.push(internalModel);
          internalModel._bfsId = bfsId;
        }
      }
    }
    return array;
  }


  /**
    Unload the record for this internal model. This will cause the record to be
    destroyed and freed up for garbage collection. It will also do a check
    for cleaning up internal models.

    This check is performed by first computing the set of related internal
    models. If all records in this set are unloaded, then the entire set is
    destroyed. Otherwise, nothing in the set is destroyed.

    This means that this internal model will be freed up for garbage collection
    once all models that refer to it via some relationship are also unloaded.
  */
  unloadRecord() {
    this.send('unloadRecord');
    this.dematerializeRecord();
    Ember.run.schedule('destroy', this, '_checkForOrphanedInternalModels');
  }

  _checkForOrphanedInternalModels() {
    this._isDematerializing = false;
    if (this.isDestroyed) { return; }

    this._cleanupOrphanedInternalModels();
  }

  _cleanupOrphanedInternalModels() {
    let relatedInternalModels = this._allRelatedInternalModels();
    if (areAllModelsUnloaded(relatedInternalModels)) {
      for (let i=0; i<relatedInternalModels.length; ++i) {
        let internalModel = relatedInternalModels[i];
        if (!internalModel.isDestroyed) {
          internalModel.destroy();
        }
      }
    }
  }

  eachRelationship(callback, binding) {
    return this.modelClass.eachRelationship(callback, binding);
  }

  destroy() {
    assert("Cannot destroy an internalModel while its record is materialized", !this._record || this._record.get('isDestroyed') || this._record.get('isDestroying'));

    this.store._internalModelDestroyed(this);
    this._isDestroyed = true;
  }

  eachAttribute(callback, binding) {
    return this.modelClass.eachAttribute(callback, binding);
  }

  inverseFor(key) {
    return this.modelClass.inverseFor(key);
  }

  setupData(data) {
    heimdall.increment(setupData);
    this.store._internalModelDidReceiveRelationshipData(this.modelName, this.id, data.relationships);

    let changedKeys;

    if (this.hasRecord) {
      changedKeys = this._changedKeys(data.attributes);
    }

    assign(this._data, data.attributes);
    this.pushedData();

    if (this.hasRecord) {
      this._record._notifyProperties(changedKeys);
    }
    this.didInitializeData();
  }

  becameReady() {
    this.store.recordArrayManager.recordWasLoaded(this);
  }

  didInitializeData() {
    if (!this.dataHasInitialized) {
      this.becameReady();
      this.dataHasInitialized = true;
    }
  }

  get isDestroyed() {
    return this._isDestroyed;
  }

  get hasRecord() {
    return !!this._record;
  }

  /*
    @method createSnapshot
    @private
  */
  createSnapshot(options) {
    heimdall.increment(createSnapshot);
    return new Snapshot(this, options);
  }

  /*
    @method loadingData
    @private
    @param {Promise} promise
  */
  loadingData(promise) {
    this.send('loadingData', promise);
  }

  /*
    @method loadedData
    @private
  */
  loadedData() {
    this.send('loadedData');
    this.didInitializeData();
  }

  /*
    @method notFound
    @private
  */
  notFound() {
    this.send('notFound');
  }

  /*
    @method pushedData
    @private
  */
  pushedData() {
    this.send('pushedData');
  }

  flushChangedAttributes() {
    heimdall.increment(flushChangedAttributes);
    this._inFlightAttributes = this._attributes;
    this._attributes = null;
  }

  hasChangedAttributes() {
    heimdall.increment(hasChangedAttributes);
    return this.__attributes !== null && Object.keys(this.__attributes).length > 0;
  }

  /*
    Checks if the attributes which are considered as changed are still
    different to the state which is acknowledged by the server.

    This method is needed when data for the internal model is pushed and the
    pushed data might acknowledge dirty attributes as confirmed.

    @method updateChangedAttributes
    @private
   */
  updateChangedAttributes() {
    heimdall.increment(updateChangedAttributes);
    let changedAttributes = this.changedAttributes();
    let changedAttributeNames = Object.keys(changedAttributes);
    let attrs = this._attributes;

    for (let i = 0, length = changedAttributeNames.length; i < length; i++) {
      let attribute = changedAttributeNames[i];
      let data = changedAttributes[attribute];
      let oldData = data[0];
      let newData = data[1];

      if (oldData === newData) {
        delete attrs[attribute];
      }
    }
  }

  /*
    Returns an object, whose keys are changed properties, and value is an
    [oldProp, newProp] array.

    @method changedAttributes
    @private
  */
  changedAttributes() {
    heimdall.increment(changedAttributes);
    let oldData = this._data;
    let currentData = this._attributes;
    let inFlightData = this._inFlightAttributes;
    let newData = assign(copy$1(inFlightData), currentData);
    let diffData = Object.create(null);
    let newDataKeys = Object.keys(newData);

    for (let i = 0, length = newDataKeys.length; i < length; i++) {
      let key = newDataKeys[i];
      diffData[key] = [oldData[key], newData[key]];
    }

    return diffData;
  }

  /*
    @method adapterWillCommit
    @private
  */
  adapterWillCommit() {
    this.send('willCommit');
  }

  /*
    @method adapterDidDirty
    @private
  */
  adapterDidDirty() {
    this.send('becomeDirty');
    this.updateRecordArrays();
  }

  /*
    @method send
    @private
    @param {String} name
    @param {Object} context
  */
  send(name, context) {
    heimdall.increment(send);
    let currentState = this.currentState;

    if (!currentState[name]) {
      this._unhandledEvent(currentState, name, context);
    }

    return currentState[name](this, context);
  }

  notifyHasManyAdded(key, record, idx) {
    if (this.hasRecord) {
      this._record.notifyHasManyAdded(key, record, idx);
    }
  }

  notifyHasManyRemoved(key, record, idx) {
    if (this.hasRecord) {
      this._record.notifyHasManyRemoved(key, record, idx);
    }
  }

  notifyBelongsToChanged(key, record) {
    if (this.hasRecord) {
      this._record.notifyBelongsToChanged(key, record);
    }
  }

  notifyPropertyChange(key) {
    if (this.hasRecord) {
      this._record.notifyPropertyChange(key);
    }
  }

  rollbackAttributes() {
    let dirtyKeys;
    if (this.hasChangedAttributes()) {
      dirtyKeys = Object.keys(this._attributes);
      this._attributes = null;
    }


    if (get$4(this, 'isError')) {
      this._inFlightAttributes = null;
      this.didCleanError();
    }

    //Eventually rollback will always work for relationships
    //For now we support it only out of deleted state, because we
    //have an explicit way of knowing when the server acked the relationship change
    if (this.isDeleted()) {
      //TODO: Should probably move this to the state machine somehow
      this.becameReady();
    }

    if (this.isNew()) {
      this.clearRelationships();
    }

    if (this.isValid()) {
      this._inFlightAttributes = null;
    }

    this.send('rolledBack');

    if (dirtyKeys && dirtyKeys.length > 0) {
      this._record._notifyProperties(dirtyKeys);
    }
  }

  /*
    @method transitionTo
    @private
    @param {String} name
  */
  transitionTo(name) {
    heimdall.increment(transitionTo);
    // POSSIBLE TODO: Remove this code and replace with
    // always having direct reference to state objects

    let pivotName = extractPivotName(name);
    let state = this.currentState;
    let transitionMapId = `${state.stateName}->${name}`;

    do {
      if (state.exit) { state.exit(this); }
      state = state.parentState;
    } while (!state[pivotName]);

    let setups;
    let enters;
    let i;
    let l;
    let map = TransitionChainMap[transitionMapId];

    if (map) {
      setups = map.setups;
      enters = map.enters;
      state = map.state;
    } else {
      setups = [];
      enters = [];

      let path = splitOnDot(name);

      for (i = 0, l = path.length; i < l; i++) {
        state = state[path[i]];

        if (state.enter) { enters.push(state); }
        if (state.setup) { setups.push(state); }
      }

      TransitionChainMap[transitionMapId] = { setups, enters, state };
    }

    for (i = 0, l = enters.length; i < l; i++) {
      enters[i].enter(this);
    }

    this.currentState = state;
    if (this.hasRecord) {
      set$2(this._record, 'currentState', state);
    }

    for (i = 0, l = setups.length; i < l; i++) {
      setups[i].setup(this);
    }

    this.updateRecordArrays();
  }

  _unhandledEvent(state, name, context) {
    let errorMessage = "Attempted to handle event `" + name + "` ";
    errorMessage    += "on " + String(this) + " while in state ";
    errorMessage    += state.stateName + ". ";

    if (context !== undefined) {
      errorMessage  += "Called with " + inspect$1(context) + ".";
    }

    throw new EmberError$1(errorMessage);
  }

  triggerLater(...args) {
    if (this._deferredTriggers.push(args) !== 1) {
      return;
    }

    this.store._updateInternalModel(this);
  }

  _triggerDeferredTriggers() {
    heimdall.increment(_triggerDeferredTriggers);
    //TODO: Before 1.0 we want to remove all the events that happen on the pre materialized record,
    //but for now, we queue up all the events triggered before the record was materialized, and flush
    //them once we have the record
    if (!this.hasRecord) {
      return;
    }
    let triggers = this._deferredTriggers;
    let record = this._record;
    let trigger = record.trigger;
    for (let i = 0, l= triggers.length; i<l; i++) {
      trigger.apply(record, triggers[i]);
    }

    triggers.length = 0;
  }

  /*
    @method clearRelationships
    @private
  */
  clearRelationships() {
    this.eachRelationship((name, relationship) => {
      if (this._relationships.has(name)) {
        let rel = this._relationships.get(name);
        rel.clear();
        rel.removeInverseRelationships();
      }
    });
    Object.keys(this._implicitRelationships).forEach((key) => {
      this._implicitRelationships[key].clear();
      this._implicitRelationships[key].removeInverseRelationships();
    });
  }

  destroyRelationships() {
    this.eachRelationship((name, relationship) => {
      if (this._relationships.has(name)) {
        let rel = this._relationships.get(name);
        rel.removeInverseRelationships();
      }
    });
    Object.keys(this._implicitRelationships).forEach((key) => {
      this._implicitRelationships[key].removeInverseRelationships();
    });
  }

  /*
    When a find request is triggered on the store, the user can optionally pass in
    attributes and relationships to be preloaded. These are meant to behave as if they
    came back from the server, except the user obtained them out of band and is informing
    the store of their existence. The most common use case is for supporting client side
    nested URLs, such as `/posts/1/comments/2` so the user can do
    `store.findRecord('comment', 2, { preload: { post: 1 } })` without having to fetch the post.

    Preloaded data can be attributes and relationships passed in either as IDs or as actual
    models.

    @method preloadData
    @private
    @param {Object} preload
  */
  preloadData(preload) {
    //TODO(Igor) consider the polymorphic case
    Object.keys(preload).forEach((key) => {
      let preloadValue = get$4(preload, key);
      let relationshipMeta = this.modelClass.metaForProperty(key);
      if (relationshipMeta.isRelationship) {
        this._preloadRelationship(key, preloadValue);
      } else {
        this._data[key] = preloadValue;
      }
    });
  }

  _preloadRelationship(key, preloadValue) {
    let relationshipMeta = this.modelClass.metaForProperty(key);
    let modelClass = relationshipMeta.type;
    if (relationshipMeta.kind === 'hasMany') {
      this._preloadHasMany(key, preloadValue, modelClass);
    } else {
      this._preloadBelongsTo(key, preloadValue, modelClass);
    }
  }

  _preloadHasMany(key, preloadValue, modelClass) {
    assert("You need to pass in an array to set a hasMany property on a record", Array.isArray(preloadValue));
    let recordsToSet = new Array(preloadValue.length);

    for (let i = 0; i < preloadValue.length; i++) {
      let recordToPush = preloadValue[i];
      recordsToSet[i] = this._convertStringOrNumberIntoInternalModel(recordToPush, modelClass);
    }

    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships.get(key).updateInternalModelsFromAdapter(recordsToSet);
  }

  _preloadBelongsTo(key, preloadValue, modelClass) {
    let internalModelToSet = this._convertStringOrNumberIntoInternalModel(preloadValue, modelClass);

    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships.get(key).setInternalModel(internalModelToSet);
  }

  _convertStringOrNumberIntoInternalModel(value, modelClass) {
    if (typeof value === 'string' || typeof value === 'number') {
      return this.store._internalModelForId(modelClass, value);
    }
    if (value._internalModel) {
      return value._internalModel;
    }
    return value;
  }

  /*
    @method updateRecordArrays
    @private
  */
  updateRecordArrays() {
    this.store.recordArrayManager.recordDidChange(this);
  }

  setId(id) {
    assert('A record\'s id cannot be changed once it is in the loaded state', this.id === null || this.id === id || this.isNew());
    this.id = id;
    if (this._record.get('id') !== id) {
      this._record.set('id', id);
    }
  }

  didError(error) {
    this.error = error;
    this.isError = true;

    if (this.hasRecord) {
      this._record.setProperties({
        isError: true,
        adapterError: error
      });
    }
  }

  didCleanError() {
    this.error = null;
    this.isError = false;

    if (this.hasRecord) {
      this._record.setProperties({
        isError: false,
        adapterError: null
      });
    }
  }

  /*
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.

    @method adapterDidCommit
  */
  adapterDidCommit(data) {
    if (data) {
      this.store._internalModelDidReceiveRelationshipData(this.modelName, this.id, data.relationships);

      data = data.attributes;
    }

    this.didCleanError();
    let changedKeys = this._changedKeys(data);

    assign(this._data, this._inFlightAttributes);
    if (data) {
      assign(this._data, data);
    }

    this._inFlightAttributes = null;

    this.send('didCommit');
    this.updateRecordArrays();

    if (!data) { return; }

    this._record._notifyProperties(changedKeys);
  }

  addErrorMessageToAttribute(attribute, message) {
    get$4(this.getRecord(), 'errors')._add(attribute, message);
  }

  removeErrorMessageFromAttribute(attribute) {
    get$4(this.getRecord(), 'errors')._remove(attribute);
  }

  clearErrorMessages() {
    get$4(this.getRecord(), 'errors')._clear();
  }

  hasErrors() {
    let errors = get$4(this.getRecord(), 'errors');

    return !isEmpty$1(errors);
  }

  // FOR USE DURING COMMIT PROCESS

  /*
    @method adapterDidInvalidate
    @private
  */
  adapterDidInvalidate(errors) {
    let attribute;

    for (attribute in errors) {
      if (errors.hasOwnProperty(attribute)) {
        this.addErrorMessageToAttribute(attribute, errors[attribute]);
      }
    }

    this.send('becameInvalid');

    this._saveWasRejected();
  }

  /*
    @method adapterDidError
    @private
  */
  adapterDidError(error) {
    this.send('becameError');
    this.didError(error);
    this._saveWasRejected();
  }

  _saveWasRejected() {
    let keys = Object.keys(this._inFlightAttributes);
    if (keys.length > 0) {
      let attrs = this._attributes;
      for (let i=0; i < keys.length; i++) {
        if (attrs[keys[i]] === undefined) {
          attrs[keys[i]] = this._inFlightAttributes[keys[i]];
        }
      }
    }
    this._inFlightAttributes = null;
  }

  /*
    Ember Data has 3 buckets for storing the value of an attribute on an internalModel.

    `_data` holds all of the attributes that have been acknowledged by
    a backend via the adapter. When rollbackAttributes is called on a model all
    attributes will revert to the record's state in `_data`.

    `_attributes` holds any change the user has made to an attribute
    that has not been acknowledged by the adapter. Any values in
    `_attributes` are have priority over values in `_data`.

    `_inFlightAttributes`. When a record is being synced with the
    backend the values in `_attributes` are copied to
    `_inFlightAttributes`. This way if the backend acknowledges the
    save but does not return the new state Ember Data can copy the
    values from `_inFlightAttributes` to `_data`. Without having to
    worry about changes made to `_attributes` while the save was
    happenign.


    Changed keys builds a list of all of the values that may have been
    changed by the backend after a successful save.

    It does this by iterating over each key, value pair in the payload
    returned from the server after a save. If the `key` is found in
    `_attributes` then the user has a local changed to the attribute
    that has not been synced with the server and the key is not
    included in the list of changed keys.



    If the value, for a key differs from the value in what Ember Data
    believes to be the truth about the backend state (A merger of the
    `_data` and `_inFlightAttributes` objects where
    `_inFlightAttributes` has priority) then that means the backend
    has updated the value and the key is added to the list of changed
    keys.

    @method _changedKeys
    @private
  */
  _changedKeys(updates) {
    let changedKeys = [];

    if (updates) {
      let original, i, value, key;
      let keys = Object.keys(updates);
      let length = keys.length;
      let hasAttrs = this.hasChangedAttributes();
      let attrs;
      if (hasAttrs) {
        attrs= this._attributes;
      }

      original = assign(Object.create(null), this._data);
      original = assign(original, this._inFlightAttributes);

      for (i = 0; i < length; i++) {
        key = keys[i];
        value = updates[key];

        // A value in _attributes means the user has a local change to
        // this attributes. We never override this value when merging
        // updates from the backend so we should not sent a change
        // notification if the server value differs from the original.
        if (hasAttrs === true && attrs[key] !== undefined) {
          continue;
        }

        if (!isEqual(original[key], value)) {
          changedKeys.push(key);
        }
      }
    }

    return changedKeys;
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }

  referenceFor(kind, name) {
    let reference = this.references[name];

    if (!reference) {
      let relationship = this._relationships.get(name);

      runInDebug(() => {
        let modelName = this.modelName;
        assert(`There is no ${kind} relationship named '${name}' on a model of modelClass '${modelName}'`, relationship);

        let actualRelationshipKind = relationship.relationshipMeta.kind;
        assert(`You tried to get the '${name}' relationship on a '${modelName}' via record.${kind}('${name}'), but the relationship is of kind '${actualRelationshipKind}'. Use record.${actualRelationshipKind}('${name}') instead.`, actualRelationshipKind === kind);
      });

      if (kind === "belongsTo") {
        reference = new BelongsToReference(this.store, this, relationship);
      } else if (kind === "hasMany") {
        reference = new HasManyReference(this.store, this, relationship);
      }

      this.references[name] = reference;
    }

    return reference;
  }
}

if (isEnabled('ds-rollback-attribute')) {
  /*
     Returns the latest truth for an attribute - the canonical value, or the
     in-flight value.

     @method lastAcknowledgedValue
     @private
  */
  InternalModel.prototype.lastAcknowledgedValue = function lastAcknowledgedValue(key) {
    if (key in this._inFlightAttributes) {
      return this._inFlightAttributes[key];
    } else {
      return this._data[key];
    }
  };
}

/**
 `InternalModelMap` is a custom storage map for internalModels of a given modelName
 used by `IdentityMap`.

 It was extracted from an implicit pojo based "internalModel map" and preserves
 that interface while we work towards a more official API.

 @class InternalModelMap
 @private
 */
class InternalModelMap {
  constructor(modelName) {
    this.modelName = modelName;
    this._idToModel = Object.create(null);
    this._models = [];
    this._metadata = null;
  }

  /**
    A "map" of records based on their ID for this modelName
   */
  get idToRecord() {
    deprecate('Use of InternalModelMap.idToRecord is deprecated, use InternalModelMap.get(id) instead.', false, {
      id: 'ds.record-map.idToRecord',
      until: '2.13'
    });
    return this._idToModel;
  }

  /**
   *
   * @param id
   * @returns {InternalModel}
   */
  get(id) {
    let r = this._idToModel[id];
    return r;
  }

  has(id) {
    return !!this._idToModel[id];
  }

  get length() {
    return this._models.length;
  }

  set(id, internalModel) {
    assert(`You cannot index an internalModel by an empty id'`, id);
    assert(`You cannot set an index for an internalModel to something other than an internalModel`, internalModel instanceof InternalModel);
    assert(`You cannot set an index for an internalModel that is not in the InternalModelMap`, this.contains(internalModel));
    assert(`You cannot update the id index of an InternalModel once set. Attempted to update ${id}.`, !this.has(id) || this.get(id) === internalModel);

    this._idToModel[id] = internalModel;
  }

  add(internalModel, id) {
    assert(`You cannot re-add an already present InternalModel to the InternalModelMap.`, !this.contains(internalModel));

    if (id) {
      this._idToModel[id] = internalModel;
    }

    this._models.push(internalModel);
  }

  remove(internalModel, id) {
    if (id) {
      delete this._idToModel[id];
    }

    let loc = this._models.indexOf(internalModel);

    if (loc !== -1) {
      this._models.splice(loc, 1);
    }
  }

  contains(internalModel) {
    return this._models.indexOf(internalModel) !== -1;
  }

  /**
   An array of all models of this modelName
   */
  get models() {
    return this._models;
  }

  /**
   * meta information about internalModels
   */
  get metadata() {
    return this._metadata || (this._metadata = Object.create(null));
  }

  /**
   deprecated (and unsupported) way of accessing modelClass

   @deprecated
   */
  get type() {
    throw new Error('InternalModelMap.type is no longer available');
  }

  /**
   Destroy all models in the internalModelTest and wipe metadata.

   @method clear
   */
  clear() {
    if (this._models) {
      let models = this._models;
      this._models = [];

      for (let i = 0; i < models.length; i++) {
        let model = models[i];
        model.unloadRecord();
      }
    }

    this._metadata = null;
  }

  destroy() {
    this._store = null;
    this._modelClass = null;
  }
}

/**
 `IdentityMap` is a custom storage map for records by modelName
 used by `DS.Store`.

 @class IdentityMap
 @private
 */
class IdentityMap {
  constructor() {
    this._map = Object.create(null);
  }

  /**
   Retrieves the `InternalModelMap` for a given modelName,
   creating one if one did not already exist. This is
   similar to `getWithDefault` or `get` on a `MapWithDefault`

   @method retrieve
   @param modelName a previously normalized modelName
   @returns {InternalModelMap} the InternalModelMap for the given modelName
   */
  retrieve(modelName) {
    let map = this._map[modelName];

    if (!map) {
      map = this._map[modelName] = new InternalModelMap(modelName);
    }

    return map;
  }

  /**
   Clears the contents of all known `RecordMaps`, but does
   not remove the InternalModelMap instances.

   @method clear
   */
  clear() {
    let map = this._map;
    let keys = Object.keys(map);

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      map[key].clear();
    }
  }
}

/*
  This is a helper method that validates a JSON API top-level document

  The format of a document is described here:
  http://jsonapi.org/format/#document-top-level

  @method validateDocumentStructure
  @param {Object} doc JSON API document
  @return {array} An array of errors found in the document structure
*/
function validateDocumentStructure(doc) {
  let errors = [];
  if (!doc || typeof doc !== 'object') {
    errors.push('Top level of a JSON API document must be an object');
  } else {
    if (!('data' in doc) &&
        !('errors' in doc) &&
        !('meta' in doc)) {
      errors.push('One or more of the following keys must be present: "data", "errors", "meta".');
    } else {
      if (('data' in doc) && ('errors' in doc)) {
        errors.push('Top level keys "errors" and "data" cannot both be present in a JSON API document');
      }
    }
    if ('data' in doc) {
      if (!(doc.data === null || Array.isArray(doc.data) || typeof doc.data === 'object')) {
        errors.push('data must be null, an object, or an array');
      }
    }
    if ('meta' in doc) {
      if (typeof doc.meta !== 'object') {
        errors.push('meta must be an object');
      }
    }
    if ('errors' in doc) {
      if (!Array.isArray(doc.errors)) {
        errors.push('errors must be an array');
      }
    }
    if ('links' in doc) {
      if (typeof doc.links !== 'object') {
        errors.push('links must be an object');
      }
    }
    if ('jsonapi' in doc) {
      if (typeof doc.jsonapi !== 'object') {
        errors.push('jsonapi must be an object');
      }
    }
    if ('included' in doc) {
      if (typeof doc.included !== 'object') {
        errors.push('included must be an array');
      }
    }
  }

  return errors;
}

/*
  This is a helper method that always returns a JSON-API Document.

  @method normalizeResponseHelper
  @param {DS.Serializer} serializer
  @param {DS.Store} store
  @param {subclass of DS.Model} modelClass
  @param {Object} payload
  @param {String|Number} id
  @param {String} requestType
  @return {Object} JSON-API Document
*/
function normalizeResponseHelper(serializer, store, modelClass, payload, id, requestType) {
  let normalizedResponse = serializer.normalizeResponse(store, modelClass, payload, id, requestType);
  let validationErrors = [];
  runInDebug(() => {
    validationErrors = validateDocumentStructure(normalizedResponse);
  });
  assert(`normalizeResponse must return a valid JSON API document:\n\t* ${validationErrors.join('\n\t* ')}`, Ember.isEmpty(validationErrors));

  return normalizedResponse;
}

function serializerForAdapter(store, adapter, modelName) {
  let serializer = adapter.serializer;

  if (serializer === undefined) {
    serializer = store.serializerFor(modelName);
  }

  if (serializer === null || serializer === undefined) {
    serializer = {
      extract(store, type, payload) { return payload; }
    };
  }

  return serializer;
}

/**
  Manages the payloads for both sides of a single relationship, across all model
  instances.

  For example, with

    const User = DS.Model.extend({
      hobbies: DS.hasMany('hobby')
    });

    const Hobby = DS.Model.extend({
      user: DS.belongsTo('user')
    });

    let relationshipPayloads = new RelationshipPayloads('user', 'hobbies', 'hobby', 'user');

    let userPayload = {
      data: {
        id: 1,
        type: 'user',
        relationships: {
          hobbies: {
            data: [{
              id: 2,
              type: 'hobby',
            }]
          }
        }
      }
    };

    // here we expect the payload of the individual relationship
    relationshipPayloads.push('user', 1, 'hobbies', userPayload.data.relationships.hobbies);

    relationshipPayloads.get('user', 1, 'hobbies');
    relationshipPayloads.get('hobby', 2, 'user');

  @class RelationshipPayloads
  @private
*/
class RelationshipPayloads {
  constructor(store, modelName, relationshipName, relationshipMeta, inverseModelName, inverseRelationshipName, inverseRelationshipMeta) {
    this._store = store;

    this._lhsModelName = modelName;
    this._lhsRelationshipName = relationshipName;
    this._lhsRelationshipMeta = relationshipMeta;

    this._rhsModelName = inverseModelName;
    this._rhsRelationshipName = inverseRelationshipName;
    this._rhsRelationshipMeta = inverseRelationshipMeta;

    // a map of id -> payloads for the left hand side of the relationship.
    this._lhsPayloads = Object.create(null);
    if (modelName !== inverseModelName || relationshipName !== inverseRelationshipName) {
      // The common case of a non-reflexive relationship, or a reflexive
      // relationship whose inverse is not itself
      this._rhsPayloads = Object.create(null);
      this._isReflexive = false;
    } else {
      // Edge case when we have a reflexive relationship to itself
      //  eg user hasMany friends inverse friends
      //
      //  In this case there aren't really two sides to the relationship, but
      //  we set `_rhsPayloads = _lhsPayloads` to make things easier to reason
      //  about
      this._rhsPayloads = this._lhsPayloads;
      this._isReflexive = true;
    }

    // When we push relationship payloads, just stash them in a queue until
    // somebody actually asks for one of them.
    //
    // This is a queue of the relationship payloads that have been pushed for
    // either side of this relationship
    this._pendingPayloads = [];
  }

  /**
    Get the payload for the relationship of an individual record.

    This might return the raw payload as pushed into the store, or one computed
    from the payload of the inverse relationship.

    @method
  */
  get(modelName, id, relationshipName) {
    this._flushPending();

    if (this._isLHS(modelName, relationshipName)) {
      return this._lhsPayloads[id];
    } else {
      assert(`${modelName}:${relationshipName} is not either side of this relationship, ${this._lhsModelName}:${this._lhsRelationshipName}<->${this._rhsModelName}:${this._rhsRelationshipName}`, this._isRHS(modelName, relationshipName));
      return this._rhsPayloads[id];
    }
  }

  /**
    Push a relationship payload for an individual record.

    This will make the payload available later for both this relationship and its inverse.

    @method
  */
  push(modelName, id, relationshipName, relationshipData) {
    this._pendingPayloads.push([modelName, id, relationshipName, relationshipData]);
  }

  /**
    Unload the relationship payload for an individual record.

    This does not unload the inverse relationship payload.

    @method
  */
  unload(modelName, id, relationshipName) {
    this._flushPending();

    if (this._isLHS(modelName, relationshipName)) {
      delete this._lhsPayloads[id];
    } else {
      assert(`${modelName}:${relationshipName} is not either side of this relationship, ${this._lhsModelName}:${this._lhsRelationshipName}<->${this._rhsModelName}:${this._rhsRelationshipName}`, this._isRHS(modelName, relationshipName));
      delete this._rhsPayloads[id];
    }
  }

  /**
    @return {boolean} true iff `modelName` and `relationshipName` refer to the
    left hand side of this relationship, as opposed to the right hand side.

    @method
  */
  _isLHS(modelName, relationshipName) {
    return modelName === this._lhsModelName && relationshipName === this._lhsRelationshipName;
  }

  /**
    @return {boolean} true iff `modelName` and `relationshipName` refer to the
    right hand side of this relationship, as opposed to the left hand side.

    @method
  */
  _isRHS(modelName, relationshipName) {
    return modelName === this._rhsModelName && relationshipName === this._rhsRelationshipName;
  }

  _flushPending() {
    if (this._pendingPayloads.length === 0) { return; }

    let payloadsToBeProcessed = this._pendingPayloads.splice(0, this._pendingPayloads.length);
    for (let i=0; i<payloadsToBeProcessed.length; ++i) {
      let modelName = payloadsToBeProcessed[i][0];
      let id = payloadsToBeProcessed[i][1];
      let relationshipName = payloadsToBeProcessed[i][2];
      let relationshipData = payloadsToBeProcessed[i][3];

      // TODO: maybe delay this allocation slightly?
      let inverseRelationshipData = {
        data: {
          id: id,
          type: modelName
        }
      };

      // start flushing this individual payload.  The logic is the same whether
      // it's for the left hand side of the relationship or the right hand side,
      // except the role of primary and inverse idToPayloads is reversed
      //
      let previousPayload;
      let idToPayloads;
      let inverseIdToPayloads;
      let inverseIsMany;
      if (this._isLHS(modelName, relationshipName)) {
        previousPayload = this._lhsPayloads[id];
        idToPayloads = this._lhsPayloads;
        inverseIdToPayloads = this._rhsPayloads;
        inverseIsMany = this._rhsRelationshipIsMany;
      } else {
        assert(`${modelName}:${relationshipName} is not either side of this relationship, ${this._lhsModelName}:${this._lhsRelationshipName}<->${this._rhsModelName}:${this._rhsRelationshipName}`, this._isRHS(modelName, relationshipName));
        previousPayload = this._rhsPayloads[id];
        idToPayloads = this._rhsPayloads;
        inverseIdToPayloads = this._lhsPayloads;
        inverseIsMany = this._lhsRelationshipIsMany;
      }

      // actually flush this individual payload
      //
      // We remove the previous inverse before populating our current one
      // because we may have multiple payloads for the same relationship, in
      // which case the last one wins.
      //
      // eg if user hasMany helicopters, and helicopter belongsTo user and we see
      //
      //  [{
      //    data: {
      //      id: 1,
      //      type: 'helicopter',
      //      relationships: {
      //        user: {
      //          id: 2,
      //          type: 'user'
      //        }
      //      }
      //    }
      //  }, {
      //    data: {
      //      id: 1,
      //      type: 'helicopter',
      //      relationships: {
      //        user: {
      //          id: 4,
      //          type: 'user'
      //        }
      //      }
      //    }
      //  }]
      //
      // Then we will initially have set user:2 as having helicopter:1, which we
      // need to remove before adding helicopter:1 to user:4
      //
      this._removeInverse(id, previousPayload, inverseIdToPayloads);
      idToPayloads[id] = relationshipData;
      this._populateInverse(relationshipData, inverseRelationshipData, inverseIdToPayloads, inverseIsMany);
    }
  }

  /**
    Populate the inverse relationship for `relationshipData`.

    If `relationshipData` is an array (eg because the relationship is hasMany)
    this means populate each inverse, otherwise populate only the single
    inverse.

    @private
    @method
  */
  _populateInverse(relationshipData, inversePayload, inverseIdToPayloads, inverseIsMany) {
    if (!relationshipData.data) {
      // This id doesn't have an inverse, eg a belongsTo with a payload
      // { data: null }, so there's nothing to populate
      return;
    }

    if (Array.isArray(relationshipData.data)) {
      for (let i=0; i<relationshipData.data.length; ++i) {
        let inverseId = relationshipData.data[i].id;
        this._addToInverse(inversePayload, inverseId, inverseIdToPayloads, inverseIsMany);
      }
    } else {
      let inverseId = relationshipData.data.id;
      this._addToInverse(inversePayload, inverseId, inverseIdToPayloads, inverseIsMany);
    }
  }

  /**
    Actually add `inversePayload` to `inverseIdToPayloads`.  This is part of
    `_populateInverse` after we've normalized the case of `relationshipData`
    being either an array or a pojo.

    We still have to handle the case that the *inverse* relationship payload may
    be an array or pojo.

    @private
    @method
  */
  _addToInverse(inversePayload, inverseId, inverseIdToPayloads, inverseIsMany) {
    if (this._isReflexive && inversePayload.data.id === inverseId) {
      // eg <user:1>.friends = [{ id: 1, type: 'user' }]
      return;
    }

    let existingPayload = inverseIdToPayloads[inverseId];
    let existingData = existingPayload && existingPayload.data;

    if (existingData) {
      // There already is an inverse, either add or overwrite depehnding on
      // whether the inverse is a many relationship or not
      //
      if (Array.isArray(existingData)) {
        existingData.push(inversePayload.data);
      } else {
        inverseIdToPayloads[inverseId] = inversePayload;
      }
    } else {
      // first time we're populating the inverse side
      //
      if (inverseIsMany) {
        inverseIdToPayloads[inverseId] = {
          data: [inversePayload.data]
        };
      } else {
        inverseIdToPayloads[inverseId] = inversePayload;
      }
    }
  }

  get _lhsRelationshipIsMany() {
    return this._lhsRelationshipMeta && this._lhsRelationshipMeta.kind === 'hasMany';
  }

  get _rhsRelationshipIsMany() {
    return this._rhsRelationshipMeta && this._rhsRelationshipMeta.kind === 'hasMany';
  }

  /**
    Remove the relationship in `previousPayload` from its inverse(s), because
    this relationship payload has just been updated (eg because the same
    relationship had multiple payloads pushed before the relationship was
    initialized).

    @method
  */
  _removeInverse(id, previousPayload, inverseIdToPayloads) {
    let data = previousPayload && previousPayload.data;
    if (!data) {
      // either this is the first time we've seen a payload for this id, or its
      // previous payload indicated that it had no inverse, eg a belongsTo
      // relationship with payload { data: null }
      //
      // In either case there's nothing that needs to be removed from the
      // inverse map of payloads
      return;
    }

    if (Array.isArray(data)) {
      // TODO: diff rather than removeall addall?
      for (let i=0; i<data.length; ++i) {
        this._removeFromInverse(id, data[i].id, inverseIdToPayloads);
      }
    } else {
      this._removeFromInverse(id, data.id, inverseIdToPayloads);
    }
  }

  /**
    Remove `id` from its inverse record with id `inverseId`.  If the inverse
    relationship is a belongsTo, this means just setting it to null, if the
    inverse relationship is a hasMany, then remove that id from its array of ids.

    @method
  */
  _removeFromInverse(id, inverseId, inversePayloads) {
    let inversePayload = inversePayloads[inverseId];
    let data = inversePayload && inversePayload.data;

    if (!data) { return; }

    if (Array.isArray(data)) {
      inversePayload.data = data.filter((x) => x.id !== id);
    } else {
      inversePayloads[inverseId] = {
        data: null
      };
    }
  }
}

const get$11 = Ember.get;

/**
  Manages relationship payloads for a given store, for uninitialized
  relationships.  Acts as a single source of truth (of payloads) for both sides
  of an uninitialized relationship so they can agree on the most up-to-date
  payload received without needing too much eager processing when those payloads
  are pushed into the store.

  This minimizes the work spent on relationships that are never initialized.

  Once relationships are initialized, their state is managed in a relationship
  state object (eg BelongsToRelationship or ManyRelationship).


  @example

    let relationshipPayloadsManager = new RelationshipPayloadsManager(store);

    const User = DS.Model.extend({
      hobbies: DS.hasMany('hobby')
    });

    const Hobby = DS.Model.extend({
      user: DS.belongsTo('user')
    });

    let userPayload = {
      data: {
        id: 1,
        type: 'user',
        relationships: {
          hobbies: {
            data: [{
              id: 2,
              type: 'hobby'
            }]
          }
        }
      },
    };
    relationshipPayloadsManager.push('user', 1, userPayload.data.relationships);

    relationshipPayloadsManager.get('hobby', 2, 'user') === {
      {
        data: {
          id: 1,
          type: 'user'
        }
      }
    }

  @private
  @class RelationshipPayloadsManager
*/
class RelationshipPayloadsManager {
  constructor(store) {
    this._store = store;
    // cache of `RelationshipPayload`s
    this._cache = Object.create(null);
  }

  /**
    Find the payload for the given relationship of the given model.

    Returns the payload for the given relationship, whether raw or computed from
    the payload of the inverse relationship.

    @example

      relationshipPayloadsManager.get('hobby', 2, 'user') === {
        {
          data: {
            id: 1,
            type: 'user'
          }
        }
      }

    @method
  */
  get(modelName, id, relationshipName) {
    let modelClass = this._store._modelFor(modelName);
    let relationshipsByName = get$11(modelClass, 'relationshipsByName');
    let relationshipPayloads = this._getRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName, false);
    return relationshipPayloads && relationshipPayloads.get(modelName, id, relationshipName);
  }

  /**
    Push a model's relationships payload into this cache.

    @example

      let userPayload = {
        data: {
          id: 1,
          type: 'user',
          relationships: {
            hobbies: {
              data: [{
                id: 2,
                type: 'hobby'
              }]
            }
          }
        },
      };
      relationshipPayloadsManager.push('user', 1, userPayload.data.relationships);

    @method
  */
  push(modelName, id, relationshipsData) {
    if (!relationshipsData) { return; }

    let modelClass = this._store._modelFor(modelName);
    let relationshipsByName = get$11(modelClass, 'relationshipsByName');
    Object.keys(relationshipsData).forEach(key => {
      let relationshipPayloads = this._getRelationshipPayloads(modelName, key, modelClass, relationshipsByName, true);
      if (relationshipPayloads) {
        relationshipPayloads.push(modelName, id, key, relationshipsData[key]);
      }
    });
  }

  /**
    Unload a model's relationships payload.

    @method
  */
  unload(modelName, id) {
    let modelClass = this._store._modelFor(modelName);
    let relationshipsByName = get$11(modelClass, 'relationshipsByName');
    relationshipsByName.forEach((_, relationshipName) => {
      let relationshipPayloads = this._getRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName, false);
      if (relationshipPayloads) {
        relationshipPayloads.unload(modelName, id, relationshipName);
      }
    });
  }

  /**
    Find the RelationshipPayloads object for the given relationship.  The same
    RelationshipPayloads object is returned for either side of a relationship.

    @example

      const User = DS.Model.extend({
        hobbies: DS.hasMany('hobby')
      });

      const Hobby = DS.Model.extend({
        user: DS.belongsTo('user')
      });

      relationshipPayloads.get('user', 'hobbies') === relationshipPayloads.get('hobby', 'user');

    The signature has a somewhat large arity to avoid extra work, such as
      a)  string maipulation & allocation with `modelName` and
         `relationshipName`
      b)  repeatedly getting `relationshipsByName` via `Ember.get`


    @private
    @method
  */
  _getRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName, init) {
    if (!relationshipsByName.has(relationshipName)) { return; }

    let key = `${modelName}:${relationshipName}`;
    if (!this._cache[key] && init) {
      return this._initializeRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName);
    }

    return this._cache[key];
  }

  /**
    Create the `RelationshipsPayload` for the relationship `modelName`, `relationshipName`, and its inverse.

    @private
    @method
  */
  _initializeRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName) {
    let relationshipMeta = relationshipsByName.get(relationshipName);
    let inverseMeta = modelClass.inverseFor(relationshipName, this._store);

    let inverseModelName;
    let inverseRelationshipName;
    let inverseRelationshipMeta;

    // figure out the inverse relationship; we need two things
    //  a) the inverse model name
    //- b) the name of the inverse relationship
    if (inverseMeta) {
      inverseRelationshipName = inverseMeta.name;
      inverseModelName = relationshipMeta.type;
      inverseRelationshipMeta = get$11(inverseMeta.type, 'relationshipsByName').get(inverseRelationshipName);
    } else {
      // relationship has no inverse
      inverseModelName = inverseRelationshipName = '';
      inverseRelationshipMeta = null;
    }

    let lhsKey = `${modelName}:${relationshipName}`;
    let rhsKey = `${inverseModelName}:${inverseRelationshipName}`;

    // populate the cache for both sides of the relationship, as they both use
    // the same `RelationshipPayloads`.
    //
    // This works out better than creating a single common key, because to
    // compute that key we would need to do work to look up the inverse
    //
    return this._cache[lhsKey] =
      this._cache[rhsKey] =
      new RelationshipPayloads(
        this._store,
        modelName,
        relationshipName,
        relationshipMeta,
        inverseModelName,
        inverseRelationshipName,
        inverseRelationshipMeta
      );
  }
}

const { Promise: Promise$3 } = Ember.RSVP;

function payloadIsNotBlank(adapterPayload) {
  if (Array.isArray(adapterPayload)) {
    return true;
  } else {
    return Object.keys(adapterPayload || {}).length;
  }
}

function _find(adapter, store, modelClass, id, internalModel, options) {
  let snapshot = internalModel.createSnapshot(options);
  let { modelName } = internalModel;
  let promise = adapter.findRecord(store, modelClass, id, snapshot);
  let label = `DS: Handle Adapter#findRecord of '${modelName}' with id: '${id}'`;

  promise = Promise$3.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(adapterPayload => {
    assert(`You made a 'findRecord' request for a '${modelName}' with id '${id}', but the adapter's response did not have any data`, payloadIsNotBlank(adapterPayload));
    let serializer = serializerForAdapter(store, adapter, modelName);
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, id, 'findRecord');
    assert(`Ember Data expected the primary data returned from a 'findRecord' response to be an object but instead it found an array.`, !Array.isArray(payload.data));

    warn(`You requested a record of type '${modelName}' with id '${id}' but the adapter returned a payload with primary data having an id of '${payload.data.id}'. Use 'store.findRecord()' when the requested id is the same as the one returned by the adapter. In other cases use 'store.queryRecord()' instead http://emberjs.com/api/data/classes/DS.Store.html#method_queryRecord`, payload.data.id === id, {
      id: 'ds.store.findRecord.id-mismatch'
    });

    return store._push(payload);
  }, error => {
    internalModel.notFound();
    if (internalModel.isEmpty()) {
      internalModel.unloadRecord();
    }

    throw error;
  }, `DS: Extract payload of '${modelName}'`);
}

function _findMany(adapter, store, modelName, ids, internalModels) {
  let snapshots = Ember.A(internalModels).invoke('createSnapshot');
  let modelClass = store.modelFor(modelName); // `adapter.findMany` gets the modelClass still
  let promise = adapter.findMany(store, modelClass, ids, snapshots);
  let label = `DS: Handle Adapter#findMany of '${modelName}'`;

  if (promise === undefined) {
    throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
  }

  promise = Promise$3.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(adapterPayload => {
    assert(`You made a 'findMany' request for '${modelName}' records with ids '[${ids}]', but the adapter's response did not have any data`, payloadIsNotBlank(adapterPayload));
    let serializer = serializerForAdapter(store, adapter, modelName);
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findMany');
    return store._push(payload);
  }, null, `DS: Extract payload of ${modelName}`);
}

function _findHasMany(adapter, store, internalModel, link, relationship) {
  let snapshot = internalModel.createSnapshot();
  let modelClass = store.modelFor(relationship.type);
  let promise = adapter.findHasMany(store, snapshot, link, relationship);
  let label = `DS: Handle Adapter#findHasMany of '${internalModel.modelName}' : '${relationship.type}'`;

  promise = Promise$3.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(adapterPayload => {
    assert(`You made a 'findHasMany' request for a ${internalModel.modelName}'s '${relationship.key}' relationship, using link '${link}' , but the adapter's response did not have any data`, payloadIsNotBlank(adapterPayload));
    let serializer = serializerForAdapter(store, adapter, relationship.type);
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findHasMany');
    let internalModelArray = store._push(payload);

    internalModelArray.meta = payload.meta;
    return internalModelArray;
  }, null, `DS: Extract payload of '${internalModel.modelName}' : hasMany '${relationship.type}'`);
}

function _findBelongsTo(adapter, store, internalModel, link, relationship) {
  let snapshot = internalModel.createSnapshot();
  let modelClass = store.modelFor(relationship.type);
  let promise = adapter.findBelongsTo(store, snapshot, link, relationship);
  let label = `DS: Handle Adapter#findBelongsTo of ${internalModel.modelName} : ${relationship.type}`;

  promise = Promise$3.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(adapterPayload => {
    let serializer = serializerForAdapter(store, adapter, relationship.type);
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findBelongsTo');

    if (!payload.data) {
      return null;
    }

    return store._push(payload);
  }, null, `DS: Extract payload of ${internalModel.modelName} : ${relationship.type}`);
}

function _findAll(adapter, store, modelName, sinceToken, options) {
  let modelClass = store.modelFor(modelName); // adapter.findAll depends on the class
  let recordArray = store.peekAll(modelName);
  let snapshotArray = recordArray._createSnapshot(options);
  let promise = adapter.findAll(store, modelClass, sinceToken, snapshotArray);
  let label = "DS: Handle Adapter#findAll of " + modelClass;

  promise = Promise$3.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(adapterPayload =>  {
    assert(`You made a 'findAll' request for '${modelName}' records, but the adapter's response did not have any data`, payloadIsNotBlank(adapterPayload));
    let serializer = serializerForAdapter(store, adapter, modelName);
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findAll');

    store._push(payload);
    store._didUpdateAll(modelName);

    return recordArray;
  }, null, 'DS: Extract payload of findAll ${modelName}');
}

function _query(adapter, store, modelName, query, recordArray) {
  let modelClass = store.modelFor(modelName); // adapter.query needs the class
  let promise = adapter.query(store, modelClass, query, recordArray);

  let label = `DS: Handle Adapter#query of ${modelClass}`;

  promise = Promise$3.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(adapterPayload => {
    let serializerToken = heimdall.start('initial-serializerFor-lookup');
    let serializer = serializerForAdapter(store, adapter, modelName);
    heimdall.stop(serializerToken);
    let normalizeToken = heimdall.start('finders#_query::normalizeResponseHelper');
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'query');
    heimdall.stop(normalizeToken);
    let internalModels = store._push(payload);

    assert('The response to store.query is expected to be an array but it was a single record. Please wrap your response in an array or use `store.queryRecord` to query for a single record.', Array.isArray(internalModels));
    recordArray._setInternalModels(internalModels, payload);

    return recordArray;
  }, null, `DS: Extract payload of query ${modelName}`);
}

function _queryRecord(adapter, store, modelName, query) {
  let modelClass = store.modelFor(modelName); // adapter.queryRecord needs the class
  let promise = adapter.queryRecord(store, modelClass, query);
  let label = `DS: Handle Adapter#queryRecord of ${modelName}`;

  promise = Promise$3.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(adapterPayload => {
    let serializer = serializerForAdapter(store, adapter, modelName);
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'queryRecord');

    assert(`Expected the primary data returned by the serializer for a 'queryRecord' response to be a single object or null but instead it was an array.`, !Array.isArray(payload.data), {
      id: 'ds.store.queryRecord-array-response'
    });

    return store._push(payload);
  }, null, `DS: Extract payload of queryRecord ${modelName}`);
}

// Used by the store to normalize IDs entering the store.  Despite the fact
// that developers may provide IDs as numbers (e.g., `store.findRecord('person', 1)`),
// it is important that internally we use strings, since IDs may be serialized
// and lose type information.  For example, Ember's router may put a record's
// ID into the URL, and if we later try to deserialize that URL and find the
// corresponding record, we will not know if it is a string or a number.
function coerceId(id) {
  return id === null || id === undefined || id === '' ? null : id+'';
}

/**
  @module ember-data
*/

/**
  @class SnapshotRecordArray
  @namespace DS
  @private
  @constructor
  @param {Array} snapshots An array of snapshots
  @param {Object} meta
*/
class SnapshotRecordArray {
  constructor(recordArray, meta, options = {}) {
    /**
      An array of snapshots
      @private
      @property _snapshots
      @type {Array}
    */
    this._snapshots = null;

    /**
      An array of records
      @private
      @property _recordArray
      @type {Array}
    */
    this._recordArray = recordArray;

    /**
      Number of records in the array

      Example

      ```app/adapters/post.js
      import DS from 'ember-data'

      export default DS.JSONAPIAdapter.extend({
        shouldReloadAll(store, snapshotRecordArray) {
          return !snapshotRecordArray.length;
        },
      });
      ```

      @property length
      @type {Number}
    */
    this.length = recordArray.get('length');

    this._type = null;

    /**
      Meta objects for the record array.

      Example

      ```app/adapters/post.js
      import DS from 'ember-data'

      export default DS.JSONAPIAdapter.extend({
        shouldReloadAll(store, snapshotRecordArray) {
          var lastRequestTime = snapshotRecordArray.meta.lastRequestTime;
          var twentyMinutes = 20 * 60 * 1000;
          return Date.now() > lastRequestTime + twentyMinutes;
        },
      });
      ```

      @property meta
      @type {Object}
    */
    this.meta = meta;

    /**
      A hash of adapter options passed into the store method for this request.

      Example

      ```app/adapters/post.js
      import MyCustomAdapter from './custom-adapter';

      export default MyCustomAdapter.extend({
        findAll(store, type, sinceToken, snapshotRecordArray) {
          if (snapshotRecordArray.adapterOptions.subscribe) {
            // ...
          }
          // ...
        }
      });
      ```

      @property adapterOptions
      @type {Object}
    */
    this.adapterOptions = options.adapterOptions;

    /**
      The relationships to include for this request.

      Example

      ```app/adapters/application.js
      import DS from 'ember-data';

      export default DS.Adapter.extend({
        findAll(store, type, snapshotRecordArray) {
          var url = `/${type.modelName}?include=${encodeURIComponent(snapshotRecordArray.include)}`;

          return fetch(url).then((response) => response.json())
        }
      });

      @property include
      @type {String|Array}
    */
    this.include = options.include;
  }

  /**
    The type of the underlying records for the snapshots in the array, as a DS.Model
    @property type
    @type {DS.Model}
  */
  get type() {
    return this._type || (this._type = this._recordArray.get('type'));
  }

  /**
    Get snapshots of the underlying record array

    Example

    ```app/adapters/post.js
    import DS from 'ember-data'

    export default DS.JSONAPIAdapter.extend({
      shouldReloadAll(store, snapshotArray) {
        var snapshots = snapshotArray.snapshots();

        return snapshots.any(function(ticketSnapshot) {
          var timeDiff = moment().diff(ticketSnapshot.attr('lastAccessedAt'), 'minutes');
          if (timeDiff > 20) {
            return true;
          } else {
            return false;
          }
        });
      }
    });
    ```

    @method snapshots
    @return {Array} Array of snapshots
  */
  snapshots() {
    if (this._snapshots !== null) {
      return this._snapshots;
    }

    this._snapshots = this._recordArray._takeSnapshot();

    return this._snapshots;
  }
}

/**
  @module ember-data
*/

const { computed: computed$2, get: get$13, set: set$3, RSVP: { Promise: Promise$4 } } = Ember;

/**
  A record array is an array that contains records of a certain modelName. The record
  array materializes records as needed when they are retrieved for the first
  time. You should not create record arrays yourself. Instead, an instance of
  `DS.RecordArray` or its subclasses will be returned by your application's store
  in response to queries.

  @class RecordArray
  @namespace DS
  @extends Ember.ArrayProxy
  @uses Ember.Evented
*/

var RecordArray = Ember.ArrayProxy.extend(Ember.Evented, {
  init() {
    this._super(...arguments);

    /**
      The array of client ids backing the record array. When a
      record is requested from the record array, the record
      for the client id at the same index is materialized, if
      necessary, by the store.

      @property content
      @private
      @type Ember.Array
      */
    this.set('content', this.content || null);

    /**
    The flag to signal a `RecordArray` is finished loading data.

    Example

    ```javascript
    var people = store.peekAll('person');
    people.get('isLoaded'); // true
    ```

    @property isLoaded
    @type Boolean
    */
    this.isLoaded = this.isLoaded || false;
      /**
    The flag to signal a `RecordArray` is currently loading data.

    Example

    ```javascript
    var people = store.peekAll('person');
    people.get('isUpdating'); // false
    people.update();
    people.get('isUpdating'); // true
    ```

    @property isUpdating
    @type Boolean
    */
    this.isUpdating = false;

      /**
    The store that created this record array.

    @property store
    @private
    @type DS.Store
    */
    this.store = this.store || null;
    this._updatingPromise = null;
  },

  replace() {
    throw new Error(`The result of a server query (for all ${this.modelName} types) is immutable. To modify contents, use toArray()`);
  },

  /**
   The modelClass represented by this record array.

   @property type
   @type DS.Model
   */
  type: computed$2('modelName', function() {
    if (!this.modelName) {
      return null;
    }
    return this.store._modelFor(this.modelName);
  }).readOnly(),

  /**
    Retrieves an object from the content by index.

    @method objectAtContent
    @private
    @param {Number} index
    @return {DS.Model} record
  */
  objectAtContent(index) {
    let internalModel = get$13(this, 'content').objectAt(index);
    return internalModel && internalModel.getRecord();
  },

  /**
    Used to get the latest version of all of the records in this array
    from the adapter.

    Example

    ```javascript
    var people = store.peekAll('person');
    people.get('isUpdating'); // false

    people.update().then(function() {
      people.get('isUpdating'); // false
    });

    people.get('isUpdating'); // true
    ```

    @method update
  */
  update() {
    if (get$13(this, 'isUpdating')) { return this._updatingPromise; }

    this.set('isUpdating', true);

    let updatingPromise = this._update().finally(() => {
      this._updatingPromise = null;
      if (this.get('isDestroying') || this.get('isDestroyed')) { return }
      this.set('isUpdating', false);
    });

    this._updatingPromise = updatingPromise;

    return updatingPromise;
  },

  /*
    Update this RecordArray and return a promise which resolves once the update
    is finished.
   */
  _update() {
    return this.store.findAll(this.modelName, { reload: true });
  },

  /**
    Adds an internal model to the `RecordArray` without duplicates

    @method _pushInternalModels
    @private
    @param {InternalModel} internalModel
  */
  _pushInternalModels(internalModels) {
    // pushObjects because the internalModels._recordArrays set was already
    // consulted for inclusion, so addObject and its on .contains call is not
    // required.
    get$13(this, 'content').pushObjects(internalModels);
  },

  /**
    Removes an internalModel to the `RecordArray`.

    @method removeInternalModel
    @private
    @param {InternalModel} internalModel
  */
  _removeInternalModels(internalModels) {
    get$13(this, 'content').removeObjects(internalModels);
  },

  /**
    Saves all of the records in the `RecordArray`.

    Example

    ```javascript
    var messages = store.peekAll('message');
    messages.forEach(function(message) {
      message.set('hasBeenSeen', true);
    });
    messages.save();
    ```

    @method save
    @return {DS.PromiseArray} promise
  */
  save() {
    let promiseLabel = `DS: RecordArray#save ${this.modelName}`;
    let promise = Promise$4.all(this.invoke('save'), promiseLabel)
      .then(() => this, null, 'DS: RecordArray#save return RecordArray');

    return PromiseArray.create({ promise });
  },

  _dissociateFromOwnRecords() {
    this.get('content').forEach(internalModel => {
      let recordArrays = internalModel.__recordArrays;

      if (recordArrays) {
        recordArrays.delete(this);
      }
    });
  },

  /**
    @method _unregisterFromManager
    @private
  */
  _unregisterFromManager() {
    this.manager.unregisterRecordArray(this);
  },

  willDestroy() {
    this._unregisterFromManager();
    this._dissociateFromOwnRecords();
    // TODO: we should not do work during destroy:
    //   * when objects are destroyed, they should simply be left to do
    //   * if logic errors do to this, that logic needs to be more careful during
    //    teardown (ember provides isDestroying/isDestroyed) for this reason
    //   * the exception being: if an dominator has a reference to this object,
    //     and must be informed to release e.g. e.g. removing itself from th
    //     recordArrayMananger
    set$3(this, 'content', null);
    set$3(this, 'length', 0);
    this._super(...arguments);
  },

  /*
    @method _createSnapshot
    @private
  */
  _createSnapshot(options) {
    // this is private for users, but public for ember-data internals
    return new SnapshotRecordArray(this, this.get('meta'), options);
  },

  /*
    @method _takeSnapshot
    @private
  */
  _takeSnapshot() {
    return get$13(this, 'content').map(internalModel => internalModel.createSnapshot());
  }
});

/**
  @module ember-data
*/

const { get: get$14 } = Ember;

/**
  Represents a list of records whose membership is determined by the
  store. As records are created, loaded, or modified, the store
  evaluates them to determine if they should be part of the record
  array.

  @class FilteredRecordArray
  @namespace DS
  @extends DS.RecordArray
*/
var FilteredRecordArray = RecordArray.extend({
  init() {
    this._super(...arguments);

    this.set('filterFunction', this.get('filterFunction') || null);
    this.isLoaded = true;
  },
  /**
    The filterFunction is a function used to test records from the store to
    determine if they should be part of the record array.

    Example

    ```javascript
    var allPeople = store.peekAll('person');
    allPeople.mapBy('name'); // ["Tom Dale", "Yehuda Katz", "Trek Glowacki"]

    var people = store.filter('person', function(person) {
      if (person.get('name').match(/Katz$/)) { return true; }
    });
    people.mapBy('name'); // ["Yehuda Katz"]

    var notKatzFilter = function(person) {
      return !person.get('name').match(/Katz$/);
    };
    people.set('filterFunction', notKatzFilter);
    people.mapBy('name'); // ["Tom Dale", "Trek Glowacki"]
    ```

    @method filterFunction
    @param {DS.Model} record
    @return {Boolean} `true` if the record should be in the array
  */

  replace() {
    throw new Error(`The result of a client-side filter (on ${this.modelName}) is immutable.`);
  },

  /**
    @method updateFilter
    @private
  */
  _updateFilter() {
    if (get$14(this, 'isDestroying') || get$14(this, 'isDestroyed')) {
      return;
    }
    get$14(this, 'manager').updateFilter(this, this.modelName, get$14(this, 'filterFunction'));
  },

  updateFilter: Ember.observer('filterFunction', function() {
    Ember.run.once(this, this._updateFilter);
  })
});

function cloneNull(source) {
  let clone = Object.create(null);
  for (let key in source) {
    clone[key] = source[key];
  }
  return clone;
}

/**
  @module ember-data
*/

const { get: get$15 } = Ember;

/**
  Represents an ordered list of records whose order and membership is
  determined by the adapter. For example, a query sent to the adapter
  may trigger a search on the server, whose results would be loaded
  into an instance of the `AdapterPopulatedRecordArray`.

  ---

  If you want to update the array and get the latest records from the
  adapter, you can invoke [`update()`](#method_update):

  Example

  ```javascript
  // GET /users?isAdmin=true
  var admins = store.query('user', { isAdmin: true });

  admins.then(function() {
    console.log(admins.get("length")); // 42
  });

  // somewhere later in the app code, when new admins have been created
  // in the meantime
  //
  // GET /users?isAdmin=true
  admins.update().then(function() {
    admins.get('isUpdating'); // false
    console.log(admins.get("length")); // 123
  });

  admins.get('isUpdating'); // true
  ```

  @class AdapterPopulatedRecordArray
  @namespace DS
  @extends DS.RecordArray
*/
var AdapterPopulatedRecordArray = RecordArray.extend({
  init() {
    // yes we are touching `this` before super, but ArrayProxy has a bug that requires this.
    this.set('content', this.get('content') || Ember.A());

    this._super(...arguments);
    this.query = this.query || null;
    this.links = null;
  },

  replace() {
    throw new Error(`The result of a server query (on ${this.modelName}) is immutable.`);
  },

  _update() {
    let store = get$15(this, 'store');
    let query = get$15(this, 'query');

    return store._query(this.modelName, query, this);
  },

  /**
    @method _setInternalModels
    @param {Array} internalModels
    @param {Object} payload normalized payload
    @private
  */
  _setInternalModels(internalModels, payload) {
    let token = heimdall.start('AdapterPopulatedRecordArray._setInternalModels');

    // TODO: initial load should not cause change events at all, only
    // subsequent. This requires changing the public api of adapter.query, but
    // hopefully we can do that soon.
    this.get('content').setObjects(internalModels);

    this.setProperties({
      isLoaded: true,
      isUpdating: false,
      meta: cloneNull(payload.meta),
      links: cloneNull(payload.links)
    });

    for (let i = 0, l = internalModels.length; i < l; i++) {
      let internalModel = internalModels[i];

      internalModel._recordArrays.add(this);
    }

    // TODO: should triggering didLoad event be the last action of the runLoop?
    Ember.run.once(this, 'trigger', 'didLoad');
    heimdall.stop(token);
  }
});

/**
  @module ember-data
*/

/**
  @module ember-data
*/

const {
  get: get$12,
  run: emberRun$1
} = Ember;

const {
  _flush,
  array_flatten,
  array_remove,
  create,
  createAdapterPopulatedRecordArray,
  createFilteredRecordArray,
  createRecordArray,
  liveRecordArrayFor,
  filteredRecordArraysFor,
  populateLiveRecordArray,
  recordDidChange,
  registerFilteredRecordArray,
  unregisterRecordArray,
  updateFilter,
  updateFilterRecordArray
} = heimdall.registerMonitor('recordArrayManager',
  '_flush',
  'array_fatten',
  'array_remove',
  'create',
  'createAdapterPopulatedRecordArray',
  'createFilteredRecordArray',
  'createRecordArray',
  'liveRecordArrayFor',
  'filteredRecordArraysFor',
  'populateLiveRecordArray',
  'recordDidChange',
  'registerFilteredRecordArray',
  'unregisterRecordArray',
  'updateFilter',
  'updateFilterRecordArray'
);

/**
  @class RecordArrayManager
  @namespace DS
  @private
*/
class RecordArrayManager {
  constructor(options) {
    heimdall.increment(create);
    this.store = options.store;
    this.isDestroying = false;
    this.isDestroyed = false;
    this._filteredRecordArrays = Object.create(null);
    this._liveRecordArrays = Object.create(null);
    this._pending = Object.create(null);
    this._adapterPopulatedRecordArrays = [];
  }

  recordDidChange(internalModel) {
    // TODO: change name
    // TODO: track that it was also a change
    this.internalModelDidChange(internalModel);
  }

  recordWasLoaded(internalModel) {
    // TODO: change name
    // TODO: track that it was also that it was first loaded
    this.internalModelDidChange(internalModel);
  }

  internalModelDidChange(internalModel) {
    heimdall.increment(recordDidChange);

    let modelName = internalModel.modelName;

    if (internalModel._pendingRecordArrayManagerFlush) {
      return;
    }

    internalModel._pendingRecordArrayManagerFlush = true;

    let pending = this._pending;
    let models = pending[modelName] = pending[modelName] || [];
    if (models.push(internalModel) !== 1) {
      return;
    }

    emberRun$1.schedule('actions', this, this._flush);
  }

  _flush() {
    heimdall.increment(_flush);

    let pending = this._pending;
    this._pending = Object.create(null);
    let modelsToRemove = [];

    for (let modelName in pending) {
      let internalModels = pending[modelName];
      for (let j = 0; j < internalModels.length; j++) {
        let internalModel = internalModels[j];
        // mark internalModels, so they can once again be processed by the
        // recordArrayManager
        internalModel._pendingRecordArrayManagerFlush = false;
        // build up a set of models to ensure we have purged correctly;
        if (internalModel.isHiddenFromRecordArrays()) {
          modelsToRemove.push(internalModel);
        }
      }

      // process filteredRecordArrays
      if (this._filteredRecordArrays[modelName]) {
        let recordArrays = this.filteredRecordArraysFor(modelName);
        for (let i = 0; i < recordArrays.length; i++) {
          this.updateFilterRecordArray(recordArrays[i], modelName, internalModels);
        }
      }

      // TODO: skip if it only changed
      // process liveRecordArrays
      if (this._liveRecordArrays[modelName]) {
        this.updateLiveRecordArray(modelName, internalModels);
      }

      // process adapterPopulatedRecordArrays
      if (modelsToRemove.length > 0) {
        this.removeFromAdapterPopulatedRecordArrays(modelsToRemove);
      }
    }
  }

  updateLiveRecordArray(modelName, internalModels) {
    let array = this.liveRecordArrayFor(modelName);

    let modelsToAdd = [];
    let modelsToRemove = [];

    for (let i = 0; i < internalModels.length; i++) {
      let internalModel = internalModels[i];
      let isDeleted = internalModel.isHiddenFromRecordArrays();
      let recordArrays = internalModel._recordArrays;

      if (!isDeleted && !internalModel.isEmpty()) {
        if (!recordArrays.has(array)) {
          modelsToAdd.push(internalModel);
          recordArrays.add(array);
        }
      }

      if (isDeleted) {
        modelsToRemove.push(internalModel);
        recordArrays.delete(array);
      }
    }

    if (modelsToAdd.length > 0)    { array._pushInternalModels(modelsToAdd); }
    if (modelsToRemove.length > 0) { array._removeInternalModels(modelsToRemove); }
  }

  removeFromAdapterPopulatedRecordArrays(internalModels) {
    for (let i = 0; i < internalModels.length; i++) {
      let internalModel = internalModels[i];
      let list = internalModel._recordArrays.list;

      for (let j = 0; j < list.length; j++) {
        // TODO: group by arrays, so we can batch remove
        list[j]._removeInternalModels([internalModel]);
      }

      internalModel._recordArrays.clear();
    }
  }

  /**
    Update an individual filter.

    @private
    @method updateFilterRecordArray
    @param {DS.FilteredRecordArray} array
    @param {String} modelName
    @param {Array} internalModels
  */
  updateFilterRecordArray(array, modelName, internalModels) {
    heimdall.increment(updateFilterRecordArray);

    let filter = get$12(array, 'filterFunction');

    let shouldBeInAdded = [];
    let shouldBeRemoved = [];

    for (let i = 0; i < internalModels.length; i++) {
      let internalModel = internalModels[i];
      if (internalModel.isHiddenFromRecordArrays() === false &&
          filter(internalModel.getRecord())) {
        if (internalModel._recordArrays.has(array)) { continue; }
        shouldBeInAdded.push(internalModel);
        internalModel._recordArrays.add(array);
      } else {
        if (internalModel._recordArrays.delete(array)) {
          shouldBeRemoved.push(internalModel);
        }
      }
    }

    if (shouldBeInAdded.length > 0) { array._pushInternalModels(shouldBeInAdded);   }
    if (shouldBeRemoved.length > 0) { array._removeInternalModels(shouldBeRemoved); }
  }

  // TODO: remove, utilize existing flush code but make it flush sync based on 1 modelName
  syncLiveRecordArray(array, modelName) {
    assert(`recordArrayManger.syncLiveRecordArray expects modelName not modelClass as the second param`, typeof modelName === 'string');
    let hasNoPotentialDeletions = Object.keys(this._pending).length === 0;
    let map = this.store._internalModelsFor(modelName);
    let hasNoInsertionsOrRemovals = get$12(map, 'length') === get$12(array, 'length');

    /*
      Ideally the recordArrayManager has knowledge of the changes to be applied to
      liveRecordArrays, and is capable of strategically flushing those changes and applying
      small diffs if desired.  However, until we've refactored recordArrayManager, this dirty
      check prevents us from unnecessarily wiping out live record arrays returned by peekAll.
     */
    if (hasNoPotentialDeletions && hasNoInsertionsOrRemovals) {
      return;
    }

    this.populateLiveRecordArray(array, map.models);
  }

  // TODO: remove, when syncLiveRecordArray is removed
  populateLiveRecordArray(array, internalModels) {
    heimdall.increment(populateLiveRecordArray);

    let modelsToAdd = [];
    for (let i = 0; i < internalModels.length; i++) {
      let internalModel = internalModels[i];

      if (!internalModel.isHiddenFromRecordArrays()) {
        let recordArrays = internalModel._recordArrays;

        if (!recordArrays.has(array)) {
          modelsToAdd.push(internalModel);
          recordArrays.add(array);
        }
      }
    }

    array._pushInternalModels(modelsToAdd);
  }

  /**
    This method is invoked if the `filterFunction` property is
    changed on a `DS.FilteredRecordArray`.

    It essentially re-runs the filter from scratch. This same
    method is invoked when the filter is created in th first place.

    @method updateFilter
    @param {Array} array
    @param {String} modelName
    @param {Function} filter
  */
  updateFilter(array, modelName, filter) {
    assert(`recordArrayManger.updateFilter expects modelName not modelClass as the second param, received ${modelName}`, typeof modelName === 'string');
    heimdall.increment(updateFilter);
    let modelMap = this.store._internalModelsFor(modelName);
    let internalModels = modelMap.models;

    this.updateFilterRecordArray(array, filter, internalModels);
  }

  /**
    Get the `DS.RecordArray` for a modelName, which contains all loaded records of
    given modelName.

    @method liveRecordArrayFor
    @param {String} modelName
    @return {DS.RecordArray}
  */
  liveRecordArrayFor(modelName) {
    assert(`recordArrayManger.liveRecordArrayFor expects modelName not modelClass as the param`, typeof modelName === 'string');

    heimdall.increment(liveRecordArrayFor);

    return this._liveRecordArrays[modelName] || (this._liveRecordArrays[modelName] = this.createRecordArray(modelName))
  }

  /**
    Get the `DS.RecordArray` for a modelName, which contains all loaded records of
    given modelName.

    @method filteredRecordArraysFor
    @param {String} modelName
    @return {DS.RecordArray}
  */
  filteredRecordArraysFor(modelName) {
    assert(`recordArrayManger.filteredRecordArraysFor expects modelName not modelClass as the param`, typeof modelName === 'string');

    heimdall.increment(filteredRecordArraysFor);

    return this._filteredRecordArrays[modelName] || (this._filteredRecordArrays[modelName] = []);
  }
  /**
    Create a `DS.RecordArray` for a modelName.

    @method createRecordArray
    @param {String} modelName
    @return {DS.RecordArray}
  */
  createRecordArray(modelName) {
    assert(`recordArrayManger.createRecordArray expects modelName not modelClass as the param`, typeof modelName === 'string');
    heimdall.increment(createRecordArray);
    return RecordArray.create({
      modelName,
      content: Ember.A(),
      store: this.store,
      isLoaded: true,
      manager: this
    });
  }

  /**
    Create a `DS.FilteredRecordArray` for a modelName and register it for updates.

    @method createFilteredRecordArray
    @param {String} modelName
    @param {Function} filter
    @param {Object} query (optional
    @return {DS.FilteredRecordArray}
  */
  createFilteredRecordArray(modelName, filter, query) {
    assert(`recordArrayManger.createFilteredRecordArray expects modelName not modelClass as the first param, received ${modelName}`, typeof modelName === 'string');

    heimdall.increment(createFilteredRecordArray);
    let array = FilteredRecordArray.create({
      query,
      modelName,
      content: Ember.A(),
      store: this.store,
      manager: this,
      filterFunction: filter
    });

    this.registerFilteredRecordArray(array, modelName, filter);

    return array;
  }

  /**
    Create a `DS.AdapterPopulatedRecordArray` for a modelName with given query.

    @method createAdapterPopulatedRecordArray
    @param {String} modelName
    @param {Object} query
    @return {DS.AdapterPopulatedRecordArray}
  */
  createAdapterPopulatedRecordArray(modelName, query) {
    heimdall.increment(createAdapterPopulatedRecordArray);
    assert(`recordArrayManger.createAdapterPopulatedRecordArray expects modelName not modelClass as the first param, received ${modelName}`, typeof modelName === 'string');

    let array = AdapterPopulatedRecordArray.create({
      modelName,
      query: query,
      content: Ember.A(),
      store: this.store,
      manager: this
    });

    this._adapterPopulatedRecordArrays.push(array);

    return array;
  }

  /**
    Register a RecordArray for a given modelName to be backed by
    a filter function. This will cause the array to update
    automatically when records of that modelName change attribute
    values or states.

    @method registerFilteredRecordArray
    @param {DS.RecordArray} array
    @param {String} modelName
    @param {Function} filter
  */
  registerFilteredRecordArray(array, modelName, filter) {
    heimdall.increment(registerFilteredRecordArray);
    assert(`recordArrayManger.registerFilteredRecordArray expects modelName not modelClass as the second param, received ${modelName}`, typeof modelName === 'string');

    this.filteredRecordArraysFor(modelName).push(array);
    this.updateFilter(array, modelName, filter);
  }

  /**
    Unregister a RecordArray.
    So manager will not update this array.

    @method unregisterRecordArray
    @param {DS.RecordArray} array
  */
  unregisterRecordArray(array) {
    heimdall.increment(unregisterRecordArray);

    let modelName = array.modelName;

    // unregister filtered record array
    let recordArrays = this.filteredRecordArraysFor(modelName);
    let removedFromFiltered = remove(recordArrays, array);

    // remove from adapter populated record array
    let removedFromAdapterPopulated = remove(this._adapterPopulatedRecordArrays, array);

    if (!removedFromFiltered && !removedFromAdapterPopulated) {

      let liveRecordArrayForType = this._liveRecordArrays[modelName];
      // unregister live record array
      if (liveRecordArrayForType) {
        if (array === liveRecordArrayForType) {
          delete this._liveRecordArrays[modelName];
        }
      }
    }
  }

  willDestroy() {
    Object.keys(this._filteredRecordArrays).forEach(modelName => flatten(this._filteredRecordArrays[modelName]).forEach(destroy));
    Object.keys(this._liveRecordArrays).forEach(modelName => this._liveRecordArrays[modelName].destroy());
    this._adapterPopulatedRecordArrays.forEach(destroy);
    this.isDestroyed = true;
  }

  destroy() {
    this.isDestroying = true;
    Ember.run.schedule('actions', this, this.willDestroy);
  }
}

function destroy(entry) {
  entry.destroy();
}

function flatten(list) {
  heimdall.increment(array_flatten);
  let length = list.length;
  let result = [];

  for (let i = 0; i < length; i++) {
    result = result.concat(list[i]);
  }

  return result;
}

function remove(array, item) {
  heimdall.increment(array_remove);
  let index = array.indexOf(item);

  if (index !== -1) {
    array.splice(index, 1);
    return true;
  }

  return false;
}

/* global heimdall */
const { set: set$4 } = Ember;

const {
  __get,
  _instanceFor
} = heimdall.registerMonitor('system.store.container-instance-cache',
  '__get',
  '_instanceFor'
);

/*
 * The `ContainerInstanceCache` serves as a lazy cache for looking up
 * instances of serializers and adapters. It has some additional logic for
 * finding the 'fallback' adapter or serializer.
 *
 * The 'fallback' adapter or serializer is an adapter or serializer that is looked up
 * when the preferred lookup fails. For example, say you try to look up `adapter:post`,
 * but there is no entry (app/adapters/post.js in EmberCLI) for `adapter:post` in the registry.
 *
 * When an adapter or serializer is unfound, getFallbacks will be invoked with the current namespace
 * ('adapter' or 'serializer') and the 'preferredKey' (usually a modelName).  The method should return
 * an array of keys to check against.
 *
 * The first entry in the fallbacks array that exists in the container will then be cached for
 * `adapter:post`. So, the next time you look up `adapter:post`, you'll get the `adapter:application`
 * instance (or whatever the fallback was if `adapter:application` doesn't exist).
 *
 * @private
 * @class ContainerInstanceCache
 *
*/
class ContainerInstanceCache {
  constructor(owner, store) {
    this.isDestroying = false;
    this.isDestroyed = false;
    this._owner = owner;
    this._store = store;
    this._namespaces = {
      adapter: Object.create(null),
      serializer: Object.create(null)
    };
  }

  get(namespace, preferredKey) {
    heimdall.increment(__get);
    let cache = this._namespaces[namespace];

    if (cache[preferredKey]) {
      return cache[preferredKey];
    }

    let preferredLookupKey = `${namespace}:${preferredKey}`;

    let instance = this._instanceFor(preferredLookupKey) || this._findInstance(namespace, this._fallbacksFor(namespace, preferredKey));
    if (instance) {
      cache[preferredKey] = instance;
      set$4(instance, 'store', this._store);
    }

    return cache[preferredKey];
  }

  _fallbacksFor(namespace, preferredKey) {
    if (namespace === 'adapter') {
      return ['application', this._store.get('adapter'), '-json-api'];
    }

    // serializer
    return [
      'application',
      this.get('adapter', preferredKey).get('defaultSerializer'),
      '-default'
    ];
  }

  _findInstance(namespace, fallbacks) {
    let cache = this._namespaces[namespace];

    for (let i = 0, length = fallbacks.length; i < length; i++) {
      let fallback = fallbacks[i];

      if (cache[fallback]) {
        return cache[fallback];
      }

      let lookupKey = `${namespace}:${fallback}`;
      let instance = this._instanceFor(lookupKey);

      if (instance) {
        cache[fallback] = instance;
        return instance;
      }
    }
  }

  _instanceFor(key) {
    heimdall.increment(_instanceFor);
    return this._owner.lookup(key);
  }

  destroyCache(cache) {
    let cacheEntries = Object.keys(cache);

    for (let i = 0, length = cacheEntries.length; i < length; i++) {
      let cacheKey = cacheEntries[i];
      let cacheEntry = cache[cacheKey];
      if (cacheEntry) {
        cacheEntry.destroy();
      }
    }
  }

  destroy() {
    this.isDestroying = true;
    this.destroyCache(this._namespaces.adapter);
    this.destroyCache(this._namespaces.serializer);
    this.isDestroyed = true;
  }

  toString() {
    return 'ContainerInstanceCache';
  }
}

/**
  @module ember-data
*/

const badIdFormatAssertion = '`id` passed to `findRecord()` has to be non-empty string or number';

const {
  A,
  _Backburner: Backburner,
  computed: computed$1,
  copy,
  ENV,
  Error: EmberError,
  get: get$3,
  inspect,
  isNone,
  isPresent,
  MapWithDefault: MapWithDefault$2,
  run: emberRun,
  set: set$1,
  RSVP,
  Service,
  typeOf
} = Ember;

const { Promise: Promise$1 } = RSVP;

//Get the materialized model from the internalModel/promise that returns
//an internal model and return it in a promiseObject. Useful for returning
//from find methods
function promiseRecord(internalModelPromise, label) {
  let toReturn = internalModelPromise.then(internalModel => internalModel.getRecord());

  return promiseObject(toReturn, label);
}

let Store;

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

const {
  _generateId,
  _internalModelForId,
  _load,
  _modelForMixin,
  _pushInternalModel,
  _setupRelationships,
  adapterFor,
  _buildInternalModel,
  _didUpdateAll,
  modelFactoryFor,
  modelFor,
  normalize,
  peekAll,
  peekRecord,
  serializerFor,
  _internalModelsFor
} = heimdall.registerMonitor('store',
  '_generateId',
  '_internalModelForId',
  '_load',
  '_modelForMixin',
  '_pushInternalModel',
  '_setupRelationships',
  'adapterFor',
  '_buildInternalModel',
  '_didUpdateAll',
  'modelFactoryFor',
  'modelFor',
  'normalize',
  'peekAll',
  'peekRecord',
  'serializerFor',
  '_internalModelsFor'
);

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
  backend you will need to call `record.save()`.

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
  `store#peekAll()`, `store#findAll()` or `store#filter()`. This means any
  data bindings or computed properties that depend on the RecordArray
  will automatically be synced to include the new or updated record
  values.

  @class Store
  @namespace DS
  @extends Ember.Service
*/
Store = Service.extend({

  /**
    @method init
    @private
  */
  init() {
    this._super(...arguments);
    this._backburner = new Backburner(['normalizeRelationships', 'syncRelationships', 'finished']);
    // internal bookkeeping; not observable
    this.recordArrayManager = new RecordArrayManager({ store: this });
    this._identityMap = new IdentityMap();
    this._pendingSave = [];
    this._instanceCache = new ContainerInstanceCache(getOwner(this), this);
    this._modelFactoryCache = Object.create(null);
    this._relationshipsPayloads = new RelationshipPayloadsManager(this);

    /*
      Ember Data uses several specialized micro-queues for organizing
      and coalescing similar async work.

      These queues are currently controlled by a flush scheduled into
      ember-data's custom backburner instance.
     */
    // used for coalescing record save requests
    this._pendingSave = [];
    // used for coalescing relationship updates
    this._updatedRelationships = [];
    // used for coalescing relationship setup needs
    this._pushedInternalModels = [];
    // used for coalescing internal model updates
    this._updatedInternalModels = [];

    // used to keep track of all the find requests that need to be coalesced
    this._pendingFetch = MapWithDefault$2.create({ defaultValue() { return []; } });

    this._instanceCache = new ContainerInstanceCache(getOwner(this), this);
  },

  /**
    The default adapter to use to communicate to a backend server or
    other persistence layer. This will be overridden by an application
    adapter if present.

    If you want to specify `app/adapters/custom.js` as a string, do:

    ```js
    import DS from 'ember-data';

    export default DS.Store.extend({
      adapter: 'custom',
    });
    ```

    @property adapter
    @default '-json-api'
    @type {String}
  */
  adapter: '-json-api',

  /**
    Returns a JSON representation of the record using a custom
    type-specific serializer, if one exists.

    The available options are:

    * `includeId`: `true` if the record's ID should be included in
      the JSON representation

    @method serialize
    @private
    @deprecated
    @param {DS.Model} record the record to serialize
    @param {Object} options an options hash
  */
  serialize(record, options) {
    if (isEnabled('ds-deprecate-store-serialize')) {
      deprecate('Use of store.serialize is deprecated, use record.serialize instead.', false, {
        id: 'ds.store.serialize',
        until: '3.0'
      });
    }
    let snapshot = record._internalModel.createSnapshot();
    return snapshot.serialize(options);
  },

  /**
    This property returns the adapter, after resolving a possible
    string key.

    If the supplied `adapter` was a class, or a String property
    path resolved to a class, this property will instantiate the
    class.

    This property is cacheable, so the same instance of a specified
    adapter class should be used for the lifetime of the store.

    @property defaultAdapter
    @private
    @return DS.Adapter
  */
  defaultAdapter: computed$1('adapter', function() {
    let adapter = get$3(this, 'adapter');

    assert('You tried to set `adapter` property to an instance of `DS.Adapter`, where it should be a name', typeof adapter === 'string');

    return this.adapterFor(adapter);
  }),

  // .....................
  // . CREATE NEW RECORD .
  // .....................

  /**
    Create a new record in the current store. The properties passed
    to this method are set on the newly created record.

    To create a new instance of a `Post`:

    ```js
    store.createRecord('post', {
      title: 'Rails is omakase'
    });
    ```

    To create a new instance of a `Post` that has a relationship with a `User` record:

    ```js
    let user = this.store.peekRecord('user', 1);
    store.createRecord('post', {
      title: 'Rails is omakase',
      user: user
    });
    ```

    @method createRecord
    @param {String} modelName
    @param {Object} inputProperties a hash of properties to set on the
      newly created record.
    @return {DS.Model} record
  */
  createRecord(modelName, inputProperties) {
    assert(`You need to pass a model name to the store's createRecord method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');
    let normalizedModelName = normalizeModelName(modelName);
    let properties = copy(inputProperties) || Object.create(null);

    // If the passed properties do not include a primary key,
    // give the adapter an opportunity to generate one. Typically,
    // client-side ID generators will use something like uuid.js
    // to avoid conflicts.

    if (isNone(properties.id)) {
      properties.id = this._generateId(normalizedModelName, properties);
    }

    // Coerce ID to a string
    properties.id = coerceId(properties.id);

    let internalModel = this._buildInternalModel(normalizedModelName, properties.id);
    let record = internalModel.getRecord();

    // Move the record out of its initial `empty` state into
    // the `loaded` state.
    // TODO @runspired this seems really bad, store should not be changing the state
    internalModel.loadedData();

    // Set the properties specified on the record.
    // TODO @runspired this is probably why we do the bad thing above
    record.setProperties(properties);

    // TODO @runspired this should also be coalesced into some form of internalModel.setState()
    internalModel.eachRelationship((key, descriptor) => {
      internalModel._relationships.get(key).setHasData(true);
    });

    return record;
  },

  /**
    If possible, this method asks the adapter to generate an ID for
    a newly created record.

    @method _generateId
    @private
    @param {String} modelName
    @param {Object} properties from the new record
    @return {String} if the adapter can generate one, an ID
  */
  _generateId(modelName, properties) {
    heimdall.increment(_generateId);
    let adapter = this.adapterFor(modelName);

    if (adapter && adapter.generateIdForRecord) {
      return adapter.generateIdForRecord(this, modelName, properties);
    }

    return null;
  },

  // .................
  // . DELETE RECORD .
  // .................

  /**
    For symmetry, a record can be deleted via the store.

    Example

    ```javascript
    let post = store.createRecord('post', {
      title: 'Rails is omakase'
    });

    store.deleteRecord(post);
    ```

    @method deleteRecord
    @param {DS.Model} record
  */
  deleteRecord(record) {
    record.deleteRecord();
  },

  /**
    For symmetry, a record can be unloaded via the store.
    This will cause the record to be destroyed and freed up for garbage collection.

    Example

    ```javascript
    store.findRecord('post', 1).then(function(post) {
      store.unloadRecord(post);
    });
    ```

    @method unloadRecord
    @param {DS.Model} record
  */
  unloadRecord(record) {
    record.unloadRecord();
  },

  // ................
  // . FIND RECORDS .
  // ................

  /**
    @method find
    @param {String} modelName
    @param {String|Integer} id
    @param {Object} options
    @return {Promise} promise
    @private
  */
  find(modelName, id, options) {
    // The default `model` hook in Ember.Route calls `find(modelName, id)`,
    // that's why we have to keep this method around even though `findRecord` is
    // the public way to get a record by modelName and id.
    assert(`Using store.find(type) has been removed. Use store.findAll(modelName) to retrieve all records for a given type.`, arguments.length !== 1);
    assert(`Calling store.find(modelName, id, { preload: preload }) is no longer supported. Use store.findRecord(modelName, id, { preload: preload }) instead.`, !options);
    assert(`You need to pass the model name and id to the store's find method`, arguments.length === 2);
    assert(`You cannot pass '${id}' as id to the store's find method`, typeof id === 'string' || typeof id === 'number');
    assert(`Calling store.find() with a query object is no longer supported. Use store.query() instead.`, typeof id !== 'object');
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    let normalizedModelName = normalizeModelName(modelName);

    return this.findRecord(normalizedModelName, id);
  },

  /**
    This method returns a record for a given type and id combination.

    The `findRecord` method will always resolve its promise with the same
    object for a given type and `id`.

    The `findRecord` method will always return a **promise** that will be
    resolved with the record.

    Example

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model(params) {
        return this.store.findRecord('post', params.post_id);
      }
    });
    ```

    If the record is not yet available, the store will ask the adapter's `find`
    method to find the necessary data. If the record is already present in the
    store, it depends on the reload behavior _when_ the returned promise
    resolves.

    ### Preloading

    You can optionally `preload` specific attributes and relationships that you know of
    by passing them via the passed `options`.

    For example, if your Ember route looks like `/posts/1/comments/2` and your API route
    for the comment also looks like `/posts/1/comments/2` if you want to fetch the comment
    without fetching the post you can pass in the post to the `findRecord` call:

    ```javascript
    store.findRecord('comment', 2, { preload: { post: 1 } });
    ```

    If you have access to the post model you can also pass the model itself:

    ```javascript
    store.findRecord('post', 1).then(function (myPostModel) {
      store.findRecord('comment', 2, { post: myPostModel });
    });
    ```

    ### Reloading

    The reload behavior is configured either via the passed `options` hash or
    the result of the adapter's `shouldReloadRecord`.

    If `{ reload: true }` is passed or `adapter.shouldReloadRecord` evaluates
    to `true`, then the returned promise resolves once the adapter returns
    data, regardless if the requested record is already in the store:

    ```js
    store.push({
      data: {
        id: 1,
        type: 'post',
        revision: 1
      }
    });

    // adapter#findRecord resolves with
    // [
    //   {
    //     id: 1,
    //     type: 'post',
    //     revision: 2
    //   }
    // ]
    store.findRecord('post', 1, { reload: true }).then(function(post) {
      post.get('revision'); // 2
    });
    ```

    If no reload is indicated via the abovementioned ways, then the promise
    immediately resolves with the cached version in the store.

    ### Background Reloading

    Optionally, if `adapter.shouldBackgroundReloadRecord` evaluates to `true`,
    then a background reload is started, which updates the records' data, once
    it is available:

    ```js
    // app/adapters/post.js
    import ApplicationAdapter from "./application";

    export default ApplicationAdapter.extend({
      shouldReloadRecord(store, snapshot) {
        return false;
      },

      shouldBackgroundReloadRecord(store, snapshot) {
        return true;
      }
    });

    // ...

    store.push({
      data: {
        id: 1,
        type: 'post',
        revision: 1
      }
    });

    let blogPost = store.findRecord('post', 1).then(function(post) {
      post.get('revision'); // 1
    });

    // later, once adapter#findRecord resolved with
    // [
    //   {
    //     id: 1,
    //     type: 'post',
    //     revision: 2
    //   }
    // ]

    blogPost.get('revision'); // 2
    ```

    If you would like to force or prevent background reloading, you can set a
    boolean value for `backgroundReload` in the options object for
    `findRecord`.

    ```app/routes/post/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model(params) {
        return this.store.findRecord('post', params.post_id, { backgroundReload: false });
      }
    });
    ```

   If you pass an object on the `adapterOptions` property of the options
   argument it will be passed to you adapter via the snapshot

    ```app/routes/post/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model(params) {
        return this.store.findRecord('post', params.post_id, {
          adapterOptions: { subscribe: false }
        });
      }
    });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default MyCustomAdapter.extend({
      findRecord(store, type, id, snapshot) {
        if (snapshot.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    });
    ```

    See [peekRecord](#method_peekRecord) to get the cached version of a record.

    ### Retrieving Related Model Records

    If you use an adapter such as Ember's default
    [`JSONAPIAdapter`](http://emberjs.com/api/data/classes/DS.JSONAPIAdapter.html)
    that supports the [JSON API specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findRecord()` to automatically retrieve additional records related to
    the one you request by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve a specific post we can have the server also return that post's
    comments in the same request:

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model(params) {
       return this.store.findRecord('post', params.post_id, { include: 'comments' });
      }
    });

    ```
    In this case, the post's comments would then be available in your template as
    `model.comments`.

    Multiple relationships can be requested using an `include` parameter consisting of a
    comma-separated list (without white-space) while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the post's
    comments and the authors of those comments the request would look like this:

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model(params) {
       return this.store.findRecord('post', params.post_id, { include: 'comments,comments.author' });
      }
    });

    ```

    @since 1.13.0
    @method findRecord
    @param {String} modelName
    @param {(String|Integer)} id
    @param {Object} options
    @return {Promise} promise
  */
  findRecord(modelName, id, options) {
    assert(`You need to pass a model name to the store's findRecord method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');
    assert(badIdFormatAssertion, (typeof id === 'string' && id.length > 0) || (typeof id === 'number' && !isNaN(id)));

    let normalizedModelName = normalizeModelName(modelName);

    let internalModel = this._internalModelForId(normalizedModelName, id);
    options = options || {};

    if (!this.hasRecordForId(normalizedModelName, id)) {
      return this._findByInternalModel(internalModel, options);
    }

    let fetchedInternalModel = this._findRecord(internalModel, options);

    return promiseRecord(fetchedInternalModel, `DS: Store#findRecord ${normalizedModelName} with id: ${id}`);
  },

  _findRecord(internalModel, options) {
    // Refetch if the reload option is passed
    if (options.reload) {
      return this._scheduleFetch(internalModel, options);
    }

    let snapshot = internalModel.createSnapshot(options);
    let adapter = this.adapterFor(internalModel.modelName);

    // Refetch the record if the adapter thinks the record is stale
    if (adapter.shouldReloadRecord(this, snapshot)) {
      return this._scheduleFetch(internalModel, options);
    }

    if (options.backgroundReload === false) {
      return Promise$1.resolve(internalModel);
    }

    // Trigger the background refetch if backgroundReload option is passed
    if (options.backgroundReload || adapter.shouldBackgroundReloadRecord(this, snapshot)) {
      this._scheduleFetch(internalModel, options);
    }

    // Return the cached record
    return Promise$1.resolve(internalModel);
  },

  _findByInternalModel(internalModel, options = {}) {
    if (options.preload) {
      internalModel.preloadData(options.preload);
    }

    let fetchedInternalModel = this._findEmptyInternalModel(internalModel, options);

    return promiseRecord(fetchedInternalModel, `DS: Store#findRecord ${internalModel.modelName} with id: ${internalModel.id}`);
  },

  _findEmptyInternalModel(internalModel, options) {
    if (internalModel.isEmpty()) {
      return this._scheduleFetch(internalModel, options);
    }

    //TODO double check about reloading
    if (internalModel.isLoading()) {
      return internalModel._loadingPromise;
    }

    return Promise$1.resolve(internalModel);
  },

  /**
    This method makes a series of requests to the adapter's `find` method
    and returns a promise that resolves once they are all loaded.

    @private
    @method findByIds
    @param {String} modelName
    @param {Array} ids
    @return {Promise} promise
  */
  findByIds(modelName, ids) {
    assert(`You need to pass a model name to the store's findByIds method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    let promises = new Array(ids.length);

    let normalizedModelName = normalizeModelName(modelName);

    for (let i = 0; i < ids.length; i++) {
      promises[i] = this.findRecord(normalizedModelName, ids[i]);
    }

    return promiseArray(RSVP.all(promises).then(A, null, `DS: Store#findByIds of ${normalizedModelName} complete`));
  },

  /**
    This method is called by `findRecord` if it discovers that a particular
    type/id pair hasn't been loaded yet to kick off a request to the
    adapter.

    @method _fetchRecord
    @private
    @param {InternalModel} internalModel model
    @return {Promise} promise
   */
  _fetchRecord(internalModel, options) {
    let modelName = internalModel.modelName;
    let adapter = this.adapterFor(modelName);

    assert(`You tried to find a record but you have no adapter (for ${modelName})`, adapter);
    assert(`You tried to find a record but your adapter (for ${modelName}) does not implement 'findRecord'`, typeof adapter.findRecord === 'function');

    return _find(adapter, this, internalModel.type, internalModel.id, internalModel, options);
  },

  _scheduleFetchMany(internalModels) {
    let fetches = new Array(internalModels.length);

    for (let i = 0; i < internalModels.length; i++) {
      fetches[i] = this._scheduleFetch(internalModels[i]);
    }

    return Promise$1.all(fetches);
  },

  _scheduleFetch(internalModel, options) {
    if (internalModel._loadingPromise) {
      return internalModel._loadingPromise;
    }

    let { id, modelName } = internalModel;
    let resolver = RSVP.defer(`Fetching ${modelName}' with id: ${id}`);
    let pendingFetchItem = {
      internalModel,
      resolver,
      options
    };

    let promise = resolver.promise;

    internalModel.loadingData(promise);
    if (this._pendingFetch.size === 0) {
      emberRun.schedule('afterRender', this, this.flushAllPendingFetches);
    }

    this._pendingFetch.get(modelName).push(pendingFetchItem);

    return promise;
  },

  flushAllPendingFetches() {
    if (this.isDestroyed || this.isDestroying) {
      return;
    }

    this._pendingFetch.forEach(this._flushPendingFetchForType, this);
    this._pendingFetch.clear();
  },

  _flushPendingFetchForType(pendingFetchItems, modelName) {
    let store = this;
    let adapter = store.adapterFor(modelName);
    let shouldCoalesce = !!adapter.findMany && adapter.coalesceFindRequests;
    let totalItems = pendingFetchItems.length;
    let internalModels = new Array(totalItems);
    let seeking = Object.create(null);

    for (let i = 0; i < totalItems; i++) {
      let pendingItem = pendingFetchItems[i];
      let internalModel = pendingItem.internalModel;
      internalModels[i] = internalModel;
      seeking[internalModel.id] = pendingItem;
    }

    function _fetchRecord(recordResolverPair) {
      let recordFetch = store._fetchRecord(
        recordResolverPair.internalModel,
        recordResolverPair.options
      );  // TODO adapter options

      recordResolverPair.resolver.resolve(recordFetch);
    }

    function handleFoundRecords(foundInternalModels, expectedInternalModels) {
      // resolve found records
      let found = Object.create(null);
      for (let i = 0, l = foundInternalModels.length; i < l; i++) {
        let internalModel = foundInternalModels[i];
        let pair = seeking[internalModel.id];
        found[internalModel.id] = internalModel;

        if (pair) {
          let resolver = pair.resolver;
          resolver.resolve(internalModel);
        }
      }

      // reject missing records
      let missingInternalModels = [];

      for (let i = 0, l = expectedInternalModels.length; i < l; i++) {
        let internalModel = expectedInternalModels[i];

        if (!found[internalModel.id]) {
          missingInternalModels.push(internalModel);
        }
      }

      if (missingInternalModels.length) {
        warn('Ember Data expected to find records with the following ids in the adapter response but they were missing: ' + inspect(missingInternalModels.map(r => r.id)), false, {
          id: 'ds.store.missing-records-from-adapter'
        });
        rejectInternalModels(missingInternalModels);
      }
    }

    function rejectInternalModels(internalModels, error) {
      for (let i = 0, l = internalModels.length; i < l; i++) {
        let internalModel = internalModels[i];
        let pair = seeking[internalModel.id];

        if (pair) {
          pair.resolver.reject(error || new Error(`Expected: '${internalModel}' to be present in the adapter provided payload, but it was not found.`));
        }
      }
    }

    if (shouldCoalesce) {
      // TODO: Improve records => snapshots => records => snapshots
      //
      // We want to provide records to all store methods and snapshots to all
      // adapter methods. To make sure we're doing that we're providing an array
      // of snapshots to adapter.groupRecordsForFindMany(), which in turn will
      // return grouped snapshots instead of grouped records.
      //
      // But since the _findMany() finder is a store method we need to get the
      // records from the grouped snapshots even though the _findMany() finder
      // will once again convert the records to snapshots for adapter.findMany()
      let snapshots = new Array(totalItems);
      for (let i = 0; i < totalItems; i++) {
        snapshots[i] = internalModels[i].createSnapshot();
      }

      let groups = adapter.groupRecordsForFindMany(this, snapshots);

      for (let i = 0, l = groups.length; i < l; i++) {
        let group = groups[i];
        let totalInGroup = groups[i].length;
        let ids = new Array(totalInGroup);
        let groupedInternalModels = new Array(totalInGroup);

        for (let j = 0; j < totalInGroup; j++) {
          let internalModel = group[j]._internalModel;

          groupedInternalModels[j] = internalModel;
          ids[j] = internalModel.id;
        }

        if (totalInGroup > 1) {
          _findMany(adapter, store, modelName, ids, groupedInternalModels)
            .then(function(foundInternalModels) {
              handleFoundRecords(foundInternalModels, groupedInternalModels);
            })
            .catch(function(error) {
              rejectInternalModels(groupedInternalModels, error);
            });
        } else if (ids.length === 1) {
          let pair = seeking[groupedInternalModels[0].id];
          _fetchRecord(pair);
        } else {
          assert("You cannot return an empty array from adapter's method groupRecordsForFindMany", false);
        }
      }
    } else {
      for (let i = 0; i < totalItems; i++) {
        _fetchRecord(pendingFetchItems[i]);
      }
    }
  },

  /**
    Get the reference for the specified record.

    Example

    ```javascript
    let userRef = store.getReference('user', 1);

    // check if the user is loaded
    let isLoaded = userRef.value() !== null;

    // get the record of the reference (null if not yet available)
    let user = userRef.value();

    // get the identifier of the reference
    if (userRef.remoteType() === 'id') {
    let id = userRef.id();
    }

    // load user (via store.find)
    userRef.load().then(...)

    // or trigger a reload
    userRef.reload().then(...)

    // provide data for reference
    userRef.push({ id: 1, username: '@user' }).then(function(user) {
      userRef.value() === user;
    });
    ```

    @method getReference
    @param {String} modelName
    @param {String|Integer} id
    @since 2.5.0
    @return {RecordReference}
  */
  getReference(modelName, id) {
    let normalizedModelName = normalizeModelName(modelName);

    return this._internalModelForId(normalizedModelName, id).recordReference;
  },

  /**
    Get a record by a given type and ID without triggering a fetch.

    This method will synchronously return the record if it is available in the store,
    otherwise it will return `null`. A record is available if it has been fetched earlier, or
    pushed manually into the store.

    See [findRecord](#method_findRecord) if you would like to request this record from the backend.

    _Note: This is a synchronous method and does not return a promise._

    ```js
    let post = store.peekRecord('post', 1);

    post.get('id'); // 1
    ```

    @since 1.13.0
    @method peekRecord
    @param {String} modelName
    @param {String|Integer} id
    @return {DS.Model|null} record
  */
  peekRecord(modelName, id) {
    heimdall.increment(peekRecord);
    assert(`You need to pass a model name to the store's peekRecord method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');
    let normalizedModelName = normalizeModelName(modelName);

    if (this.hasRecordForId(normalizedModelName, id)) {
      return this._internalModelForId(normalizedModelName, id).getRecord();
    } else {
      return null;
    }
  },

  /**
    This method is called by the record's `reload` method.

    This method calls the adapter's `find` method, which returns a promise. When
    **that** promise resolves, `reloadRecord` will resolve the promise returned
    by the record's `reload`.

    @method reloadRecord
    @private
    @param {DS.Model} internalModel
    @return {Promise} promise
  */
  _reloadRecord(internalModel) {
    let { id, modelName } = internalModel;
    let adapter = this.adapterFor(modelName);

    assert(`You cannot reload a record without an ID`, id);
    assert(`You tried to reload a record but you have no adapter (for ${modelName})`, adapter);
    assert(`You tried to reload a record but your adapter does not implement 'findRecord'`, typeof adapter.findRecord === 'function' || typeof adapter.find === 'function');

    return this._scheduleFetch(internalModel);
  },

  /**
   This method returns true if a record for a given modelName and id is already
   loaded in the store. Use this function to know beforehand if a findRecord()
   will result in a request or that it will be a cache hit.

   Example

   ```javascript
   store.hasRecordForId('post', 1); // false
   store.findRecord('post', 1).then(function() {
     store.hasRecordForId('post', 1); // true
   });
   ```

    @method hasRecordForId
    @param {String} modelName
    @param {(String|Integer)} id
    @return {Boolean}
  */
  hasRecordForId(modelName, id) {
    assert(`You need to pass a model name to the store's hasRecordForId method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    let normalizedModelName = normalizeModelName(modelName);

    let trueId = coerceId(id);
    let internalModel = this._internalModelsFor(normalizedModelName).get(trueId);

    return !!internalModel && internalModel.isLoaded();
  },

  /**
    Returns id record for a given type and ID. If one isn't already loaded,
    it builds a new record and leaves it in the `empty` state.

    @method recordForId
    @private
    @param {String} modelName
    @param {(String|Integer)} id
    @return {DS.Model} record
  */
  recordForId(modelName, id) {
    assert(`You need to pass a model name to the store's recordForId method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    return this._internalModelForId(modelName, id).getRecord();
  },

  _internalModelForId(modelName, id) {
    heimdall.increment(_internalModelForId);
    let trueId = coerceId(id);
    let internalModel = this._internalModelsFor(modelName).get(trueId);

    if (!internalModel) {
      internalModel = this._buildInternalModel(modelName, trueId);
    }

    return internalModel;
  },

  _internalModelDidReceiveRelationshipData(modelName, id, relationshipData) {
    this._relationshipsPayloads.push(modelName, id, relationshipData);
  },

  _internalModelDestroyed(internalModel) {
    this._removeFromIdMap(internalModel);
    this._relationshipsPayloads.unload(internalModel.modelName, internalModel.id);
  },

  /**
    @method findMany
    @private
    @param {Array} internalModels
    @return {Promise} promise
  */
  findMany(internalModels) {
    let finds = new Array(internalModels.length);

    for (let i = 0; i < internalModels.length; i++) {
      finds[i] = this._findEmptyInternalModel(internalModels[i]);
    }

    return Promise$1.all(finds);
  },


  /**
    If a relationship was originally populated by the adapter as a link
    (as opposed to a list of IDs), this method is called when the
    relationship is fetched.

    The link (which is usually a URL) is passed through unchanged, so the
    adapter can make whatever request it wants.

    The usual use-case is for the server to register a URL as a link, and
    then use that URL in the future to make a request for the relationship.

    @method findHasMany
    @private
    @param {InternalModel} internalModel
    @param {any} link
    @param {(Relationship)} relationship
    @return {Promise} promise
  */
  findHasMany(internalModel, link, relationship) {
    let adapter = this.adapterFor(internalModel.modelName);

    assert(`You tried to load a hasMany relationship but you have no adapter (for ${internalModel.modelName})`, adapter);
    assert(`You tried to load a hasMany relationship from a specified 'link' in the original payload but your adapter does not implement 'findHasMany'`, typeof adapter.findHasMany === 'function');

    return _findHasMany(adapter, this, internalModel, link, relationship);
  },

  /**
    @method findBelongsTo
    @private
    @param {InternalModel} internalModel
    @param {any} link
    @param {Relationship} relationship
    @return {Promise} promise
  */
  findBelongsTo(internalModel, link, relationship) {
    let adapter = this.adapterFor(internalModel.modelName);

    assert(`You tried to load a belongsTo relationship but you have no adapter (for ${internalModel.modelName})`, adapter);
    assert(`You tried to load a belongsTo relationship from a specified 'link' in the original payload but your adapter does not implement 'findBelongsTo'`, typeof adapter.findBelongsTo === 'function');

    return _findBelongsTo(adapter, this, internalModel, link, relationship);
  },

  /**
    This method delegates a query to the adapter. This is the one place where
    adapter-level semantics are exposed to the application.

    Each time this method is called a new request is made through the adapter.

    Exposing queries this way seems preferable to creating an abstract query
    language for all server-side queries, and then require all adapters to
    implement them.

    ---

    If you do something like this:

    ```javascript
    store.query('person', { page: 1 });
    ```

    The call made to the server, using a Rails backend, will look something like this:

    ```
    Started GET "/api/v1/person?page=1"
    Processing by Api::V1::PersonsController#index as HTML
    Parameters: { "page"=>"1" }
    ```

    ---

    If you do something like this:

    ```javascript
    store.query('person', { ids: [1, 2, 3] });
    ```

    The call to the server, using a Rails backend, will look something like this:

    ```
    Started GET "/api/v1/person?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3"
    Processing by Api::V1::PersonsController#index as HTML
    Parameters: { "ids" => ["1", "2", "3"] }
    ```

    This method returns a promise, which is resolved with an
    [`AdapterPopulatedRecordArray`](http://emberjs.com/api/data/classes/DS.AdapterPopulatedRecordArray.html)
    once the server returns.

    @since 1.13.0
    @method query
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @return {Promise} promise
  */
  query(modelName, query) {
    assert(`You need to pass a model name to the store's query method`, isPresent(modelName));
    assert(`You need to pass a query hash to the store's query method`, query);
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    let normalizedModelName = normalizeModelName(modelName);
    return this._query(normalizedModelName, query);
  },

  _query(modelName, query, array) {
    let token = heimdall.start('store._query');
    assert(`You need to pass a model name to the store's query method`, isPresent(modelName));
    assert(`You need to pass a query hash to the store's query method`, query);
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    let modelToken = heimdall.start('initial-modelFor-lookup');
    heimdall.stop(modelToken);

    array = array || this.recordArrayManager.createAdapterPopulatedRecordArray(modelName, query);

    let adapterToken = heimdall.start('initial-adapterFor-lookup');
    let adapter = this.adapterFor(modelName);
    heimdall.stop(adapterToken);

    assert(`You tried to load a query but you have no adapter (for ${modelName})`, adapter);
    assert(`You tried to load a query but your adapter does not implement 'query'`, typeof adapter.query === 'function');

    let pA = promiseArray(_query(adapter, this, modelName, query, array));
    instrument(() => {
      pA.finally(() => { heimdall.stop(token); });
    });
    return pA;
  },

  /**
    This method makes a request for one record, where the `id` is not known
    beforehand (if the `id` is known, use [`findRecord`](#method_findRecord)
    instead).

    This method can be used when it is certain that the server will return a
    single object for the primary data.

    Each time this method is called a new request is made through the adapter.

    Let's assume our API provides an endpoint for the currently logged in user
    via:

    ```
    // GET /api/current_user
    {
      user: {
        id: 1234,
        username: 'admin'
      }
    }
    ```

    Since the specific `id` of the `user` is not known beforehand, we can use
    `queryRecord` to get the user:

    ```javascript
    store.queryRecord('user', {}).then(function(user) {
      let username = user.get('username');
      console.log(`Currently logged in as ${username}`);
    });
    ```

    The request is made through the adapters' `queryRecord`:

    ```app/adapters/user.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      queryRecord(modelName, query) {
        return Ember.$.getJSON('/api/current_user');
      }
    });
    ```

    Note: the primary use case for `store.queryRecord` is when a single record
    is queried and the `id` is not known beforehand. In all other cases
    `store.query` and using the first item of the array is likely the preferred
    way:

    ```
    // GET /users?username=unique
    {
      data: [{
        id: 1234,
        type: 'user',
        attributes: {
          username: "unique"
        }
      }]
    }
    ```

    ```javascript
    store.query('user', { username: 'unique' }).then(function(users) {
      return users.get('firstObject');
    }).then(function(user) {
      let id = user.get('id');
    });
    ```

    This method returns a promise, which resolves with the found record.

    If the adapter returns no data for the primary data of the payload, then
    `queryRecord` resolves with `null`:

    ```
    // GET /users?username=unique
    {
      data: null
    }
    ```

    ```javascript
    store.queryRecord('user', { username: 'unique' }).then(function(user) {
      console.log(user); // null
    });
    ```

    @since 1.13.0
    @method queryRecord
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @return {Promise} promise which resolves with the found record or `null`
  */
  queryRecord(modelName, query) {
    assert(`You need to pass a model name to the store's queryRecord method`, isPresent(modelName));
    assert(`You need to pass a query hash to the store's queryRecord method`, query);
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    let normalizedModelName = normalizeModelName(modelName);

    let adapter = this.adapterFor(normalizedModelName);

    assert(`You tried to make a query but you have no adapter (for ${normalizedModelName})`, adapter);
    assert(`You tried to make a query but your adapter does not implement 'queryRecord'`, typeof adapter.queryRecord === 'function');

    return promiseObject(_queryRecord(adapter, this, modelName, query).then(internalModel => {
      // the promise returned by store.queryRecord is expected to resolve with
      // an instance of DS.Model
      if (internalModel) {
        return internalModel.getRecord();
      }

      return null;
    }));
  },

  /**
    `findAll` asks the adapter's `findAll` method to find the records for the
    given type, and returns a promise which will resolve with all records of
    this type present in the store, even if the adapter only returns a subset
    of them.

    ```app/routes/authors.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model(params) {
        return this.store.findAll('author');
      }
    });
    ```

    _When_ the returned promise resolves depends on the reload behavior,
    configured via the passed `options` hash and the result of the adapter's
    `shouldReloadAll` method.

    ### Reloading

    If `{ reload: true }` is passed or `adapter.shouldReloadAll` evaluates to
    `true`, then the returned promise resolves once the adapter returns data,
    regardless if there are already records in the store:

    ```js
    store.push({
      data: {
        id: 'first',
        type: 'author'
      }
    });

    // adapter#findAll resolves with
    // [
    //   {
    //     id: 'second',
    //     type: 'author'
    //   }
    // ]
    store.findAll('author', { reload: true }).then(function(authors) {
      authors.getEach('id'); // ['first', 'second']
    });
    ```

    If no reload is indicated via the abovementioned ways, then the promise
    immediately resolves with all the records currently loaded in the store.

    ### Background Reloading

    Optionally, if `adapter.shouldBackgroundReloadAll` evaluates to `true`,
    then a background reload is started. Once this resolves, the array with
    which the promise resolves, is updated automatically so it contains all the
    records in the store:

    ```js
    // app/adapters/application.js
    export default DS.Adapter.extend({
      shouldReloadAll(store, snapshotsArray) {
        return false;
      },

      shouldBackgroundReloadAll(store, snapshotsArray) {
        return true;
      }
    });

    // ...

    store.push({
      data: {
        id: 'first',
        type: 'author'
      }
    });

    let allAuthors;
    store.findAll('author').then(function(authors) {
      authors.getEach('id'); // ['first']

      allAuthors = authors;
    });

    // later, once adapter#findAll resolved with
    // [
    //   {
    //     id: 'second',
    //     type: 'author'
    //   }
    // ]

    allAuthors.getEach('id'); // ['first', 'second']
    ```

    If you would like to force or prevent background reloading, you can set a
    boolean value for `backgroundReload` in the options object for
    `findAll`.

    ```app/routes/post/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model() {
        return this.store.findAll('post', { backgroundReload: false });
      }
    });
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to you adapter via the `snapshotRecordArray`

    ```app/routes/posts.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model(params) {
        return this.store.findAll('post', {
          adapterOptions: { subscribe: false }
        });
      }
    });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default MyCustomAdapter.extend({
      findAll(store, type, sinceToken, snapshotRecordArray) {
        if (snapshotRecordArray.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    });
    ```

    See [peekAll](#method_peekAll) to get an array of current records in the
    store, without waiting until a reload is finished.

    ### Retrieving Related Model Records

    If you use an adapter such as Ember's default
    [`JSONAPIAdapter`](http://emberjs.com/api/data/classes/DS.JSONAPIAdapter.html)
    that supports the [JSON API specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findAll()` to automatically retrieve additional records related to
    those requested by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve all of the post records we can have the server also return
    all of the posts' comments in the same request:

    ```app/routes/posts.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model() {
       return this.store.findAll('post', { include: 'comments' });
      }
    });

    ```
    Multiple relationships can be requested using an `include` parameter consisting of a
    comma-separated list (without white-space) while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the posts'
    comments and the authors of those comments the request would look like this:

    ```app/routes/posts.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model() {
       return this.store.findAll('post', { include: 'comments,comments.author' });
      }
    });

    ```

    See [query](#method_query) to only get a subset of records from the server.

    @since 1.13.0
    @method findAll
    @param {String} modelName
    @param {Object} options
    @return {Promise} promise
  */
  findAll(modelName, options) {
    assert(`You need to pass a model name to the store's findAll method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    let token = heimdall.start('store.findAll');
    let normalizedModelName = normalizeModelName(modelName);
    let fetch = this._fetchAll(normalizedModelName, this.peekAll(normalizedModelName), options);

    instrument(() => {
      fetch.finally(() => { heimdall.stop(token); });
    });

    return fetch;
  },

  /**
    @method _fetchAll
    @private
    @param {DS.Model} modelName
    @param {DS.RecordArray} array
    @return {Promise} promise
  */
  _fetchAll(modelName, array, options = {}) {
    let adapter = this.adapterFor(modelName);
    let sinceToken = this._internalModelsFor(modelName).metadata.since;

    assert(`You tried to load all records but you have no adapter (for ${modelName})`, adapter);
    assert(`You tried to load all records but your adapter does not implement 'findAll'`, typeof adapter.findAll === 'function');

    if (options.reload) {
      set$1(array, 'isUpdating', true);
      return promiseArray(_findAll(adapter, this, modelName, sinceToken, options));
    }

    let snapshotArray = array._createSnapshot(options);

    if (adapter.shouldReloadAll(this, snapshotArray)) {
      set$1(array, 'isUpdating', true);
      return promiseArray(_findAll(adapter, this, modelName, sinceToken, options));
    }

    if (options.backgroundReload === false) {
      return promiseArray(Promise$1.resolve(array));
    }

    if (options.backgroundReload || adapter.shouldBackgroundReloadAll(this, snapshotArray)) {
      set$1(array, 'isUpdating', true);
      _findAll(adapter, this, modelName, sinceToken, options);
    }

    return promiseArray(Promise$1.resolve(array));
  },

  /**
    @method _didUpdateAll
    @param {String} modelName
    @private
  */
  _didUpdateAll(modelName) {
    heimdall.increment(_didUpdateAll);
    let liveRecordArray = this.recordArrayManager.liveRecordArrayFor(modelName);

    set$1(liveRecordArray, 'isUpdating', false);
  },

  didUpdateAll(modelName) {
    deprecate('didUpdateAll was documented as private and will be removed in the next version of Ember Data.');
    return this._didUpdateAll(modelName);
  },

  /**
    This method returns a filtered array that contains all of the
    known records for a given type in the store.

    Note that because it's just a filter, the result will contain any
    locally created records of the type, however, it will not make a
    request to the backend to retrieve additional records. If you
    would like to request all the records from the backend please use
    [store.findAll](#method_findAll).

    Also note that multiple calls to `peekAll` for a given type will always
    return the same `RecordArray`.

    Example

    ```javascript
    let localPosts = store.peekAll('post');
    ```

    @since 1.13.0
    @method peekAll
    @param {String} modelName
    @return {DS.RecordArray}
  */
  peekAll(modelName) {
    heimdall.increment(peekAll);
    assert(`You need to pass a model name to the store's peekAll method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');
    let normalizedModelName = normalizeModelName(modelName);
    let liveRecordArray = this.recordArrayManager.liveRecordArrayFor(normalizedModelName);

    this.recordArrayManager.syncLiveRecordArray(liveRecordArray, normalizedModelName);

    return liveRecordArray;
  },

  /**
   This method unloads all records in the store.
   It schedules unloading to happen during the next run loop.

   Optionally you can pass a type which unload all records for a given type.

   ```javascript
   store.unloadAll();
   store.unloadAll('post');
   ```

   @method unloadAll
   @param {String} modelName
  */
  unloadAll(modelName) {
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, !modelName || typeof modelName === 'string');

    if (arguments.length === 0) {
      this._identityMap.clear();
    } else {
      let normalizedModelName = normalizeModelName(modelName);
      this._internalModelsFor(normalizedModelName).clear();
    }
  },

  /**
    Takes a type and filter function, and returns a live RecordArray that
    remains up to date as new records are loaded into the store or created
    locally.

    The filter function takes a materialized record, and returns true
    if the record should be included in the filter and false if it should
    not.

    Example

    ```javascript
    store.filter('post', function(post) {
      return post.get('unread');
    });
    ```

    The filter function is called once on all records for the type when
    it is created, and then once on each newly loaded or created record.

    If any of a record's properties change, or if it changes state, the
    filter function will be invoked again to determine whether it should
    still be in the array.

    Optionally you can pass a query, which is the equivalent of calling
    [query](#method_query) with that same query, to fetch additional records
    from the server. The results returned by the server could then appear
    in the filter if they match the filter function.

    The query itself is not used to filter records, it's only sent to your
    server for you to be able to do server-side filtering. The filter
    function will be applied on the returned results regardless.

    Example

    ```javascript
    store.filter('post', { unread: true }, function(post) {
      return post.get('unread');
    }).then(function(unreadPosts) {
      unreadPosts.get('length'); // 5
      let unreadPost = unreadPosts.objectAt(0);
      unreadPost.set('unread', false);
      unreadPosts.get('length'); // 4
    });
    ```

    @method filter
    @private
    @param {String} modelName
    @param {Object} query optional query
    @param {Function} filter
    @return {DS.PromiseArray}
    @deprecated
  */
  filter(modelName, query, filter) {
    assert(`You need to pass a model name to the store's filter method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    if (!ENV.ENABLE_DS_FILTER) {
      assert('The filter API has been moved to a plugin. To enable store.filter using an environment flag, or to use an alternative, you can visit the ember-data-filter addon page. https://github.com/ember-data/ember-data-filter', false);
    }

    let promise;
    let length = arguments.length;
    let array;
    let hasQuery = length === 3;

    let normalizedModelName = normalizeModelName(modelName);

    // allow an optional server query
    if (hasQuery) {
      promise = this.query(normalizedModelName, query);
    } else if (arguments.length === 2) {
      filter = query;
    }

    if (hasQuery) {
      array = this.recordArrayManager.createFilteredRecordArray(normalizedModelName, filter, query);
    } else {
      array = this.recordArrayManager.createFilteredRecordArray(normalizedModelName, filter);
    }

    promise = promise || Promise$1.resolve(array);

    return promiseArray(promise.then(() => array, null, `DS: Store#filter of ${normalizedModelName}`));
  },

  /**
    This method has been deprecated and is an alias for store.hasRecordForId, which should
    be used instead.

    @deprecated
    @method recordIsLoaded
    @param {String} modelName
    @param {string} id
    @return {boolean}
  */
  recordIsLoaded(modelName, id) {
    deprecate(`Use of recordIsLoaded is deprecated, use hasRecordForId instead.`, false, {
      id: 'ds.store.recordIsLoaded',
      until: '3.0'
    });
    return this.hasRecordForId(modelName, id);
  },


  // ..............
  // . PERSISTING .
  // ..............

  /**
    This method is called by `record.save`, and gets passed a
    resolver for the promise that `record.save` returns.

    It schedules saving to happen at the end of the run loop.

    @method scheduleSave
    @private
    @param {InternalModel} internalModel
    @param {Resolver} resolver
    @param {Object} options
  */
  scheduleSave(internalModel, resolver, options) {
    let snapshot = internalModel.createSnapshot(options);
    internalModel.flushChangedAttributes();
    internalModel.adapterWillCommit();
    this._pendingSave.push({
      snapshot: snapshot,
      resolver: resolver
    });
    emberRun.once(this, this.flushPendingSave);
  },

  /**
    This method is called at the end of the run loop, and
    flushes any records passed into `scheduleSave`

    @method flushPendingSave
    @private
  */
  flushPendingSave() {
    let pending = this._pendingSave.slice();
    this._pendingSave = [];

    for (let i = 0, j = pending.length; i < j; i++) {
      let pendingItem = pending[i];
      let snapshot = pendingItem.snapshot;
      let resolver = pendingItem.resolver;
      let internalModel = snapshot._internalModel;
      let adapter = this.adapterFor(internalModel.modelName);
      let operation;

      if (internalModel.currentState.stateName === 'root.deleted.saved') {
        return resolver.resolve();
      } else if (internalModel.isNew()) {
        operation = 'createRecord';
      } else if (internalModel.isDeleted()) {
        operation = 'deleteRecord';
      } else {
        operation = 'updateRecord';
      }

      resolver.resolve(_commit(adapter, this, operation, snapshot));
    }

  },

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is resolved.

    If the data provides a server-generated ID, it will
    update the record and the store's indexes.

    @method didSaveRecord
    @private
    @param {InternalModel} internalModel the in-flight internal model
    @param {Object} data optional data (see above)
  */
  didSaveRecord(internalModel, dataArg) {
    let data;
    if (dataArg) {
      data = dataArg.data;
    }
    if (data) {
      // normalize relationship IDs into records
      this.updateId(internalModel, data);
      this._setupRelationshipsForModel(internalModel, data);
    } else {
      assert(`Your ${internalModel.modelName} record was saved to the server, but the response does not have an id and no id has been set client side. Records must have ids. Please update the server response to provide an id in the response or generate the id on the client side either before saving the record or while normalizing the response.`, internalModel.id);
    }

    //We first make sure the primary data has been updated
    //TODO try to move notification to the user to the end of the runloop
    internalModel.adapterDidCommit(data);
  },

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is rejected with a `DS.InvalidError`.

    @method recordWasInvalid
    @private
    @param {InternalModel} internalModel
    @param {Object} errors
  */
  recordWasInvalid(internalModel, errors) {
    internalModel.adapterDidInvalidate(errors);
  },

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is rejected (with anything other than a `DS.InvalidError`).

    @method recordWasError
    @private
    @param {InternalModel} internalModel
    @param {Error} error
  */
  recordWasError(internalModel, error) {
    internalModel.adapterDidError(error);
  },

  /**
    When an adapter's `createRecord`, `updateRecord` or `deleteRecord`
    resolves with data, this method extracts the ID from the supplied
    data.

    @method updateId
    @private
    @param {InternalModel} internalModel
    @param {Object} data
  */
  updateId(internalModel, data) {
    let oldId = internalModel.id;
    let modelName = internalModel.modelName;
    let id = coerceId(data.id);

    // ID absolutely can't be missing if the oldID is empty (missing Id in response for a new record)
    assert(`'${modelName}' was saved to the server, but the response does not have an id and your record does not either.`, !(id === null && oldId === null));

    // ID absolutely can't be different than oldID if oldID is not null
    assert(`'${modelName}:${oldId}' was saved to the server, but the response returned the new id '${id}'. The store cannot assign a new id to a record that already has an id.`, !(oldId !== null && id !== oldId));

    // ID can be null if oldID is not null (altered ID in response for a record)
    // however, this is more than likely a developer error.
    if (oldId !== null && id === null) {
      warn(`Your ${modelName} record was saved to the server, but the response does not have an id.`, !(oldId !== null && id === null));
      return;
    }

    this._internalModelsFor(internalModel.modelName).set(id, internalModel);

    internalModel.setId(id);
  },

  /**
    Returns a map of IDs to client IDs for a given modelName.

    @method _internalModelsFor
    @private
    @param {String} modelName
    @return {Object} recordMap
  */
  _internalModelsFor(modelName) {
    heimdall.increment(_internalModelsFor);
    return this._identityMap.retrieve(modelName);
  },

  // ................
  // . LOADING DATA .
  // ................

  /**
    This internal method is used by `push`.

    @method _load
    @private
    @param {Object} data
  */
  _load(data) {
    heimdall.increment(_load);
    let internalModel = this._internalModelForId(data.type, data.id);

    internalModel.setupData(data);

    this.recordArrayManager.recordDidChange(internalModel);

    return internalModel;
  },

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

    @private
  */
  _modelForMixin(normalizedModelName) {
    heimdall.increment(_modelForMixin);
    // container.registry = 2.1
    // container._registry = 1.11 - 2.0
    // container = < 1.11
    let owner = getOwner(this);
    let mixin;

    if (owner.factoryFor) {
      let MaybeMixin = owner.factoryFor(`mixin:${normalizedModelName}`);
      mixin = MaybeMixin && MaybeMixin.class;
    } else {
      mixin = owner._lookupFactory(`mixin:${normalizedModelName}`);
    }

    if (mixin) {
      let ModelForMixin = Model.extend(mixin);
      ModelForMixin.reopenClass({
        __isMixin: true,
        __mixin: mixin
      });

      //Cache the class as a model
      owner.register('model:' + normalizedModelName, ModelForMixin);
    }

    return this.modelFactoryFor(normalizedModelName);
  },

  /**
    Returns the model class for the particular `modelName`.

    The class of a model might be useful if you want to get a list of all the
    relationship names of the model, see
    [`relationshipNames`](http://emberjs.com/api/data/classes/DS.Model.html#property_relationshipNames)
    for example.

    @method modelFor
    @param {String} modelName
    @return {DS.Model}
  */
  modelFor(modelName) {
    assert(`You need to pass a model name to the store's modelFor method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    let normalizedModelName = normalizeModelName(modelName);

    return this._modelFor(normalizedModelName);
  },

  /*
    @private
   */
  _modelFor(modelName) {
    let maybeFactory = this._modelFactoryFor(modelName);
    // for factorFor factory/class split
    return maybeFactory.class ? maybeFactory.class : maybeFactory;
  },

  _modelFactoryFor(modelName) {
    heimdall.increment(modelFor);
    let factory = this._modelFactoryCache[modelName];

    if (!factory) {
      factory = this.modelFactoryFor(modelName);

      if (!factory) {
        //Support looking up mixins as base types for polymorphic relationships
        factory = this._modelForMixin(modelName);
      }
      if (!factory) {
        throw new EmberError(`No model was found for '${modelName}'`);
      }

      // interopt with the future
      let klass = getOwner(this).factoryFor ? factory.class : factory;

      assert(`'${inspect(klass)}' does not appear to be an ember-data model`, klass.isModel);

      // TODO: deprecate this
      klass.modelName = klass.modelName || modelName;

      this._modelFactoryCache[modelName] = factory;
    }

    return factory;
  },

  /*
   @private
   */
  modelFactoryFor(modelName) {
    heimdall.increment(modelFactoryFor);
    assert(`You need to pass a model name to the store's modelFactoryFor method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    let normalizedModelName = normalizeModelName(modelName);
    let owner = getOwner(this);

    if (owner.factoryFor) {
      return owner.factoryFor(`model:${normalizedModelName}`);
    } else {
      return owner._lookupFactory(`model:${normalizedModelName}`);
    }
  },

  /**
    Push some data for a given type into the store.

    This method expects normalized [JSON API](http://jsonapi.org/) document. This means you have to follow [JSON API specification](http://jsonapi.org/format/) with few minor adjustments:
    - record's `type` should always be in singular, dasherized form
    - members (properties) should be camelCased

    [Your primary data should be wrapped inside `data` property](http://jsonapi.org/format/#document-top-level):

    ```js
    store.push({
      data: {
        // primary data for single record of type `Person`
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Daniel',
          lastName: 'Kmak'
        }
      }
    });
    ```

    [Demo.](http://ember-twiddle.com/fb99f18cd3b4d3e2a4c7)

    `data` property can also hold an array (of records):

    ```js
    store.push({
      data: [
        // an array of records
        {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Daniel',
            lastName: 'Kmak'
          }
        },
        {
          id: '2',
          type: 'person',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale'
          }
        }
      ]
    });
    ```

    [Demo.](http://ember-twiddle.com/69cdbeaa3702159dc355)

    There are some typical properties for `JSONAPI` payload:
    * `id` - mandatory, unique record's key
    * `type` - mandatory string which matches `model`'s dasherized name in singular form
    * `attributes` - object which holds data for record attributes - `DS.attr`'s declared in model
    * `relationships` - object which must contain any of the following properties under each relationships' respective key (example path is `relationships.achievements.data`):
      - [`links`](http://jsonapi.org/format/#document-links)
      - [`data`](http://jsonapi.org/format/#document-resource-object-linkage) - place for primary data
      - [`meta`](http://jsonapi.org/format/#document-meta) - object which contains meta-information about relationship

    For this model:

    ```app/models/person.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),

      children: DS.hasMany('person')
    });
    ```

    To represent the children as IDs:

    ```js
    {
      data: {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        },
        relationships: {
          children: {
            data: [
              {
                id: '2',
                type: 'person'
              },
              {
                id: '3',
                type: 'person'
              },
              {
                id: '4',
                type: 'person'
              }
            ]
          }
        }
      }
    }
    ```

    [Demo.](http://ember-twiddle.com/343e1735e034091f5bde)

    To represent the children relationship as a URL:

    ```js
    {
      data: {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        },
        relationships: {
          children: {
            links: {
              related: '/people/1/children'
            }
          }
        }
      }
    }
    ```

    If you're streaming data or implementing an adapter, make sure
    that you have converted the incoming data into this form. The
    store's [normalize](#method_normalize) method is a convenience
    helper for converting a json payload into the form Ember Data
    expects.

    ```js
    store.push(store.normalize('person', data));
    ```

    This method can be used both to push in brand new
    records, as well as to update existing records.

    @method push
    @param {Object} data
    @return {DS.Model|Array} the record(s) that was created or
      updated.
  */
  push(data) {
    let token = heimdall.start('store.push');
    let pushed = this._push(data);

    if (Array.isArray(pushed)) {
      let records = pushed.map(internalModel => internalModel.getRecord());
      heimdall.stop(token);
      return records;
    }

    if (pushed === null) {
      heimdall.stop(token);
      return null;
    }

    let record = pushed.getRecord();
    heimdall.stop(token);
    return record;
  },

  /*
    Push some data in the form of a json-api document into the store,
    without creating materialized records.

    @method _push
    @private
    @param {Object} jsonApiDoc
    @return {DS.InternalModel|Array<DS.InternalModel>} pushed InternalModel(s)
  */
  _push(jsonApiDoc) {
    let token = heimdall.start('store._push');
    let internalModelOrModels = this._backburner.join(() => {
      let included = jsonApiDoc.included;
      let i, length;

      if (included) {
        for (i = 0, length = included.length; i < length; i++) {
          this._pushInternalModel(included[i]);
        }
      }

      if (Array.isArray(jsonApiDoc.data)) {
        length = jsonApiDoc.data.length;
        let internalModels = new Array(length);

        for (i = 0; i < length; i++) {
          internalModels[i] = this._pushInternalModel(jsonApiDoc.data[i]);
        }
        return internalModels;
      }

      if (jsonApiDoc.data === null) {
        return null;
      }

      assert(`Expected an object in the 'data' property in a call to 'push' for ${jsonApiDoc.type}, but was ${typeOf(jsonApiDoc.data)}`, typeOf(jsonApiDoc.data) === 'object');

      return this._pushInternalModel(jsonApiDoc.data);
    });
    heimdall.stop(token);
    return internalModelOrModels;
  },

  _hasModelFor(modelName) {
    let owner = getOwner(this);
    modelName = normalizeModelName(modelName);

    if (owner.factoryFor) {
      return !!owner.factoryFor(`model:${modelName}`);
    } else {
      return !!owner._lookupFactory(`model:${modelName}`);
    }
  },

  _pushInternalModel(data) {
    heimdall.increment(_pushInternalModel);
    let modelName = data.type;
    assert(`You must include an 'id' for ${modelName} in an object passed to 'push'`, data.id !== null && data.id !== undefined && data.id !== '');
    assert(`You tried to push data with a type '${modelName}' but no model could be found with that name.`, this._hasModelFor(modelName));

    runInDebug(() => {
      // If ENV.DS_WARN_ON_UNKNOWN_KEYS is set to true and the payload
      // contains unknown attributes or relationships, log a warning.

      if (ENV.DS_WARN_ON_UNKNOWN_KEYS) {
        let modelClass = this._modelFor(modelName);

        // Check unknown attributes
        let unknownAttributes = Object.keys(data.attributes || {}).filter((key) => {
          return !get$3(modelClass, 'fields').has(key);
        });
        let unknownAttributesMessage = `The payload for '${modelName}' contains these unknown attributes: ${unknownAttributes}. Make sure they've been defined in your model.`;
        warn(unknownAttributesMessage, unknownAttributes.length === 0, { id: 'ds.store.unknown-keys-in-payload' });

        // Check unknown relationships
        let unknownRelationships = Object.keys(data.relationships || {}).filter((key) => {
          return !get$3(modelClass, 'fields').has(key);
        });
        let unknownRelationshipsMessage = `The payload for '${modelName}' contains these unknown relationships: ${unknownRelationships}. Make sure they've been defined in your model.`;
        warn(unknownRelationshipsMessage, unknownRelationships.length === 0, { id: 'ds.store.unknown-keys-in-payload' });
      }
    });

    // Actually load the record into the store.
    let internalModel = this._load(data);

    this._setupRelationshipsForModel(internalModel, data);

    return internalModel;
  },

  _setupRelationshipsForModel(internalModel, data) {
    if (data.relationships === undefined) {
      return;
    }

    if (this._pushedInternalModels.push(internalModel, data) !== 2) {
      return;
    }

    this._backburner.schedule('normalizeRelationships', this, this._setupRelationships);
  },

  _setupRelationships() {
    heimdall.increment(_setupRelationships);
    let setupToken = heimdall.start('store._setupRelationships');
    let pushed = this._pushedInternalModels;

    // Cache the inverse maps for each modelClass that we visit during this
    // payload push.  In the common case where we are pushing many more
    // instances than types we want to minimize the cost of looking up the
    // inverse map and the overhead of Ember.get adds up.
    let modelNameToInverseMap = Object.create(null);

    for (let i = 0, l = pushed.length; i < l; i += 2) {
      // This will convert relationships specified as IDs into DS.Model instances
      // (possibly unloaded) and also create the data structures used to track
      // relationships.
      let internalModel = pushed[i];
      let data = pushed[i + 1];
      setupRelationships(this, internalModel, data, modelNameToInverseMap);
    }

    pushed.length = 0;
    heimdall.stop(setupToken);
  },

  /**
    Push some raw data into the store.

    This method can be used both to push in brand new
    records, as well as to update existing records. You
    can push in more than one type of object at once.
    All objects should be in the format expected by the
    serializer.

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.ActiveModelSerializer;
    ```

    ```js
    let pushData = {
      posts: [
        { id: 1, post_title: "Great post", comment_ids: [2] }
      ],
      comments: [
        { id: 2, comment_body: "Insightful comment" }
      ]
    }

    store.pushPayload(pushData);
    ```

    By default, the data will be deserialized using a default
    serializer (the application serializer if it exists).

    Alternatively, `pushPayload` will accept a model type which
    will determine which serializer will process the payload.

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.ActiveModelSerializer;
    ```

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.JSONSerializer;
    ```

    ```js
    store.pushPayload('comment', pushData); // Will use the application serializer
    store.pushPayload('post', pushData); // Will use the post serializer
    ```

    @method pushPayload
    @param {String} modelName Optionally, a model type used to determine which serializer will be used
    @param {Object} inputPayload
  */
  pushPayload(modelName, inputPayload) {
    let serializer;
    let payload;
    if (!inputPayload) {
      payload = modelName;
      serializer = defaultSerializer(this);
      assert(`You cannot use 'store#pushPayload' without a modelName unless your default serializer defines 'pushPayload'`, typeof serializer.pushPayload === 'function');
    } else {
      payload = inputPayload;
      assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');
      let normalizedModelName = normalizeModelName(modelName);
      serializer = this.serializerFor(normalizedModelName);
    }
    if (isEnabled('ds-pushpayload-return')) {
      return serializer.pushPayload(this, payload);
    } else {
      serializer.pushPayload(this, payload);
    }
  },

  /**
    `normalize` converts a json payload into the normalized form that
    [push](#method_push) expects.

    Example

    ```js
    socket.on('message', function(message) {
      let modelName = message.model;
      let data = message.data;
      store.push(store.normalize(modelName, data));
    });
    ```

    @method normalize
    @param {String} modelName The name of the model type for this payload
    @param {Object} payload
    @return {Object} The normalized payload
  */
  normalize(modelName, payload) {
    heimdall.increment(normalize);
    assert(`You need to pass a model name to the store's normalize method`, isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${inspect(modelName)}`, typeof modelName === 'string');
    let normalizedModelName = normalizeModelName(modelName);
    let serializer = this.serializerFor(normalizedModelName);
    let model = this._modelFor(normalizedModelName);
    return serializer.normalize(model, payload);
  },

  /**
    Build a brand new record for a given type, ID, and
    initial data.

    @method _buildInternalModel
    @private
    @param {String} modelName
    @param {String} id
    @param {Object} data
    @return {InternalModel} internal model
  */
  _buildInternalModel(modelName, id, data) {
    heimdall.increment(_buildInternalModel);

    assert(`You can no longer pass a modelClass as the first argument to store._buildInternalModel. Pass modelName instead.`, typeof modelName === 'string');

    let recordMap = this._internalModelsFor(modelName);

    assert(`The id ${id} has already been used with another record for modelClass '${modelName}'.`, !id || !recordMap.get(id));

    // lookupFactory should really return an object that creates
    // instances with the injections applied
    let internalModel = new InternalModel(modelName, id, this, data);

    recordMap.add(internalModel, id);

    return internalModel;
  },

  buildInternalModel(modelName, id, data) {
    deprecate('buildInternalModel was documented as private and will be removed in the next version of Ember Data.');
    return this._buildInternalModel(modelName, id, data);
  },

  //Called by the state machine to notify the store that the record is ready to be interacted with
  recordWasLoaded(record) {
    this.recordArrayManager.recordWasLoaded(record);
  },

  // ...............
  // . DESTRUCTION .
  // ...............

  /**
    When a record is destroyed, this un-indexes it and
    removes it from any record arrays so it can be GCed.

    @method _removeFromIdMap
    @private
    @param {InternalModel} internalModel
  */
  _removeFromIdMap(internalModel) {
    let recordMap = this._internalModelsFor(internalModel.modelName);
    let id = internalModel.id;

    recordMap.remove(internalModel, id);
  },

  // ......................
  // . PER-TYPE ADAPTERS
  // ......................

  /**
    Returns an instance of the adapter for a given type. For
    example, `adapterFor('person')` will return an instance of
    `App.PersonAdapter`.

    If no `App.PersonAdapter` is found, this method will look
    for an `App.ApplicationAdapter` (the default adapter for
    your entire application).

    If no `App.ApplicationAdapter` is found, it will return
    the value of the `defaultAdapter`.

    @method adapterFor
    @public
    @param {String} modelName
    @return DS.Adapter
  */
  adapterFor(modelName) {
    heimdall.increment(adapterFor);
    assert(`You need to pass a model name to the store's adapterFor method`, isPresent(modelName));
    assert(`Passing classes to store.adapterFor has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');
    let normalizedModelName = normalizeModelName(modelName);

    return this._instanceCache.get('adapter', normalizedModelName);
  },

  // ..............................
  // . RECORD CHANGE NOTIFICATION .
  // ..............................

  /**
    Returns an instance of the serializer for a given type. For
    example, `serializerFor('person')` will return an instance of
    `App.PersonSerializer`.

    If no `App.PersonSerializer` is found, this method will look
    for an `App.ApplicationSerializer` (the default serializer for
    your entire application).

    if no `App.ApplicationSerializer` is found, it will attempt
    to get the `defaultSerializer` from the `PersonAdapter`
    (`adapterFor('person')`).

    If a serializer cannot be found on the adapter, it will fall back
    to an instance of `DS.JSONSerializer`.

    @method serializerFor
    @public
    @param {String} modelName the record to serialize
    @return {DS.Serializer}
  */
  serializerFor(modelName) {
    heimdall.increment(serializerFor);
    assert(`You need to pass a model name to the store's serializerFor method`, isPresent(modelName));
    assert(`Passing classes to store.serializerFor has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');
    let normalizedModelName = normalizeModelName(modelName);

    return this._instanceCache.get('serializer', normalizedModelName);
  },

  lookupAdapter(name) {
    deprecate(`Use of lookupAdapter is deprecated, use adapterFor instead.`, false, {
      id: 'ds.store.lookupAdapter',
      until: '3.0'
    });
    return this.adapterFor(name);
  },

  lookupSerializer(name) {
    deprecate(`Use of lookupSerializer is deprecated, use serializerFor instead.`, false, {
      id: 'ds.store.lookupSerializer',
      until: '3.0'
    });
    return this.serializerFor(name);
  },

  willDestroy() {
    this._super(...arguments);
    this._pushedInternalModels = null;
    this.recordArrayManager.destroy();
    this._instanceCache.destroy();

    this.unloadAll();
  },

  _updateRelationshipState(relationship) {
    if (this._updatedRelationships.push(relationship) !== 1) {
      return;
    }

    this._backburner.join(() => {
      this._backburner.schedule('syncRelationships', this, this._flushUpdatedRelationships);
    });
  },

  _flushUpdatedRelationships() {
    let updated = this._updatedRelationships;

    for (let i = 0, l = updated.length; i < l; i++) {
      updated[i].flushCanonical();
    }

    updated.length = 0;
  },

  _updateInternalModel(internalModel) {
    if (this._updatedInternalModels.push(internalModel) !== 1) {
      return;
    }

    emberRun.schedule('actions', this, this._flushUpdatedInternalModels);
  },

  _flushUpdatedInternalModels() {
    let updated = this._updatedInternalModels;

    for (let i = 0, l = updated.length; i < l; i++) {
      updated[i]._triggerDeferredTriggers();
    }

    updated.length = 0;
  },

  _pushResourceIdentifier(relationship, resourceIdentifier) {
    if (isNone(resourceIdentifier)) {
      return;
    }

    assert(`A ${relationship.internalModel.modelName} record was pushed into the store with the value of ${relationship.key} being ${inspect(resourceIdentifier)}, but ${relationship.key} is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`, !Array.isArray(resourceIdentifier));

    //TODO:Better asserts
    return this._internalModelForId(resourceIdentifier.type, resourceIdentifier.id);
  },

  _pushResourceIdentifiers(relationship, resourceIdentifiers) {
    if (isNone(resourceIdentifiers)) {
      return;
    }

    assert(`A ${relationship.internalModel.modelName} record was pushed into the store with the value of ${relationship.key} being '${inspect(resourceIdentifiers)}', but ${relationship.key} is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.`, Array.isArray(resourceIdentifiers));

    let _internalModels = new Array(resourceIdentifiers.length);
    for (let i = 0; i < resourceIdentifiers.length; i++) {
      _internalModels[i] = this._pushResourceIdentifier(relationship, resourceIdentifiers[i]);
    }
    return _internalModels;
  }
});

// Delegation to the adapter and promise management



function defaultSerializer(store) {
  return store.serializerFor('application');
}

function _commit(adapter, store, operation, snapshot) {
  let internalModel = snapshot._internalModel;
  let modelName = snapshot.modelName;
  let modelClass = store._modelFor(modelName);
  assert(`You tried to update a record but you have no adapter (for ${modelName})`, adapter);
  assert(`You tried to update a record but your adapter (for ${modelName}) does not implement '${operation}'`, typeof adapter[operation] === 'function');
  let promise = adapter[operation](store, modelClass, snapshot);
  let serializer = serializerForAdapter(store, adapter, modelName);
  let label = `DS: Extract and notify about ${operation} completion of ${internalModel}`;

  assert(`Your adapter's '${operation}' method must return a value, but it returned 'undefined'`, promise !==undefined);

  promise = Promise$1.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then((adapterPayload) => {
    /*
      Note to future spelunkers hoping to optimize.
      We rely on this `run` to create a run loop if needed
      that `store._push` and `store.didSaveRecord` will both share.

      We use `join` because it is often the case that we
      have an outer run loop available still from the first
      call to `store._push`;
     */
    store._backburner.join(() => {
      let payload, data;
      if (adapterPayload) {
        payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, snapshot.id, operation);
        if (payload.included) {
          store._push({ data: null, included: payload.included });
        }
        data = payload.data;
      }
      store.didSaveRecord(internalModel, { data });
    });

    return internalModel;
  }, function(error) {
    if (error instanceof InvalidError) {
      let errors = serializer.extractErrors(store, modelClass, error, snapshot.id);

      store.recordWasInvalid(internalModel, errors);
    } else {
      store.recordWasError(internalModel, error);
    }

    throw error;
  }, label);
}

function isInverseRelationshipInitialized(store, internalModel, data, key, modelNameToInverseMap) {
  let relationshipData = data.relationships[key].data;

  if (!relationshipData) {
    // can't check inverse for eg { comments: { links: { related: URL }}}
    return false;
  }

  let inverseMap = modelNameToInverseMap[internalModel.modelName];
  if (!inverseMap) {
    inverseMap = modelNameToInverseMap[internalModel.modelName] = get$3(internalModel.type, 'inverseMap');
  }
  let inverseRelationshipMetadata = inverseMap[key];
  if (inverseRelationshipMetadata === undefined) {
    inverseRelationshipMetadata = internalModel.type.inverseFor(key, store);
  }

  if (!inverseRelationshipMetadata) {
    return false;
  }

  let { name: inverseRelationshipName } = inverseRelationshipMetadata;

  if (Array.isArray(relationshipData)) {
    for (let i=0; i<relationshipData.length; ++i) {
      let inverseInternalModel = store._internalModelsFor(relationshipData[i].type).get(relationshipData[i].id);
      if (inverseInternalModel && inverseInternalModel._relationships.has(inverseRelationshipName)) {
        return true;
      }
    }

    return false;
  } else {
    let inverseInternalModel = store._internalModelsFor(relationshipData.type).get(relationshipData.id);
    return inverseInternalModel && inverseInternalModel._relationships.has(inverseRelationshipName);
  }
}

function setupRelationships(store, internalModel, data, modelNameToInverseMap) {
  let relationships = internalModel._relationships;

  internalModel.type.eachRelationship(relationshipName => {
    if (!data.relationships[relationshipName]) {
      return;
    }

    let relationshipRequiresNotification = relationships.has(relationshipName) ||
      isInverseRelationshipInitialized(store, internalModel, data, relationshipName, modelNameToInverseMap);

    if (relationshipRequiresNotification) {
      let relationshipData = data.relationships[relationshipName];
      relationships.get(relationshipName).push(relationshipData);
    }

    // in debug, assert payload validity eagerly
    runInDebug(() => {
      let relationshipMeta = get$3(internalModel.type, 'relationshipsByName').get(relationshipName);
      let relationshipData = data.relationships[relationshipName];
      if (!relationshipData || !relationshipMeta) {
        return;
      }

      if (relationshipData.links) {
        let isAsync = relationshipMeta.options && relationshipMeta.options.async !== false;
        warn(`You pushed a record of type '${internalModel.type.modelName}' with a relationship '${relationshipName}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`, isAsync || relationshipData.data , {
          id: 'ds.store.push-link-for-sync-relationship'
        });
      } else if (relationshipData.data) {
        if (relationshipMeta.kind === 'belongsTo') {
          assert(`A ${internalModel.type.modelName} record was pushed into the store with the value of ${relationshipName} being ${inspect(relationshipData.data)}, but ${relationshipName} is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`, !Array.isArray(relationshipData.data));
        } else if (relationshipMeta.kind === 'hasMany') {
          assert(`A ${internalModel.type.modelName} record was pushed into the store with the value of ${relationshipName} being '${inspect(relationshipData.data)}', but ${relationshipName} is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.`, Array.isArray(relationshipData.data));
        }
      }
    });
  });
}

var Store$1 = Store;

/**
  @module ember-data
*/

/**
  All Ember Data classes, methods and functions are defined inside of this namespace.

  @class DS
  @static
*/

/**
  @property VERSION
  @type String
  @static
*/
const DS = Ember.Namespace.create({
  VERSION: VERSION,
  name: "DS"
});

if (Ember.libraries) {
  Ember.libraries.registerCoreLibrary('Ember Data', DS.VERSION);
}

/**
  `DS.belongsTo` is used to define One-To-One and One-To-Many
  relationships on a [DS.Model](/api/data/classes/DS.Model.html).


  `DS.belongsTo` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship.
  - `inverse`: A string used to identify the inverse property on a
    related model in a One-To-Many relationship. See [Explicit Inverses](#toc_explicit-inverses)

  #### One-To-One
  To declare a one-to-one relationship between two models, use
  `DS.belongsTo`:

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    profile: DS.belongsTo('profile')
  });
  ```

  ```app/models/profile.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    user: DS.belongsTo('user')
  });
  ```

  #### One-To-Many
  To declare a one-to-many relationship between two models, use
  `DS.belongsTo` in combination with `DS.hasMany`, like this:

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    comments: DS.hasMany('comment')
  });
  ```

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  You can avoid passing a string as the first parameter. In that case Ember Data
  will infer the type from the key name.

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    post: DS.belongsTo()
  });
  ```

  will lookup for a Post type.

  @namespace
  @method belongsTo
  @for DS
  @param {String} modelName (optional) type of the relationship
  @param {Object} options (optional) a hash of options
  @return {Ember.computed} relationship
*/
function belongsTo(modelName, options) {
  let opts, userEnteredModelName;
  if (typeof modelName === 'object') {
    opts = modelName;
    userEnteredModelName = undefined;
  } else {
    opts = options;
    userEnteredModelName = modelName;
  }

  if (typeof userEnteredModelName === 'string') {
    userEnteredModelName = normalizeModelName(userEnteredModelName);
  }

  assert("The first argument to DS.belongsTo must be a string representing a model type key, not an instance of " + Ember.inspect(userEnteredModelName) + ". E.g., to define a relation to the Person model, use DS.belongsTo('person')", typeof userEnteredModelName === 'string' || typeof userEnteredModelName === 'undefined');

  opts = opts || {};

  let meta = {
    type: userEnteredModelName,
    isRelationship: true,
    options: opts,
    kind: 'belongsTo',
    name: 'Belongs To',
    key: null
  };

  return Ember.computed({
    get(key) {
      if (opts.hasOwnProperty('serialize')) {
        warn(`You provided a serialize option on the "${key}" property in the "${this._internalModel.modelName}" class, this belongs in the serializer. See DS.Serializer and it's implementations http://emberjs.com/api/data/classes/DS.Serializer.html`, false, {
          id: 'ds.model.serialize-option-in-belongs-to'
        });
      }

      if (opts.hasOwnProperty('embedded')) {
        warn(`You provided an embedded option on the "${key}" property in the "${this._internalModel.modelName}" class, this belongs in the serializer. See DS.EmbeddedRecordsMixin http://emberjs.com/api/data/classes/DS.EmbeddedRecordsMixin.html`, false, {
          id: 'ds.model.embedded-option-in-belongs-to'
        });
      }

      return this._internalModel._relationships.get(key).getRecord();
    },
    set(key, value) {
      if (value === undefined) {
        value = null;
      }
      if (value && value.then) {
        this._internalModel._relationships.get(key).setRecordPromise(value);
      } else if (value) {
        this._internalModel._relationships.get(key).setInternalModel(value._internalModel);
      } else {
        this._internalModel._relationships.get(key).setInternalModel(value);
      }

      return this._internalModel._relationships.get(key).getRecord();
    }
  }).meta(meta);
}

/*
  We're using this to detect arrays and "array-like" objects.

  This is a copy of the `isArray` method found in `ember-runtime/utils` as we're
  currently unable to import non-exposed modules.

  This method was previously exposed as `Ember.isArray` but since
  https://github.com/emberjs/ember.js/pull/11463 `Ember.isArray` is an alias of
  `Array.isArray` hence removing the "array-like" part.
 */
function isArrayLike(obj) {
  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray(obj)) { return true; }
  if (Ember.Array.detect(obj)) { return true; }

  let type = Ember.typeOf(obj);
  if ('array' === type) { return true; }
  if ((obj.length !== undefined) && 'object' === type) { return true; }
  return false;
}

/**
  @module ember-data
*/

const { get: get$16 } = Ember;

/**
  `DS.hasMany` is used to define One-To-Many and Many-To-Many
  relationships on a [DS.Model](/api/data/classes/DS.Model.html).

  `DS.hasMany` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship.
  - `inverse`: A string used to identify the inverse property on a related model.

  #### One-To-Many
  To declare a one-to-many relationship between two models, use
  `DS.belongsTo` in combination with `DS.hasMany`, like this:

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    comments: DS.hasMany('comment')
  });
  ```

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  #### Many-To-Many
  To declare a many-to-many relationship between two models, use
  `DS.hasMany`:

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    tags: DS.hasMany('tag')
  });
  ```

  ```app/models/tag.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    posts: DS.hasMany('post')
  });
  ```

  You can avoid passing a string as the first parameter. In that case Ember Data
  will infer the type from the singularized key name.

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    tags: DS.hasMany()
  });
  ```

  will lookup for a Tag type.

  #### Explicit Inverses

  Ember Data will do its best to discover which relationships map to
  one another. In the one-to-many code above, for example, Ember Data
  can figure out that changing the `comments` relationship should update
  the `post` relationship on the inverse because post is the only
  relationship to that model.

  However, sometimes you may have multiple `belongsTo`/`hasMany` for the
  same type. You can specify which property on the related model is
  the inverse using `DS.hasMany`'s `inverse` option:

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    onePost: DS.belongsTo('post'),
    twoPost: DS.belongsTo('post'),
    redPost: DS.belongsTo('post'),
    bluePost: DS.belongsTo('post')
  });
  ```

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    comments: DS.hasMany('comment', {
      inverse: 'redPost'
    })
  });
  ```

  You can also specify an inverse on a `belongsTo`, which works how
  you'd expect.

  @namespace
  @method hasMany
  @for DS
  @param {String} type (optional) type of the relationship
  @param {Object} options (optional) a hash of options
  @return {Ember.computed} relationship
*/
function hasMany(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  }

  assert(`The first argument to DS.hasMany must be a string representing a model type key, not an instance of ${Ember.inspect(type)}. E.g., to define a relation to the Comment model, use DS.hasMany('comment')`, typeof type === 'string' || typeof type === 'undefined');

  options = options || {};

  if (typeof type === 'string') {
    type = normalizeModelName(type);
  }

  // Metadata about relationships is stored on the meta of
  // the relationship. This is used for introspection and
  // serialization. Note that `key` is populated lazily
  // the first time the CP is called.
  let meta = {
    type,
    options,
    isRelationship: true,
    kind: 'hasMany',
    name: 'Has Many',
    key: null
  };

  return Ember.computed({
    get(key) {
      return this._internalModel._relationships.get(key).getRecords();
    },
    set(key, records) {
      assert(`You must pass an array of records to set a hasMany relationship`, isArrayLike(records));
      assert(`All elements of a hasMany relationship must be instances of DS.Model, you passed ${Ember.inspect(records)}`, (function() {
        return Ember.A(records).every((record) => record.hasOwnProperty('_internalModel') === true);
      })());

      let relationship = this._internalModel._relationships.get(key);
      relationship.clear();
      relationship.addInternalModels(records.map(record => get$16(record, '_internalModel')));
      return relationship.getRecords();
    }
  }).meta(meta);
}

const get$17 = Ember.get;

/**

  WARNING: This interface is likely to change in order to accomodate https://github.com/emberjs/rfcs/pull/4

  ## Using BuildURLMixin

  To use url building, include the mixin when extending an adapter, and call `buildURL` where needed.
  The default behaviour is designed for RESTAdapter.

  ### Example

  ```javascript
  export default DS.Adapter.extend(BuildURLMixin, {
    findRecord: function(store, type, id, snapshot) {
      var url = this.buildURL(type.modelName, id, snapshot, 'findRecord');
      return this.ajax(url, 'GET');
    }
  });
  ```

  ### Attributes

  The `host` and `namespace` attributes will be used if defined, and are optional.

  @class BuildURLMixin
  @namespace DS
*/
var buildUrlMixin = Ember.Mixin.create({
  /**
    Builds a URL for a given type and optional ID.

    By default, it pluralizes the type's name (for example, 'post'
    becomes 'posts' and 'person' becomes 'people'). To override the
    pluralization see [pathForType](#method_pathForType).

    If an ID is specified, it adds the ID to the path generated
    for the type, separated by a `/`.

    When called by RESTAdapter.findMany() the `id` and `snapshot` parameters
    will be arrays of ids and snapshots.

    @method buildURL
    @param {String} modelName
    @param {(String|Array|Object)} id single id or array of ids or query
    @param {(DS.Snapshot|Array)} snapshot single snapshot or array of snapshots
    @param {String} requestType
    @param {Object} query object of query parameters to send for query requests.
    @return {String} url
  */
  buildURL(modelName, id, snapshot, requestType, query) {
    switch (requestType) {
      case 'findRecord':
        return this.urlForFindRecord(id, modelName, snapshot);
      case 'findAll':
        return this.urlForFindAll(modelName, snapshot);
      case 'query':
        return this.urlForQuery(query, modelName);
      case 'queryRecord':
        return this.urlForQueryRecord(query, modelName);
      case 'findMany':
        return this.urlForFindMany(id, modelName, snapshot);
      case 'findHasMany':
        return this.urlForFindHasMany(id, modelName, snapshot);
      case 'findBelongsTo':
        return this.urlForFindBelongsTo(id, modelName, snapshot);
      case 'createRecord':
        return this.urlForCreateRecord(modelName, snapshot);
      case 'updateRecord':
        return this.urlForUpdateRecord(id, modelName, snapshot);
      case 'deleteRecord':
        return this.urlForDeleteRecord(id, modelName, snapshot);
      default:
        return this._buildURL(modelName, id);
    }
  },

  /**
    @method _buildURL
    @private
    @param {String} modelName
    @param {String} id
    @return {String} url
  */
  _buildURL(modelName, id) {
    let path;
    let url = [];
    let host = get$17(this, 'host');
    let prefix = this.urlPrefix();

    if (modelName) {
      path = this.pathForType(modelName);
      if (path) { url.push(path); }
    }

    if (id) { url.push(encodeURIComponent(id)); }
    if (prefix) { url.unshift(prefix); }

    url = url.join('/');
    if (!host && url && url.charAt(0) !== '/') {
      url = '/' + url;
    }

    return url;
  },

  /**
   Builds a URL for a `store.findRecord(type, id)` call.

   Example:

   ```app/adapters/user.js
   import DS from 'ember-data';

   export default DS.JSONAPIAdapter.extend({
     urlForFindRecord(id, modelName, snapshot) {
       let baseUrl = this.buildURL();
       return `${baseUrl}/users/${snapshot.adapterOptions.user_id}/playlists/${id}`;
     }
   });
   ```

   @method urlForFindRecord
   @param {String} id
   @param {String} modelName
   @param {DS.Snapshot} snapshot
   @return {String} url

   */
  urlForFindRecord(id, modelName, snapshot) {
    return this._buildURL(modelName, id);
  },

  /**
   Builds a URL for a `store.findAll(type)` call.

   Example:

   ```app/adapters/comment.js
   import DS from 'ember-data';

   export default DS.JSONAPIAdapter.extend({
     urlForFindAll(modelName, snapshot) {
       return 'data/comments.json';
     }
   });
   ```

   @method urlForFindAll
   @param {String} modelName
   @param {DS.SnapshotRecordArray} snapshot
   @return {String} url
   */
  urlForFindAll(modelName, snapshot) {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for a `store.query(type, query)` call.

   Example:

   ```app/adapters/application.js
   import DS from 'ember-data';

   export default DS.RESTAdapter.extend({
     host: 'https://api.github.com',
     urlForQuery (query, modelName) {
       switch(modelName) {
         case 'repo':
           return `https://api.github.com/orgs/${query.orgId}/repos`;
         default:
           return this._super(...arguments);
       }
     }
   });
   ```

   @method urlForQuery
   @param {Object} query
   @param {String} modelName
   @return {String} url
   */
  urlForQuery(query, modelName) {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for a `store.queryRecord(type, query)` call.

   Example:

   ```app/adapters/application.js
   import DS from 'ember-data';

   export default DS.RESTAdapter.extend({
     urlForQueryRecord({ slug }, modelName) {
       let baseUrl = this.buildURL();
       return `${baseUrl}/${encodeURIComponent(slug)}`;
     }
   });
   ```

   @method urlForQueryRecord
   @param {Object} query
   @param {String} modelName
   @return {String} url
   */
  urlForQueryRecord(query, modelName) {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for coalesceing multiple `store.findRecord(type, id)
   records into 1 request when the adapter's `coalesceFindRequests`
   property is true.

   Example:

   ```app/adapters/application.js
   import DS from 'ember-data';

   export default DS.RESTAdapter.extend({
     urlForFindMany(ids, modelName) {
       let baseUrl = this.buildURL();
       return `${baseUrl}/coalesce`;
     }
   });
   ```

   @method urlForFindMany
   @param {Array} ids
   @param {String} modelName
   @param {Array} snapshots
   @return {String} url
   */
  urlForFindMany(ids, modelName, snapshots) {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for fetching a async hasMany relationship when a url
   is not provided by the server.

   Example:

   ```app/adapters/application.js
   import DS from 'ember-data';

   export default DS.JSONAPIAdapter.extend({
     urlForFindHasMany(id, modelName, snapshot) {
       let baseUrl = this.buildURL(id, modelName);
       return `${baseUrl}/relationships`;
     }
   });
   ```

   @method urlForFindHasMany
   @param {String} id
   @param {String} modelName
   @param {DS.Snapshot} snapshot
   @return {String} url
   */
  urlForFindHasMany(id, modelName, snapshot) {
    return this._buildURL(modelName, id);
  },

  /**
   Builds a URL for fetching a async belongsTo relationship when a url
   is not provided by the server.

   Example:

   ```app/adapters/application.js
   import DS from 'ember-data';

   export default DS.JSONAPIAdapter.extend({
     urlForFindBelongsTo(id, modelName, snapshot) {
       let baseUrl = this.buildURL(id, modelName);
       return `${baseUrl}/relationships`;
     }
   });
   ```

   @method urlForFindBelongsTo
   @param {String} id
   @param {String} modelName
   @param {DS.Snapshot} snapshot
   @return {String} url
   */
  urlForFindBelongsTo(id, modelName, snapshot) {
    return this._buildURL(modelName, id);
  },

  /**
   Builds a URL for a `record.save()` call when the record was created
   locally using `store.createRecord()`.

   Example:

   ```app/adapters/application.js
   import DS from 'ember-data';

   export default DS.RESTAdapter.extend({
     urlForCreateRecord(modelName, snapshot) {
       return this._super(...arguments) + '/new';
     }
   });
   ```

   @method urlForCreateRecord
   @param {String} modelName
   @param {DS.Snapshot} snapshot
   @return {String} url
   */
  urlForCreateRecord(modelName, snapshot) {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for a `record.save()` call when the record has been update locally.

   Example:

   ```app/adapters/application.js
   import DS from 'ember-data';

   export default DS.RESTAdapter.extend({
     urlForUpdateRecord(id, modelName, snapshot) {
       return `/${id}/feed?access_token=${snapshot.adapterOptions.token}`;
     }
   });
   ```

   @method urlForUpdateRecord
   @param {String} id
   @param {String} modelName
   @param {DS.Snapshot} snapshot
   @return {String} url
   */
  urlForUpdateRecord(id, modelName, snapshot) {
    return this._buildURL(modelName, id);
  },

  /**
   Builds a URL for a `record.save()` call when the record has been deleted locally.

   Example:

   ```app/adapters/application.js
   import DS from 'ember-data';

   export default DS.RESTAdapter.extend({
     urlForDeleteRecord(id, modelName, snapshot) {
       return this._super(...arguments) + '/destroy';
     }
   });
   ```

   @method urlForDeleteRecord
   @param {String} id
   @param {String} modelName
   @param {DS.Snapshot} snapshot
   @return {String} url
   */
  urlForDeleteRecord(id, modelName, snapshot) {
    return this._buildURL(modelName, id);
  },

  /**
    @method urlPrefix
    @private
    @param {String} path
    @param {String} parentURL
    @return {String} urlPrefix
  */
  urlPrefix(path, parentURL) {
    let host = get$17(this, 'host');
    let namespace = get$17(this, 'namespace');

    if (!host || host === '/') {
      host = '';
    }

    if (path) {
      // Protocol relative url
      if (/^\/\//.test(path) || /http(s)?:\/\//.test(path)) {
        // Do nothing, the full host is already included.
        return path;

      // Absolute path
      } else if (path.charAt(0) === '/') {
        return `${host}${path}`;
      // Relative path
      } else {
        return `${parentURL}/${path}`;
      }
    }

    // No path provided
    let url = [];
    if (host) { url.push(host); }
    if (namespace) { url.push(namespace); }
    return url.join('/');
  },

  /**
    Determines the pathname for a given type.

    By default, it pluralizes the type's name (for example,
    'post' becomes 'posts' and 'person' becomes 'people').

    ### Pathname customization

    For example if you have an object LineItem with an
    endpoint of "/line_items/".

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.RESTAdapter.extend({
      pathForType: function(modelName) {
        var decamelized = Ember.String.decamelize(modelName);
        return Ember.String.pluralize(decamelized);
      }
    });
    ```

    @method pathForType
    @param {String} modelName
    @return {String} path
  **/
  pathForType(modelName) {
    let camelized = Ember.String.camelize(modelName);
    return Ember.String.pluralize(camelized);
  }
});

const CLRF = '\u000d\u000a';

function parseResponseHeaders(headersString) {
  let headers = Object.create(null);

  if (!headersString) {
    return headers;
  }

  let headerPairs = headersString.split(CLRF);
  for (let i = 0; i < headerPairs.length; i++) {
    let header = headerPairs[i];
    let j = 0;
    let foundSep = false;

    for (; j < header.length; j++) {
      if (header.charCodeAt(j) === 58 /* ':' */) {
        foundSep = true;
        break;
      }
    }

    if (foundSep === false) {
      break;
    }

    let field = header.substring(0, j).trim();
    let value = header.substring(j + 1, header.length).trim();

    if (value) {
      headers[field] = value;
    }
  }

  return headers;
}

/**
  The `DS.Transform` class is used to serialize and deserialize model
  attributes when they are saved or loaded from an
  adapter. Subclassing `DS.Transform` is useful for creating custom
  attributes. All subclasses of `DS.Transform` must implement a
  `serialize` and a `deserialize` method.

  Example

  ```app/transforms/temperature.js
  import DS from 'ember-data';

  // Converts centigrade in the JSON to fahrenheit in the app
  export default DS.Transform.extend({
    deserialize(serialized, options) {
      return (serialized *  1.8) + 32;
    },

    serialize(deserialized, options) {
      return (deserialized - 32) / 1.8;
    }
  });
  ```

  The options passed into the `DS.attr` function when the attribute is
  declared on the model is also available in the transform.

  ```app/models/post.js
  export default DS.Model.extend({
    title: DS.attr('string'),
    markdown: DS.attr('markdown', {
      markdown: {
        gfm: false,
        sanitize: true
      }
    })
  });
  ```

  ```app/transforms/markdown.js
  export default DS.Transform.extend({
    serialize(deserialized, options) {
      return deserialized.raw;
    },

    deserialize(serialized, options) {
      var markdownOptions = options.markdown || {};

      return marked(serialized, markdownOptions);
    }
  });
  ```

  Usage

  ```app/models/requirement.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    name: DS.attr('string'),
    temperature: DS.attr('temperature')
  });
  ```

  @class Transform
  @namespace DS
 */
var Transform = Ember.Object.extend({
  /**
    When given a deserialized value from a record attribute this
    method must return the serialized value.

    Example

    ```javascript
    serialize(deserialized, options) {
      return Ember.isEmpty(deserialized) ? null : Number(deserialized);
    }
    ```

    @method serialize
    @param deserialized The deserialized value
    @param options hash of options passed to `DS.attr`
    @return The serialized value
  */
  serialize: null,

  /**
    When given a serialize value from a JSON object this method must
    return the deserialized value for the record attribute.

    Example

    ```javascript
    deserialize(serialized, options) {
      return empty(serialized) ? null : Number(serialized);
    }
    ```

    @method deserialize
    @param serialized The serialized value
    @param options hash of options passed to `DS.attr`
    @return The deserialized value
  */
  deserialize: null
});

const empty = Ember.isEmpty;

function isNumber(value) {
  return value === value && value !== Infinity && value !== -Infinity;
}

/**
  The `DS.NumberTransform` class is used to serialize and deserialize
  numeric attributes on Ember Data record objects. This transform is
  used when `number` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function.

  Usage

  ```app/models/score.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    value: DS.attr('number'),
    player: DS.belongsTo('player'),
    date: DS.attr('date')
  });
  ```

  @class NumberTransform
  @extends DS.Transform
  @namespace DS
 */
var number = Transform.extend({
  deserialize(serialized) {
    let transformed;

    if (empty(serialized)) {
      return null;
    } else {
      transformed = Number(serialized);

      return isNumber(transformed) ? transformed : null;
    }
  },

  serialize(deserialized) {
    let transformed;

    if (empty(deserialized)) {
      return null;
    } else {
      transformed = Number(deserialized);

      return isNumber(transformed) ? transformed : null;
    }
  }
});

/**
  @module ember-data
*/

/**
   Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>

   © 2011 Colin Snover <http://zetafleet.com>

   Released under MIT license.

   @class Date
   @namespace Ember
   @static
   @deprecated
*/
Ember.Date = Ember.Date || {};

const origParse = Date.parse;
const numericKeys = [1, 4, 5, 6, 7, 10, 11];

const parseDate = function (date) {
  let timestamp, struct;
  let minutesOffset = 0;

  // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
  // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
  // implementations could be faster
  //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
  if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2}):?(?:(\d{2}))?)?)?$/.exec(date))) {
    // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
    for (let i = 0, k; (k = numericKeys[i]); ++i) {
      struct[k] = +struct[k] || 0;
    }

    // allow undefined days and months
    struct[2] = (+struct[2] || 1) - 1;
    struct[3] = +struct[3] || 1;

    if (struct[8] !== 'Z' && struct[9] !== undefined) {
      minutesOffset = struct[10] * 60 + struct[11];

      if (struct[9] === '+') {
        minutesOffset = 0 - minutesOffset;
      }
    }

    timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
  } else {
    timestamp = origParse ? origParse(date) : NaN;
  }

  return timestamp;
};

Ember.Date.parse = function (date) {
  // throw deprecation
  deprecate(`Ember.Date.parse is deprecated because Safari 5-, IE8-, and
      Firefox 3.6- are no longer supported (see
      https://github.com/csnover/js-iso8601 for the history of this issue).
      Please use Date.parse instead`, false, {
        id: 'ds.ember.date.parse-deprecate',
        until: '3.0.0'
      });

  return parseDate(date);
};

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Date) {
  deprecate(`Overriding Date.parse with Ember.Date.parse is deprecated. Please set ENV.EmberENV.EXTEND_PROTOTYPES.Date to false in config/environment.js


// config/environment.js
ENV = {
  EmberENV: {
    EXTEND_PROTOTYPES: {
      Date: false,
    }
  }
}
`, false, {
  id: 'ds.date.parse-deprecate',
  until: '3.0.0'
});
  Date.parse = parseDate;
}

/**
  The `DS.DateTransform` class is used to serialize and deserialize
  date attributes on Ember Data record objects. This transform is used
  when `date` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function. It uses the [`ISO 8601`](https://en.wikipedia.org/wiki/ISO_8601)
  standard.

  ```app/models/score.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    value: DS.attr('number'),
    player: DS.belongsTo('player'),
    date: DS.attr('date')
  });
  ```

  @class DateTransform
  @extends DS.Transform
  @namespace DS
 */

var date = Transform.extend({
  deserialize(serialized) {
    let type = typeof serialized;

    if (type === "string") {
      return new Date(parseDate(serialized));
    } else if (type === "number") {
      return new Date(serialized);
    } else if (serialized === null || serialized === undefined) {
      // if the value is null return null
      // if the value is not present in the data return undefined
      return serialized;
    } else {
      return null;
    }
  },

  serialize(date) {
    if (date instanceof Date && !isNaN(date)) {
      return date.toISOString();
    } else {
      return null;
    }
  }
});

const none = Ember.isNone;

/**
  The `DS.StringTransform` class is used to serialize and deserialize
  string attributes on Ember Data record objects. This transform is
  used when `string` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function.

  Usage

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    isAdmin: DS.attr('boolean'),
    name: DS.attr('string'),
    email: DS.attr('string')
  });
  ```

  @class StringTransform
  @extends DS.Transform
  @namespace DS
 */
var string = Transform.extend({
  deserialize(serialized) {
    return none(serialized) ? null : String(serialized);
  },
  serialize(deserialized) {
    return none(deserialized) ? null : String(deserialized);
  }
});

const { isNone: isNone$1 } = Ember;

/**
  The `DS.BooleanTransform` class is used to serialize and deserialize
  boolean attributes on Ember Data record objects. This transform is
  used when `boolean` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function.

  Usage

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    isAdmin: DS.attr('boolean'),
    name: DS.attr('string'),
    email: DS.attr('string')
  });
  ```

  By default the boolean transform only allows for values of `true` or
  `false`. You can opt into allowing `null` values for
  boolean attributes via `DS.attr('boolean', { allowNull: true })`

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    email: DS.attr('string'),
    username: DS.attr('string'),
    wantsWeeklyEmail: DS.attr('boolean', { allowNull: true })
  });
  ```

  @class BooleanTransform
  @extends DS.Transform
  @namespace DS
 */
var boolean = Transform.extend({
  deserialize(serialized, options) {
    let type = typeof serialized;

    if (isNone$1(serialized) && options.allowNull === true) {
      return null;
    }

    if (type === "boolean") {
      return serialized;
    } else if (type === "string") {
      return serialized.match(/^true$|^t$|^1$/i) !== null;
    } else if (type === "number") {
      return serialized === 1;
    } else {
      return false;
    }
  },

  serialize(deserialized, options) {
    if (isNone$1(deserialized) && options.allowNull === true) {
      return null;
    }

    return Boolean(deserialized);
  }
});

/* globals global, window, self */

// originally from https://github.com/emberjs/ember.js/blob/c0bd26639f50efd6a03ee5b87035fd200e313b8e/packages/ember-environment/lib/global.js

// from lodash to catch fake globals
function checkGlobal(value) {
  return (value && value.Object === Object) ? value : undefined;
}

// element ids can ruin global miss checks
function checkElementIdShadowing(value) {
  return (value && value.nodeType === undefined) ? value : undefined;
}

// export real global
var global$1 = checkGlobal(checkElementIdShadowing(typeof global === 'object' && global)) ||
  checkGlobal(typeof self === 'object' && self) ||
  checkGlobal(typeof window === 'object' && window) ||
  new Function('return this')(); // eval outside of strict mode

/**
  @module ember-data
*/
const capitalize = Ember.String.capitalize;
const underscore = Ember.String.underscore;
const { assert: assert$1, get: get$18 } = Ember;

/*
  Extend `Ember.DataAdapter` with ED specific code.

  @class DebugAdapter
  @namespace DS
  @extends Ember.DataAdapter
  @private
*/
var debugAdapter = Ember.DataAdapter.extend({
  getFilters() {
    return [
      { name: 'isNew', desc: 'New' },
      { name: 'isModified', desc: 'Modified' },
      { name: 'isClean', desc: 'Clean' }
    ];
  },

  detect(typeClass) {
    return typeClass !== Model && Model.detect(typeClass);
  },

  columnsForType(typeClass) {
    let columns = [{
      name: 'id',
      desc: 'Id'
    }];
    let count = 0;
    let self = this;
    get$18(typeClass, 'attributes').forEach((meta, name) => {
      if (count++ > self.attributeLimit) { return false; }
      let desc = capitalize(underscore(name).replace('_', ' '));
      columns.push({ name: name, desc: desc });
    });
    return columns;
  },

  getRecords(modelClass, modelName) {
    if (arguments.length < 2) {
      // Legacy Ember.js < 1.13 support
      let containerKey = modelClass._debugContainerKey;
      if (containerKey) {
        let match = containerKey.match(/model:(.*)/);
        if (match) {
          modelName = match[1];
        }
      }
    }
    assert$1("Cannot find model name. Please upgrade to Ember.js >= 1.13 for Ember Inspector support", !!modelName);
    return this.get('store').peekAll(modelName);
  },

  getRecordColumnValues(record) {
    let count = 0;
    let columnValues = { id: get$18(record, 'id') };

    record.eachAttribute((key) => {
      if (count++ > this.attributeLimit) {
        return false;
      }
      columnValues[key] = get$18(record, key);
    });
    return columnValues;
  },

  getRecordKeywords(record) {
    let keywords = [];
    let keys = Ember.A(['id']);
    record.eachAttribute((key) => keys.push(key));
    keys.forEach((key) => keywords.push(get$18(record, key)));
    return keywords;
  },

  getRecordFilterValues(record) {
    return {
      isNew: record.get('isNew'),
      isModified: record.get('hasDirtyAttributes') && !record.get('isNew'),
      isClean: !record.get('hasDirtyAttributes')
    };
  },

  getRecordColor(record) {
    let color = 'black';
    if (record.get('isNew')) {
      color = 'green';
    } else if (record.get('hasDirtyAttributes')) {
      color = 'blue';
    }
    return color;
  },

  observeRecord(record, recordUpdated) {
    let releaseMethods = Ember.A();
    let keysToObserve = Ember.A(['id', 'isNew', 'hasDirtyAttributes']);

    record.eachAttribute((key) => keysToObserve.push(key));
    let adapter = this;

    keysToObserve.forEach(function(key) {
      let handler = function() {
        recordUpdated(adapter.wrapRecord(record));
      };
      Ember.addObserver(record, key, handler);
      releaseMethods.push(function() {
        Ember.removeObserver(record, key, handler);
      });
    });

    let release = function() {
      releaseMethods.forEach((fn) => fn());
    };

    return release;
  }
});

// public

export { Model, Errors, Store$1 as Store, DS, belongsTo, hasMany, buildUrlMixin as BuildURLMixin, Snapshot, normalizeModelName, getOwner, modelHasAttributeOrRelationshipNamedType, coerceId, parseResponseHeaders, Transform, number as NumberTransform, date as DateTransform, string as StringTransform, boolean as BooleanTransform, RootState$1 as RootState, global$1 as global, isEnabled, InternalModel, parseDate, PromiseArray, PromiseObject, PromiseManyArray, RecordArray, FilteredRecordArray, AdapterPopulatedRecordArray, ManyArray, RecordArrayManager, Relationship, debugAdapter as DebugAdapter };
