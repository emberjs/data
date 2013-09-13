/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;

/**
  A record array is an array that contains records of a certain type. The record
  array materializes records as needed when they are retrieved for the first
  time. You should not create record arrays yourself. Instead, an instance of
  DS.RecordArray or its subclasses will be returned by your application's store
  in response to queries.

  @class RecordArray
  @namespace DS
  @extends Ember.ArrayProxy
  @uses Ember.Evented
*/

DS.RecordArray = Ember.ArrayProxy.extend(Ember.Evented, {
  /**
    The model type contained by this record array.

    @property type
    @type DS.Model
  */
  type: null,

  // The array of client ids backing the record array. When a
  // record is requested from the record array, the record
  // for the client id at the same index is materialized, if
  // necessary, by the store.
  content: null,

  isLoaded: false,
  isUpdating: false,

  // The store that created this record array.
  store: null,

  objectAtContent: function(index) {
    var content = get(this, 'content');

    return content.objectAt(index);
  },

  update: function() {
    if (get(this, 'isUpdating')) { return; }

    var store = get(this, 'store'),
        type = get(this, 'type');

    store.fetchAll(type, this);
  },

  addRecord: function(record) {
    get(this, 'content').addObject(record);
  },

  removeRecord: function(record) {
    get(this, 'content').removeObject(record);
  },

  save: function() {
    var promise = Ember.RSVP.all(this.invoke("save")).then(function(array) {
      return Ember.A(array);
    });

    return DS.PromiseArray.create({ promise: promise });
  }
});
