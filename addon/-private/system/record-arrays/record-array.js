/**
  @module ember-data
*/

import Ember from 'ember';
import { PromiseArray } from "ember-data/-private/system/promise-proxies";
import SnapshotRecordArray from "ember-data/-private/system/snapshot-record-array";

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

  replace() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a server query (for all " + type + " types) is immutable. To modify contents, use toArray()");
  },

  /**
    Retrieves an object from the content by index.

    @method objectAtContent
    @private
    @param {Number} index
    @return {DS.Model} record
  */
  objectAtContent(index) {
    var content = get(this, 'content');
    var internalModel = content.objectAt(index);
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
    if (get(this, 'isUpdating')) { return; }

    this.set('isUpdating', true);
    return this._update();
  },

  /*
    Update this RecordArray and return a promise which resolves once the update
    is finished.
   */
  _update() {
    let store = get(this, 'store');
    let modelName = get(this, 'type.modelName');

    return store.findAll(modelName, { reload: true });
  },

  /**
    Adds an internal model to the `RecordArray` without duplicates

    @method addInternalModel
    @private
    @param {InternalModel} internalModel
    @param {number} an optional index to insert at
  */
  addInternalModel(internalModel, idx) {
    var content = get(this, 'content');
    if (idx === undefined) {
      content.addObject(internalModel);
    } else if (!content.includes(internalModel)) {
      content.insertAt(idx, internalModel);
    }
  },

  /**
    Removes an internalModel to the `RecordArray`.

    @method removeInternalModel
    @private
    @param {InternalModel} internalModel
  */
  removeInternalModel(internalModel) {
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
  save() {
    var recordArray = this;
    var promiseLabel = "DS: RecordArray#save " + get(this, 'type');
    var promise = Ember.RSVP.all(this.invoke("save"), promiseLabel).then(function(array) {
      return recordArray;
    }, null, "DS: RecordArray#save return RecordArray");

    return PromiseArray.create({ promise: promise });
  },

  _dissociateFromOwnRecords() {
    this.get('content').forEach((record) => {
      var recordArrays = record._recordArrays;

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
    var manager = get(this, 'manager');
    manager.unregisterRecordArray(this);
  },

  willDestroy() {
    this._unregisterFromManager();
    this._dissociateFromOwnRecords();
    set(this, 'content', undefined);
    set(this, 'length', 0);
    this._super.apply(this, arguments);
  },

  createSnapshot(options) {
    const meta = this.get('meta');
    return new SnapshotRecordArray(this, meta, options);
  }
});
