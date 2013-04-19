require("ember-data/system/model/states");
require("ember-data/system/mixins/load_promise");

var LoadPromise = DS.LoadPromise; // system/mixins/load_promise

var get = Ember.get, set = Ember.set, map = Ember.EnumerableUtils.map;

var retrieveFromCurrentState = Ember.computed(function(key, value) {
  return get(get(this, 'stateManager.currentState'), key);
}).property('stateManager.currentState').readOnly();

/**
  
  The model class that all Ember Data records descend from.

  @module data
  @submodule data-model
  @main data-model

  @class Model
  @namespace DS
  @extends Ember.Object
  @constructor
*/
DS.Model = Ember.Object.extend(Ember.Evented, LoadPromise, {
  isLoading: retrieveFromCurrentState,
  isLoaded: retrieveFromCurrentState,
  isReloading: retrieveFromCurrentState,
  isDirty: retrieveFromCurrentState,
  isSaving: retrieveFromCurrentState,
  isDeleted: retrieveFromCurrentState,
  isError: retrieveFromCurrentState,
  isNew: retrieveFromCurrentState,
  isValid: retrieveFromCurrentState,
  dirtyType: retrieveFromCurrentState,

  clientId: null,
  id: null,
  transaction: null,
  stateManager: null,
  errors: null,

  /**
    Create a JSON representation of the record, using the serialization
    strategy of the store's adapter.

    @method serialize
    @param {Object} options Available options:

    * `includeId`: `true` if the record's ID should be included in the
      JSON representation.

    @returns {Object} an object whose values are primitive JSON values only
  */
  serialize: function(options) {
    var store = get(this, 'store');
    return store.serialize(this, options);
  },

  /**
    Use {{#crossLink "DS.JSONSerializer"}}DS.JSONSerializer{{/crossLink}} to
    get the JSON representation of a record.

    @method toJSON
    @param {Object} options Available options:

    * `includeId`: `true` if the record's ID should be included in the
      JSON representation.

    @returns {Object} A JSON representation of the object.
  */
  toJSON: function(options) {
    var serializer = DS.JSONSerializer.create();
    return serializer.serialize(this, options);
  },

  /**
    Fired when the record is loaded from the server.

    @event didLoad
  */
  didLoad: Ember.K,

  /**
    Fired when the record is reloaded from the server.

    @event didReload
  */
  didReload: Ember.K,

  /**
    Fired when the record is updated.

    @event didUpdate
  */
  didUpdate: Ember.K,

  /**
    Fired when the record is created.

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

  data: Ember.computed(function() {
    if (!this._data) {
      this.materializeData();
    }

    return this._data;
  }).property(),

  materializeData: function() {
    this.send('materializingData');

    get(this, 'store').materializeData(this);

    this.suspendRelationshipObservers(function() {
      this.notifyPropertyChange('data');
    });
  },

  _data: null,

  init: function() {
    this._super();

    var stateManager = DS.StateManager.create({ record: this });
    set(this, 'stateManager', stateManager);

    this._setup();

    stateManager.goToState('empty');
  },

  _setup: function() {
    this._relationshipChanges = {};
    this._changesToSync = {};
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

  /**
    Reload the record from the adapter.

    This will only work if the record has already finished loading
    and has not yet been modified (`isLoaded` but not `isDirty`,
    or `isSaving`).

    @method reload
  */
  reload: function() {
    this.send('reloadRecord');
  },

  deleteRecord: function() {
    this.send('deleteRecord');
  },

  unloadRecord: function() {
    Ember.assert("You can only unload a loaded, non-dirty record.", !get(this, 'isDirty'));

    this.send('unloadRecord');
  },

  clearRelationships: function() {
    this.eachRelationship(function(name, relationship) {
      if (relationship.kind === 'belongsTo') {
        set(this, name, null);
      } else if (relationship.kind === 'hasMany') {
        this.clearHasMany(relationship);
      }
    }, this);
  },

  updateRecordArrays: function() {
    var store = get(this, 'store');
    if (store) {
      store.dataWasUpdated(this.constructor, get(this, 'reference'), this);
    }
  },

  /**
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.
  */
  adapterDidCommit: function() {
    var attributes = get(this, 'data').attributes;

    get(this.constructor, 'attributes').forEach(function(name, meta) {
      attributes[name] = get(this, name);
    }, this);

    this.send('didCommit');
    this.updateRecordArraysLater();
  },

  adapterDidDirty: function() {
    this.send('becomeDirty');
    this.updateRecordArraysLater();
  },

  dataDidChange: Ember.observer(function() {
    this.reloadHasManys();
    this.send('finishedMaterializing');
  }, 'data'),

  reloadHasManys: function() {
    var relationships = get(this.constructor, 'relationshipsByName');
    this.updateRecordArraysLater();
    relationships.forEach(function(name, relationship) {
      if (relationship.kind === 'hasMany') {
        this.hasManyDidChange(relationship.key);
      }
    }, this);
  },

  hasManyDidChange: function(key) {
    var cachedValue = this.cacheFor(key);

    if (cachedValue) {
      var type = get(this.constructor, 'relationshipsByName').get(key).type;
      var store = get(this, 'store');
      var ids = this._data.hasMany[key] || [];

      var references = map(ids, function(id) {
        if (typeof id === 'object') {
          if( id.clientId ) {
            // if it was already a reference, return the reference
            return id;
          } else {
            // <id, type> tuple for a polymorphic association.
            return store.referenceForId(id.type, id.id);
          }
        }
        return store.referenceForId(type, id);
      });

      set(cachedValue, 'content', Ember.A(references));
    }
  },

  updateRecordArraysLater: function() {
    Ember.run.once(this, this.updateRecordArrays);
  },

  setupData: function(prematerialized) {
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

  materializeHasMany: function(name, tuplesOrReferencesOrOpaque) {
    var tuplesOrReferencesOrOpaqueType = typeof tuplesOrReferencesOrOpaque;
    if (tuplesOrReferencesOrOpaque && tuplesOrReferencesOrOpaqueType !== 'string' && tuplesOrReferencesOrOpaque.length > 1) { Ember.assert('materializeHasMany expects tuples, references or opaque token, not ' + tuplesOrReferencesOrOpaque[0], tuplesOrReferencesOrOpaque[0].hasOwnProperty('id') && tuplesOrReferencesOrOpaque[0].type); }
    if( tuplesOrReferencesOrOpaqueType === "string" ) {
      this._data.hasMany[name] = tuplesOrReferencesOrOpaque;
    } else {
      var references = tuplesOrReferencesOrOpaque;

      if (tuplesOrReferencesOrOpaque && Ember.isArray(tuplesOrReferencesOrOpaque)) {
        references = this._convertTuplesToReferences(tuplesOrReferencesOrOpaque);
      }

      this._data.hasMany[name] = references;
    }
  },

  materializeBelongsTo: function(name, tupleOrReference) {
    if (tupleOrReference) { Ember.assert('materializeBelongsTo expects a tuple or a reference, not a ' + tupleOrReference, !tupleOrReference || (tupleOrReference.hasOwnProperty('id') && tupleOrReference.hasOwnProperty('type'))); }

    this._data.belongsTo[name] = tupleOrReference;
  },

  _convertTuplesToReferences: function(tuplesOrReferences) {
    return map(tuplesOrReferences, function(tupleOrReference) {
      return this._convertTupleToReference(tupleOrReference);
    }, this);
  },

  _convertTupleToReference: function(tupleOrReference) {
    var store = get(this, 'store');
    if(tupleOrReference.clientId) {
      return tupleOrReference;
    } else {
      return store.referenceForId(tupleOrReference.type, tupleOrReference.id);
    }
  },

  rollback: function() {
    this._setup();
    this.send('becameClean');

    this.suspendRelationshipObservers(function() {
      this.notifyPropertyChange('data');
    });
  },

  toStringExtension: function() {
    return get(this, 'id');
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
  suspendRelationshipObservers: function(callback, binding) {
    var observers = get(this.constructor, 'relationshipNames').belongsTo;
    var self = this;

    try {
      this._suspendedRelationships = true;
      Ember._suspendObservers(self, observers, null, 'belongsToDidChange', function() {
        Ember._suspendBeforeObservers(self, observers, null, 'belongsToWillChange', function() {
          callback.call(binding || self);
        });
      });
    } finally {
      this._suspendedRelationships = false;
    }
  },

  becameInFlight: function() {
  },

  // FOR USE BY THE BASIC ADAPTER

  save: function() {
    this.get('store').scheduleSave(this);

    var promise = new Ember.RSVP.Promise();

    this.one('didCommit', this, function() {
      promise.resolve(this);
    });

    return promise;
  },

  // FOR USE DURING COMMIT PROCESS

  adapterDidUpdateAttribute: function(attributeName, value) {

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

  adapterDidInvalidate: function(errors) {
    this.send('becameInvalid', errors);
  },

  adapterDidError: function() {
    this.send('becameError');
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
    Ember.assert("Your application does not have a 'Store' property defined. Attempts to call '" + methodName + "' on model classes will fail. Please provide one as with 'YourAppName.Store = DS.Store.extend()'", !!store);
    return store[methodName].apply(store, args);
  };
};

DS.Model.reopenClass({
  isLoaded: storeAlias('recordIsLoaded'),

  /**
    See {{#crossLink "DS.Store/find:method"}}`DS.Store.find()`{{/crossLink}}.

    @method find
    @param {Object|String|Array|null} query A query to find records by.

  */
  find: storeAlias('find'),

  /**
    See {{#crossLink "DS.Store/all:method"}}`DS.Store.all()`{{/crossLink}}.

    @method all
    @return {DS.RecordArray}
  */
  all: storeAlias('all'),

  /**
    See {{#crossLink "DS.Store/findQuery:method"}}`DS.Store.findQuery()`{{/crossLink}}.

    @method query
    @param {Object} query an opaque query to be used by the adapter
    @return {DS.AdapterPopulatedRecordArray}
  */
  query: storeAlias('findQuery'),

  /**
    See {{#crossLink "DS.Store/filter:method"}}`DS.Store.filter()`{{/crossLink}}.

    @method filter
    @param {Function} filter
    @return {DS.FilteredRecordArray}
  */
  filter: storeAlias('filter'),

  _create: DS.Model.create,

  create: function() {
    throw new Ember.Error("You should not call `create` on a model. Instead, call `createRecord` with the attributes you would like to set.");
  },

  /**
    See {{#crossLink "DS.Store/createRecord:method"}}`DS.Store.createRecord()`{{/crossLink}}.

    @method createRecord
    @param {Object} properties a hash of properties to set on the
      newly created record.
    @returns DS.Model
  */
  createRecord: storeAlias('createRecord')
});
