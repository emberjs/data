/**
  @module ember-data
*/

import { PromiseArray } from "ember-data/system/promise-proxies";
var get = Ember.get;
var set = Ember.set;

/**
  A record array is an array that contains records of a certain type. The record
  array materializes records as needed when they are retrieved for the first
  time. You should not create record arrays yourself. Instead, an instance of
  `DS.RecordArray` or its subclasses will be returned by your application's store
  in response to queries.

  @class RecordArray
  @namespace DS
  @extends Ember.ArrayProxy
  @uses Ember.Evented
*/

export default Ember.ArrayProxy.extend(Ember.Evented, {
  /**
    The model type contained by this record array.

    @property type
    @type DS.Model
  */
  type: null,

  /**
    The array of client ids backing the record array. When a
    record is requested from the record array, the record
    for the client id at the same index is materialized, if
    necessary, by the store.

    @property content
    @private
    @type Ember.Array
  */
  content: null,

  /**
    The flag to signal a `RecordArray` is currently loading data.

    Example

    ```javascript
    var people = store.all('person');
    people.get('isLoaded'); // true
    ```

    @property isLoaded
    @type Boolean
  */
  isLoaded: false,
  /**
    The flag to signal a `RecordArray` is currently loading data.

    Example

    ```javascript
    var people = store.all('person');
    people.get('isUpdating'); // false
    people.update();
    people.get('isUpdating'); // true
    ```

    @property isUpdating
    @type Boolean
  */
  isUpdating: false,

  /**
    The store that created this record array.

    @property store
    @private
    @type DS.Store
  */
  store: null,

  /**
    Retrieves an object from the content by index.

    @method objectAtContent
    @private
    @param {Number} index
    @return {DS.Model} record
  */
  objectAtContent: function(index) {
    var content = get(this, 'content');

    return content.objectAt(index);
  },

  /**
    Used to get the latest version of all of the records in this array
    from the adapter.

    Example

    ```javascript
    var people = store.all('person');
    people.get('isUpdating'); // false
    people.update();
    people.get('isUpdating'); // true
    ```

    @method update
  */
  update: function() {
    if (get(this, 'isUpdating')) { return; }

    var store = get(this, 'store');
    var type = get(this, 'type');

    return store.fetchAll(type, this);
  },

  /**
    Adds a record to the `RecordArray` without duplicates

    @method addRecord
    @private
    @param {DS.Model} record
    @param {DS.Model} an optional index to insert at
  */
  addRecord: function(record, idx) {
    var content = get(this, 'content');
    if (idx === undefined) {
      content.addObject(record);
    } else if (!content.contains(record)) {
      content.insertAt(idx, record);
    }
  },

  _pushRecord: function(record) {
    get(this, 'content').pushObject(record);
  },

  /**
    Adds a record to the `RecordArray`, but allows duplicates

    @deprecated
    @method pushRecord
    @private
    @param {DS.Model} record
  */
  pushRecord: function(record) {
    Ember.deprecate('Usage of `recordArray.pushRecord` is deprecated, use `recordArray.addObject` instead');
    this._pushRecord(record);
  },
  /**
    Removes a record to the `RecordArray`.

    @method removeRecord
    @private
    @param {DS.Model} record
  */
  removeRecord: function(record) {
    get(this, 'content').removeObject(record);
  },

  /**
    Saves all of the records in the `RecordArray`.

    Example

    ```javascript
    var messages = store.all('message');
    messages.forEach(function(message) {
      message.set('hasBeenSeen', true);
    });
    messages.save();
    ```

    @method save
    @return {DS.PromiseArray} promise
  */
  save: function() {
    var recordArray = this;
    var promiseLabel = "DS: RecordArray#save " + get(this, 'type');
    var promise = Ember.RSVP.all(this.invoke("save"), promiseLabel).then(function(array) {
      return recordArray;
    }, null, "DS: RecordArray#save return RecordArray");

    return PromiseArray.create({ promise: promise });
  },

  _dissociateFromOwnRecords: function() {
    var array = this;

    this.forEach(function(record) {
      var recordArrays = record._recordArrays;

      if (recordArrays) {
        recordArrays.delete(array);
      }
    });
  },

  /**
    @method _unregisterFromManager
    @private
  */
  _unregisterFromManager: function() {
    var manager = get(this, 'manager');
    //We will stop needing this stupid if statement soon, once manyArray are refactored to not be RecordArrays
    if (manager) {
      manager.unregisterFilteredRecordArray(this);
    }
  },

  willDestroy: function() {
    this._unregisterFromManager();
    this._dissociateFromOwnRecords();
    set(this, 'content', undefined);
    this._super.apply(this, arguments);
  }
});
