require("ember-data/system/model/states");

var get = Ember.get, set = Ember.set, none = Ember.none;

var retrieveFromCurrentState = Ember.computed(function(key) {
  return get(get(this, 'stateManager.currentState'), key);
}).property('stateManager.currentState');

DS.Model = Ember.Object.extend(Ember.Evented, {
  isLoaded: retrieveFromCurrentState,
  isDirty: retrieveFromCurrentState,
  isSaving: retrieveFromCurrentState,
  isDeleted: retrieveFromCurrentState,
  isError: retrieveFromCurrentState,
  isNew: retrieveFromCurrentState,
  isValid: retrieveFromCurrentState,

  clientId: null,
  transaction: null,
  stateManager: null,
  errors: null,

  /**
    Create a JSON representation of the record, using the serialization
    strategy of the store's adapter.

    Available options:

    * `includeId`: `true` if the record's ID should be included in the
      JSON representation.

    @param {Object} options
    @returns {Object} an object whose values are primitive JSON values only
  */
  toJSON: function(options) {
    var store = get(this, 'store');
    return store.toJSON(this, options);
  },

  didLoad: Ember.K,
  didUpdate: Ember.K,
  didCreate: Ember.K,
  didDelete: Ember.K,
  becameInvalid: Ember.K,
  becameError: Ember.K,

  data: Ember.computed(function() {
    if (!this._data) {
      this.materializeData();
    }

    return this._data;
  }).property(),

  materializeData: function() {
    this.setupData();
    get(this, 'store').materializeData(this);

    this.suspendAssociationObservers(function() {
      this.notifyPropertyChange('data');
    });
  },

  _data: null,

  init: function() {
    var stateManager = DS.StateManager.create({ record: this });
    set(this, 'stateManager', stateManager);

    this.setup();

    stateManager.goToState('empty');
  },

  setup: function() {
    this._relationshipChanges = {};
    this._dirtyFactors = Ember.OrderedSet.create();
    this._inFlightDirtyFactors = Ember.OrderedSet.create();
    this._dirtyReasons = { hasMany: 0, belongsTo: 0, attribute: 0 };
  },

  willDestroy: function() {
    if (!get(this, 'isDeleted')) {
      this.deleteRecord();
    }
  },

  send: function(name, context) {
    return get(this, 'stateManager').send(name, context);
  },

  withTransaction: function(fn) {
    var transaction = get(this, 'transaction');
    if (transaction) { fn(transaction); }
  },

  loadingData: function() {
    this.send('loadingData');
  },

  loadedData: function() {
    this.send('loadedData');
  },

  didChangeData: function() {
    this.send('didChangeData');
  },

  setProperty: function(key, value) {
    this.send('setProperty', { key: key, value: value });
  },

  deleteRecord: function() {
    this.send('deleteRecord');
  },

  clearRelationships: function() {
    this.eachAssociation(function(name, relationship) {
      if (relationship.kind === 'belongsTo') {
        set(this, name, null);
      } else if (relationship.kind === 'hasMany') {
        get(this, name).clear();
      }
    }, this);
  },

  updateRecordArrays: function() {
    var store = get(this, 'store');
    if (store) {
      store.hashWasUpdated(this.constructor, get(this, 'clientId'), this);
    }
  },

  /**
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and associations into the existing
    saved data.
  */
  adapterDidCommit: function() {
    var attributes = get(this, 'data').attributes;

    get(this.constructor, 'attributes').forEach(function(name, meta) {
      attributes[name] = get(this, name);
    }, this);

    this.updateRecordArraysLater();
  },

  dataDidChange: Ember.observer(function() {
    var associations = get(this.constructor, 'associationsByName'),
        hasMany = get(this, 'data').hasMany, store = get(this, 'store'),
        idToClientId = store.idToClientId,
        cachedValue;

    this.updateRecordArraysLater();

    associations.forEach(function(name, association) {
      if (association.kind === 'hasMany') {
        cachedValue = this.cacheFor(name);

        if (cachedValue) {
          var key = name,
              ids = hasMany[key] || [];

          var clientIds;

          clientIds = Ember.EnumerableUtils.map(ids, function(id) {
            return store.clientIdForId(association.type, id);
          });

          set(cachedValue, 'content', Ember.A(clientIds));
        }
      }
    }, this);
  }, 'data'),

  updateRecordArraysLater: function() {
    Ember.run.once(this, this.updateRecordArrays);
  },

  setupData: function() {
    this._data = {
      attributes: {},
      belongsTo: {},
      hasMany: {},
      id: null
    };
  },

  materializeId: function(id) {
    set(this, 'id', id);
  },

  materializeAttributes: function(attributes) {
    Ember.assert("Must pass a hash of attributes to materializeAttributes", !!attributes);
    this._data.attributes = attributes;
  },

  materializeAttribute: function(name, value) {
    this._data.attributes[name] = value;
  },

  materializeHasMany: function(name, ids) {
    this._data.hasMany[name] = ids;
  },

  materializeBelongsTo: function(name, id) {
    this._data.belongsTo[name] = id;
  },

  // DIRTINESS FACTORS
  //
  // These methods allow the manipulation of various "dirtiness factors" on
  // the current record. A dirtiness factor can be:
  //
  // * the name of a dirty attribute
  // * the name of a dirty relationship
  // * @created, if the record was created
  // * @deleted, if the record was deleted
  //
  // This allows adapters to acknowledge updates to any of the dirtiness
  // factors one at a time, and keeps the bookkeeping for full acknowledgement
  // in the record itself.

  addDirtyFactor: function(name) {
    var dirtyFactors = this._dirtyFactors, becameDirty;
    if (dirtyFactors.has(name)) { return; }

    if (this._dirtyFactors.isEmpty()) { becameDirty = true; }

    this._addDirtyFactor(name);

    if (becameDirty && name !== '@created' && name !== '@deleted') {
      this.send('becameDirty');
    }
  },

  _addDirtyFactor: function(name) {
    this._dirtyFactors.add(name);

    var reason = get(this.constructor, 'fields').get(name);
    this._dirtyReasons[reason]++;
  },

  removeDirtyFactor: function(name) {
    var dirtyFactors = this._dirtyFactors, becameClean = true;
    if (!dirtyFactors.has(name)) { return; }

    this._dirtyFactors.remove(name);

    var reason = get(this.constructor, 'fields').get(name);
    this._dirtyReasons[reason]--;

    if (!this._dirtyFactors.isEmpty()) { becameClean = false; }

    if (becameClean && name !== '@created' && name !== '@deleted') {
      this.send('becameClean');
    }
  },

  removeDirtyFactors: function() {
    this._dirtyFactors.clear();
    this._dirtyReasons = { hasMany: 0, belongsTo: 0, attribute: 0 };
    this.send('becameClean');
  },

  rollback: function() {
    this.setup();
    this.send('becameClean');

    this.suspendAssociationObservers(function() {
      this.notifyPropertyChange('data');
    });
  },

  isDirtyBecause: function(reason) {
    return this._dirtyReasons[reason] > 0;
  },

  isCommittingBecause: function(reason) {
    return this._inFlightDirtyReasons[reason] > 0;
  },

  /**
    @private

    The goal of this method is to temporarily disable specific observers
    that take action in response to application changes.

    This allows the system to make changes (such as materialization and
    rollback) that should not trigger secondary behavior (such as setting an
    inverse relationship or marking records as dirty).

    The specific implementation will likely change as Ember proper provides
    better infrastructure for suspending groups of observers, and if Array
    observation becomes more unified with regular observers.
  */
  suspendAssociationObservers: function(callback, binding) {
    var observers = get(this.constructor, 'associationNames').belongsTo;
    var self = this;

    try {
      this._suspendedAssociations = true;
      Ember._suspendObservers(self, observers, null, 'belongsToDidChange', function() {
        Ember._suspendBeforeObservers(self, observers, null, 'belongsToWillChange', function() {
          callback.call(binding || self);
        });
      });
    } finally {
      this._suspendedAssociations = false;
    }
  },

  becameInFlight: function() {
    this._inFlightDirtyFactors = this._dirtyFactors.copy();
    this._inFlightDirtyReasons = this._dirtyReasons;
    this._dirtyFactors.clear();
    this._dirtyReasons = { hasMany: 0, belongsTo: 0, attribute: 0 };
  },

  restoreDirtyFactors: function() {
    this._inFlightDirtyFactors.forEach(function(factor) {
      this._addDirtyFactor(factor);
    }, this);

    this._inFlightDirtyFactors.clear();
    this._inFlightDirtyReasons = null;
  },

  removeInFlightDirtyFactor: function(name) {
    // It is possible for a record to have been materialized
    // or loaded after the transaction was committed. This
    // can happen with relationship changes involving
    // unmaterialized records that subsequently load.
    //
    // XXX If a record is materialized after it was involved
    // while it is involved in a relationship change, update
    // it to be in the same state as if it had already been
    // materialized.
    //
    // For now, this means that we have a blind spot where
    // a record was loaded and its relationships changed
    // while the adapter is in the middle of persisting
    // a relationship change involving it.
    if (this._inFlightDirtyFactors.has(name)) {
      this._inFlightDirtyFactors.remove(name);
      if (this._inFlightDirtyFactors.isEmpty()) {
        this._inFlightDirtyReasons = null;
        this.send('didCommit');
      }
    }
  },

  removeInFlightDirtyFactors: function() {
    if (!this._inFlightDirtyFactors.isEmpty()) {
      this._inFlightDirtyFactors.clear();
      this._inFlightDirtyReasons = null;
      this.send('didCommit');
    }
  },

  // FOR USE DURING COMMIT PROCESS

  adapterDidUpdateAttribute: function(attributeName, value) {
    this.removeInFlightDirtyFactor(attributeName);

    // If a value is passed in, update the internal attributes and clear
    // the attribute cache so it picks up the new value. Otherwise,
    // collapse the current value into the internal attributes because
    // the adapter has acknowledged it.
    if (value !== undefined) {
      get(this, 'data.attributes')[attributeName] = value;
      this.notifyPropertyChange(attributeName);
    } else {
      value = get(this, attributeName);
      get(this, 'data.attributes')[attributeName] = value;
    }

    this.updateRecordArraysLater();
  },

  adapterDidUpdateHasMany: function(name) {
    this.removeInFlightDirtyFactor(name);

    var cachedValue = this.cacheFor(name),
        hasMany = get(this, 'data').hasMany,
        store = get(this, 'store');

    var associations = get(this.constructor, 'associationsByName'),
        association = associations.get(name),
        idToClientId = store.idToClientId;

    if (cachedValue) {
      var key = name,
          ids = hasMany[key] || [];

      var clientIds;

      clientIds = Ember.EnumerableUtils.map(ids, function(id) {
        return store.clientIdForId(association.type, id);
      });

      set(cachedValue, 'content', Ember.A(clientIds));
      set(cachedValue, 'isLoaded', true);
    }

    this.updateRecordArraysLater();
  },

  adapterDidDelete: function() {
    this.removeInFlightDirtyFactor('@deleted');

    this.updateRecordArraysLater();
  },

  adapterDidCreate: function() {
    this.removeInFlightDirtyFactor('@created');

    this.updateRecordArraysLater();
  },

  adapterDidInvalidate: function(errors) {
    this.send('becameInvalid', errors);
  },

  /**
    @private

    Override the default event firing from Ember.Evented to
    also call methods with the given name.
  */
  trigger: function(name) {
    Ember.tryInvoke(this, name, [].slice.call(arguments, 1));
    this._super.apply(this, arguments);
  }
});

// Helper function to generate store aliases.
// This returns a function that invokes the named alias
// on the default store, but injects the class as the
// first parameter.
var storeAlias = function(methodName) {
  return function() {
    var store = get(DS, 'defaultStore'),
        args = [].slice.call(arguments);

    args.unshift(this);
    return store[methodName].apply(store, args);
  };
};

DS.Model.reopenClass({
  isLoaded: storeAlias('recordIsLoaded'),
  find: storeAlias('find'),
  all: storeAlias('all'),
  filter: storeAlias('filter'),

  _create: DS.Model.create,

  create: function() {
    throw new Ember.Error("You should not call `create` on a model. Instead, call `createRecord` with the attributes you would like to set.");
  },

  createRecord: storeAlias('createRecord')
});
