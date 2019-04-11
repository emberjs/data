/**
  @module ember-data
*/
import { set } from '@ember/object';
import { Promise } from 'rsvp';
import { PromiseArray } from '../promise-proxies';
import SnapshotRecordArray from '../snapshot-record-array';
import ArrayProxy from './array-proxy';

/**
  A record array is an array that contains records of a certain modelName. The record
  array materializes records as needed when they are retrieved for the first
  time. You should not create record arrays yourself. Instead, an instance of
  `DS.RecordArray` or its subclasses will be returned by your application's store
  in response to queries.

  @class RecordArray
  @namespace DS
  @extends MutableArray
*/
export default class RecordArray extends ArrayProxy {
  constructor(options) {
    super(options);

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
  }

  get length() {
    return this.content ? this.content.length : 0;
  }

  objectAt(index) {
    let internalModel = super.objectAt(index);
    let v = internalModel && internalModel.getRecord();

    return v;
  }

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
    if (this.isUpdating) {
      return this._updatingPromise;
    }

    this.set('isUpdating', true);

    let updatingPromise = this._update().finally(() => {
      this._updatingPromise = null;
      if (this.isDestroying || this.isDestroyed) {
        return;
      }
      this.set('isUpdating', false);
    });

    this._updatingPromise = updatingPromise;

    return updatingPromise;
  }

  /*
    Update this RecordArray and return a promise which resolves the update
    is finished.
   */
  _update() {
    return this.store.findAll(this.modelName, { reload: true });
  }

  /**
    Adds an internal model to the `RecordArray` without duplicates

    @method _pushInternalModels
    @private
    @param {InternalModel} internalModel
  */
  _pushInternalModels(internalModels) {
    this._pushObjects(internalModels);
  }

  /**
    Removes an internalModel to the `RecordArray`.

    @method removeInternalModel
    @private
    @param {InternalModel} internalModel
  */
  _removeInternalModels(internalModels) {
    this._removeObjects(internalModels);
  }

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
    let promise = Promise.all(this.invoke('save'), promiseLabel).then(
      () => this,
      null,
      'DS: RecordArray#save return RecordArray'
    );

    return PromiseArray.create({ promise });
  }

  _dissociateFromOwnRecords() {
    this.content.forEach(internalModel => {
      let recordArrays = internalModel.__recordArrays;

      if (recordArrays) {
        recordArrays.delete(this);
      }
    });
  }

  /**
    @method _unregisterFromManager
    @private
  */
  _unregisterFromManager() {
    this.manager.unregisterRecordArray(this);
  }

  // move to destroy when we kill MutableArray
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
    set(this, 'content', null);
  }

  /*
    @method _createSnapshot
    @private
  */
  _createSnapshot(options) {
    // this is private for users, but public for ember-data internals
    return new SnapshotRecordArray(this, this.meta, options);
  }

  /*
    @method _takeSnapshot
    @private
  */
  _takeSnapshot() {
    return this.content.map(internalModel => internalModel.createSnapshot());
  }

  replace() {
    throw new Error(
      `The result of a server query (for all ${
        this.modelName
      } types) is immutable. To modify contents, use toArray()`
    );
  }
}
