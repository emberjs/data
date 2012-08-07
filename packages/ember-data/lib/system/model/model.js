require("ember-data/system/model/states");

var get = Ember.get, set = Ember.set, none = Ember.none;

var retrieveFromCurrentState = Ember.computed(function(key) {
  return get(get(this, 'stateManager.currentState'), key);
}).property('stateManager.currentState').cacheable();

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
  }).property().cacheable(),

  materializeData: function() {
    this.setupData();
    get(this, 'store').materializeData(this);
    this.notifyPropertyChange('data');
  },

  _data: null,

  init: function() {
    var stateManager = DS.StateManager.create({ record: this });
    set(this, 'stateManager', stateManager);

    this._relationshipChanges = {};
    this._dirtyFactors = Ember.OrderedSet.create();

    stateManager.goToState('empty');
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
    var becameDirty;

    if (this._dirtyFactors.isEmpty()) { becameDirty = true; }
    this._dirtyFactors.add(name);

    if (becameDirty && name !== '@created' && name !== '@deleted') {
      this.send('becameDirty');
    }
  },

  removeDirtyFactor: function(name) {
    var becameClean = true;

    if (this._dirtyFactors.isEmpty()) { becameClean = false; }
    this._dirtyFactors.remove(name);
    if (!this._dirtyFactors.isEmpty()) { becameClean = false; }

    if (becameClean && name !== '@created' && name !== '@deleted') {
      this.send('becameClean');
    }
  },

  removeDirtyFactors: function() {
    this._dirtyFactors.clear();
    this.send('becameClean');
  },

  becameInFlight: function() {
    this._inFlightDirtyFactors = this._dirtyFactors.copy();
    this._dirtyFactors.clear();
  },

  restoreDirtyFactors: function() {
    this._inFlightDirtyFactors.forEach(function(factor) {
      this._dirtyFactors.add(factor);
    }, this);

    this._inFlightDirtyFactors.clear();
  },

  removeInFlightDirtyFactor: function(name) {
    if (this._inFlightDirtyFactors.has(name)) {
      this._inFlightDirtyFactors.remove(name);
      if (this._inFlightDirtyFactors.isEmpty()) { this.send('didCommit'); }
    }
  },

  removeInFlightDirtyFactors: function() {
    if (!this._inFlightDirtyFactors.isEmpty()) {
      this._inFlightDirtyFactors.clear();
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

  adapterDidUpdateRelationship: function(relationshipName) {
    var change = this._relationshipChanges[relationshipName];

    Ember.assert("You cannot update a relationship that was not changed", change);

    change.didUpdateRelationship(relationshipName, this);

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
  filter: storeAlias('filter'),

  _create: DS.Model.create,

  create: function() {
    throw new Ember.Error("You should not call `create` on a model. Instead, call `createRecord` with the attributes you would like to set.");
  },

  createRecord: storeAlias('createRecord')
});
