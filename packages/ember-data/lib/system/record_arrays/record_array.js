/**
  @module data
  @submodule data-record-array
*/

var get = Ember.get, set = Ember.set;

/**
  A record array is an array that contains records of a certain type. The record
  array materializes records as needed when they are retrieved for the first
  time. You should not create record arrays yourself. Instead, an instance of
  DS.RecordArray or its subclasses will be returned by your application's store
  in response to queries.

  @main data-record-array

  @class RecordArray
  @namespace DS
  @extends Ember.ArrayProxy
  @uses Ember.Evented
*/

DS.RecordArray = Ember.ArrayProxy.extend(Ember.Evented, {
  /**
    The model type contained by this record array.

    @type DS.Model
  */
  type: null,

  // The array of client ids backing the record array. When a
  // record is requested from the record array, the record
  // for the client id at the same index is materialized, if
  // necessary, by the store.
  content: null,

  isError: false,
  isLoaded: false,
  isUpdating: false,

  // The store that created this record array.
  store: null,

  init: function() {
    this._super();

    if (get(this, 'isLoaded')) {
      this.trigger('didLoad');
    }
  },

  objectAtContent: function(index) {
    var content = get(this, 'content'),
        reference = content.objectAt(index),
        store = get(this, 'store');

    if (reference) {
      return store.recordForReference(reference);
    }
  },

  addReference: function(reference) {
    get(this, 'content').addObject(reference);
  },

  removeReference: function(reference) {
    get(this, 'content').removeObject(reference);
  },

  update: function() {
    var store = get(this, 'store'),
        type = get(this, 'type');

    return store.fetchAll(type, this);
  },

  adapterDidError: function() {
    set(this, 'isError', true);
    set(this, 'isUpdating', false);
    this.trigger('becameError');
  }
});
