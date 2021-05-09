/**
  @module @ember-data/store
*/
import ArrayProxy from '@ember/array/proxy';
import { computed, get, set } from '@ember/object';
import { DEBUG } from '@glimmer/env';

import { Promise } from 'rsvp';

import DeprecatedEvented from '../deprecated-evented';
import { PromiseArray } from '../promise-proxies';
import SnapshotRecordArray from '../snapshot-record-array';
import { internalModelFactoryFor } from '../store/internal-model-factory';

function recordForIdentifier(store, identifier) {
  return internalModelFactoryFor(store).lookup(identifier).getRecord();
}

/**
  A record array is an array that contains records of a certain modelName. The record
  array materializes records as needed when they are retrieved for the first
  time. You should not create record arrays yourself. Instead, an instance of
  `RecordArray` or its subclasses will be returned by your application's store
  in response to queries.

  This class should not be imported and instantiated by consuming applications.

  @class RecordArray
  @public
  @extends Ember.ArrayProxy
  @uses Ember.Evented
*/

let RecordArray = ArrayProxy.extend(DeprecatedEvented, {
  init(args) {
    this._super(args);

    if (DEBUG) {
      this._getDeprecatedEventedInfo = () => `RecordArray containing ${this.modelName}`;
    }

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
    let people = store.peekAll('person');
    people.get('isLoaded'); // true
    ```

    @property isLoaded
    @public
    @type Boolean
    */
    this.isLoaded = this.isLoaded || false;
    /**
    The flag to signal a `RecordArray` is currently loading data.

    Example

    ```javascript
    let people = store.peekAll('person');
    people.get('isUpdating'); // false
    people.update();
    people.get('isUpdating'); // true
    ```

    @property isUpdating
    @public
    @type Boolean
    */
    this.isUpdating = false;

    /**
    The store that created this record array.

    @property store
    @private
    @type Store
    */
    this.store = this.store || null;
    this._updatingPromise = null;
  },

  replace() {
    throw new Error(
      `The result of a server query (for all ${this.modelName} types) is immutable. To modify contents, use toArray()`
    );
  },

  /**
   The modelClass represented by this record array.

   @property type
    @public
   @type {subclass of Model}
   */
  type: computed('modelName', function () {
    if (!this.modelName) {
      return null;
    }
    return this.store.modelFor(this.modelName);
  }).readOnly(),

  /**
    Retrieves an object from the content by index.

    @method objectAtContent
    @private
    @param {Number} index
    @return {Model} record
  */
  objectAtContent(index) {
    let identifier = get(this, 'content').objectAt(index);
    return identifier ? recordForIdentifier(this.store, identifier) : undefined;
  },

  /**
    Used to get the latest version of all of the records in this array
    from the adapter.

    Example

    ```javascript
    let people = store.peekAll('person');
    people.get('isUpdating'); // false

    people.update().then(function() {
      people.get('isUpdating'); // false
    });

    people.get('isUpdating'); // true
    ```

    @method update
    @public
  */
  update() {
    if (get(this, 'isUpdating')) {
      return this._updatingPromise;
    }

    this.set('isUpdating', true);

    let updatingPromise = this._update().finally(() => {
      this._updatingPromise = null;
      if (this.get('isDestroying') || this.get('isDestroyed')) {
        return;
      }
      this.set('isUpdating', false);
    });

    this._updatingPromise = updatingPromise;

    return updatingPromise;
  },

  /*
    Update this RecordArray and return a promise which resolves once the update
    is finished.
   */
  _update() {
    return this.store.findAll(this.modelName, { reload: true });
  },

  /**
    Saves all of the records in the `RecordArray`.

    Example

    ```javascript
    let messages = store.peekAll('message');
    messages.forEach(function(message) {
      message.set('hasBeenSeen', true);
    });
    messages.save();
    ```

    @method save
    @public
    @return {PromiseArray} promise
  */
  save() {
    let promiseLabel = `DS: RecordArray#save ${this.modelName}`;
    let promise = Promise.all(this.invoke('save'), promiseLabel).then(
      () => this,
      null,
      'DS: RecordArray#save return RecordArray'
    );

    return PromiseArray.create({ promise });
  },

  /**
    @method _unregisterFromManager
    @internal
  */
  _unregisterFromManager() {
    this.manager.unregisterRecordArray(this);
  },

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
    set(this, 'length', 0);
    this._super(...arguments);
  },

  /**
    @method _createSnapshot
    @private
  */
  _createSnapshot(options) {
    // this is private for users, but public for ember-data internals
    return new SnapshotRecordArray(this, this.get('meta'), options);
  },

  /**
    @method _dissociateFromOwnRecords
    @internal
  */
  _dissociateFromOwnRecords() {
    this.get('content').forEach((identifier) => {
      let recordArrays = this.manager.getRecordArraysForIdentifier(identifier);

      if (recordArrays) {
        recordArrays.delete(this);
      }
    });
  },

  /**
    Adds identifiers to the `RecordArray` without duplicates

    @method _pushIdentifiers
    @internal
    @param {StableRecordIdentifier[]} identifiers
  */
  _pushIdentifiers(identifiers) {
    get(this, 'content').pushObjects(identifiers);
  },

  /**
    Removes identifiers from the `RecordArray`.

    @method _removeIdentifiers
    @internal
    @param {StableRecordIdentifier[]} identifiers
  */
  _removeIdentifiers(identifiers) {
    get(this, 'content').removeObjects(identifiers);
  },

  /**
    @method _takeSnapshot
    @internal
  */
  _takeSnapshot() {
    return get(this, 'content').map((identifier) =>
      internalModelFactoryFor(this.store).lookup(identifier).createSnapshot()
    );
  },
});

export default RecordArray;
