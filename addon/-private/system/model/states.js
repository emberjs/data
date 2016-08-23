/**
  @module ember-data
*/
import Ember from 'ember';
import { assert } from "ember-data/-private/debug";

var get = Ember.get;
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
   * [isDirty](DS.Model.html#property_isDirty)
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

  internalModel.updateRecordArraysLater();
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
var DirtyState = {
  initialState: 'uncommitted',

  // FLAGS
  isDirty: true,

  // SUBSTATES

  // When a record first becomes dirty, it is `uncommitted`.
  // This means that there are local pending changes, but they
  // have not yet begun to be saved, and are not invalid.
  uncommitted: {
    // EVENTS
    didSetProperty: didSetProperty,

    //TODO(Igor) reloading now triggers a
    //loadingData event, though it seems fine?
    loadingData: Ember.K,

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

    becomeDirty: Ember.K,

    willCommit(internalModel) {
      internalModel.transitionTo('inFlight');
    },

    reloadRecord(internalModel, resolve) {
      resolve(internalModel.store.reloadRecord(internalModel));
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
    didSetProperty: didSetProperty,
    becomeDirty: Ember.K,
    pushedData: Ember.K,

    unloadRecord: assertAgainstUnloadRecord,

    // TODO: More robust semantics around save-while-in-flight
    willCommit: Ember.K,

    didCommit(internalModel) {
      var dirtyType = get(this, 'dirtyType');

      internalModel.transitionTo('saved');
      internalModel.send('invokeLifecycleCallbacks', dirtyType);
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

    becameInvalid: Ember.K,
    becomeDirty: Ember.K,
    pushedData: Ember.K,

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
  var clone = {};
  var value;

  for (var prop in object) {
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
  for (var prop in hash) {
    original[prop] = hash[prop];
  }

  return original;
}

function dirtyState(options) {
  var newState = deepClone(DirtyState);
  return mixin(newState, options);
}

var createdState = dirtyState({
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

var updatedState = dirtyState({
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

createdState.uncommitted.propertyWasReset = Ember.K;

function assertAgainstUnloadRecord(internalModel) {
  assert("You can only unload a record which is not inFlight. `" + internalModel + "`", false);
}

updatedState.inFlight.unloadRecord = assertAgainstUnloadRecord;

updatedState.uncommitted.deleteRecord = function(internalModel) {
  internalModel.transitionTo('deleted.uncommitted');
};

var RootState = {
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
  rolledBack: Ember.K,
  unloadRecord(internalModel) {
    // clear relationships before moving to deleted state
    // otherwise it fails
    internalModel.clearRelationships();
    internalModel.transitionTo('deleted.saved');
  },


  propertyWasReset: Ember.K,

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
    loadingData: Ember.K,

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
      didSetProperty: didSetProperty,

      pushedData: Ember.K,

      becomeDirty(internalModel) {
        internalModel.transitionTo('updated.uncommitted');
      },

      willCommit(internalModel) {
        internalModel.transitionTo('updated.inFlight');
      },

      reloadRecord(internalModel, resolve) {
        resolve(internalModel.store.reloadRecord(internalModel));
      },

      deleteRecord(internalModel) {
        internalModel.transitionTo('deleted.uncommitted');
      },

      unloadRecord(internalModel) {
        // clear relationships before moving to deleted state
        // otherwise it fails
        internalModel.clearRelationships();
        internalModel.transitionTo('deleted.saved');
      },

      didCommit(internalModel) {
        internalModel.send('invokeLifecycleCallbacks', get(internalModel, 'lastDirtyType'));
      },

      // loaded.saved.notFound would be triggered by a failed
      // `reload()` on an unchanged record
      notFound: Ember.K

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

      pushedData: Ember.K,
      becomeDirty: Ember.K,
      deleteRecord: Ember.K,

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
      willCommit: Ember.K,
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
        var store = internalModel.store;
        store._dematerializeRecord(internalModel);
      },

      invokeLifecycleCallbacks(internalModel) {
        internalModel.triggerLater('didDelete', internalModel);
        internalModel.triggerLater('didCommit', internalModel);
      },

      willCommit: Ember.K,

      didCommit: Ember.K
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

      becameInvalid: Ember.K,
      becomeDirty: Ember.K,
      deleteRecord: Ember.K,
      willCommit: Ember.K,


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

  for (var prop in object) {
    if (!object.hasOwnProperty(prop) || prop === 'parentState' || prop === 'stateName') { continue; }
    if (typeof object[prop] === 'object') {
      object[prop] = wireState(object[prop], object, name + "." + prop);
    }
  }

  return object;
}

RootState = wireState(RootState, null, "root");

export default RootState;
