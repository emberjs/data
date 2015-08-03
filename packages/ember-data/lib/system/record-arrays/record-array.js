/**
  @module ember-data
*/

import { PromiseArray } from "ember-data/system/promise-proxies";
import SnapshotRecordArray from "ember-data/system/snapshot-record-array";
import FilteredSubset from "ember-data/system/record-arrays/filtered-subset";

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
    The flag to signal a `RecordArray` is finished loading data.

    Example

    ```javascript
    var people = store.peekAll('person');
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
    var people = store.peekAll('person');
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
    var internalModel = content.objectAt(index);
    return internalModel && internalModel.getRecord();
  },

  /**
    Get a filtered subset of the underlying `RecordArray`.
    The subset updates when a record would match or mismatch the
    specified filter parameters.

    Example

    ```javascript
    var allToms = store.all('person').filterBy('name', 'Tom');

    allToms.get('length'); // 0, since no toms yet in store

    var tom = store.push('person', { id: 1, name: 'Tom' });
    allToms.get('length'); // Tom is added

    tom.set('name', 'Thomas');
    allToms.get('length'); // 0, since no more records with name === 'Tom'
    ```

    @method filterBy
    @param {String} key property path
    @param {*} value optional

  */
  filterBy: function(key, value) {
    // only pass value to the arguments if it is present; this mimics the same
    // behavior for `filterBy`: http://git.io/vIurH
    var filterByArgs = [key];
    if (arguments.length === 2) {
      filterByArgs.push(value);
    }

    return FilteredSubset.create({
      filterByArgs,
      recordArray: this
    });
  },

  /**
    Used to get the latest version of all of the records in this array
    from the adapter.

    Example

    ```javascript
    var people = store.peekAll('person');
    people.get('isUpdating'); // false
    people.update();
    people.get('isUpdating'); // true
    ```

    @method update
  */
  update: function() {
    if (get(this, 'isUpdating')) { return; }

    var store = get(this, 'store');
    var modelName = get(this, 'type.modelName');

    return store.findAll(modelName, { reload: true });
  },

  /**
    Adds an internal model to the `RecordArray` without duplicates

    @method addInternalModel
    @private
    @param {InternalModel} internalModel
    @param {number} an optional index to insert at
  */
  addInternalModel: function(internalModel, idx) {
    var content = get(this, 'content');
    if (idx === undefined) {
      content.addObject(internalModel);
    } else if (!content.contains(internalModel)) {
      content.insertAt(idx, internalModel);
    }
  },

  /**
    Removes an internalModel to the `RecordArray`.

    @method removeInternalModel
    @private
    @param {InternalModel} internalModel
  */
  removeInternalModel: function(internalModel) {
    get(this, 'content').removeObject(internalModel);
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

    this.get('content').forEach(function(record) {
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
    manager.unregisterRecordArray(this);
  },

  willDestroy: function() {
    this._unregisterFromManager();
    this._dissociateFromOwnRecords();
    set(this, 'content', undefined);
    this._super.apply(this, arguments);
  },

  createSnapshot(options) {
    var adapterOptions = options && options.adapterOptions;
    var meta = this.get('meta');
    return new SnapshotRecordArray(this, meta, adapterOptions);
  }
});
