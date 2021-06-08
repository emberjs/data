/**
  @module @ember-data/store
*/
import ArrayProxy from '@ember/array/proxy';
import { computed, set } from '@ember/object';
import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';

import { Promise } from 'rsvp';

import DeprecatedEvented from '../deprecated-evented';
import { promiseArray } from '../promise-proxies';
import SnapshotRecordArray from '../snapshot-record-array';
import { internalModelFactoryFor } from '../store/internal-model-factory';

type Snapshot = import('ember-data/-private').Snapshot;
type EmberObject = import('@ember/object').default;
type PromiseArray<K, V> = import('../promise-proxies').PromiseArray<K, V>;
type FindOptions = import('../../ts-interfaces/store').FindOptions;
type RecordArrayManager = import('ember-data/-private').RecordArrayManager;
type CoreStore = import('../core-store').default;
type StableRecordIdentifier = import('../../ts-interfaces/identifier').StableRecordIdentifier;
type NativeArray<T> = import('@ember/array/-private/native-array').default<T>;
type Evented = import('@ember/object/evented').default;
type RecordInstance = import('../../ts-interfaces/record-instance').RecordInstance;
type DSModel = import('../../ts-interfaces/ds-model').DSModel;

function recordForIdentifier(store: CoreStore, identifier: StableRecordIdentifier): RecordInstance {
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

interface ArrayProxyWithDeprecatedEvented<T, M = T> extends Evented, EmberObject, ArrayProxy<T, M> {
  _has(...args: Parameters<Evented['has']>): ReturnType<Evented['has']>;
}

const ArrayProxyWithDeprecatedEvented = ArrayProxy.extend(DeprecatedEvented) as unknown as new <
  T,
  M = T
>() => ArrayProxyWithDeprecatedEvented<T, M>;

export interface RecordArrayCreateArgs {
  modelName: string;
  store: CoreStore;
  manager: RecordArrayManager;
  content: NativeArray<StableRecordIdentifier>;
  isLoaded: boolean;
}
export interface RecordArrayCreator {
  create(args: RecordArrayCreateArgs): RecordArray;
}

class RecordArray extends ArrayProxyWithDeprecatedEvented<StableRecordIdentifier, RecordInstance> {
  declare content: NativeArray<StableRecordIdentifier>;
  declare _getDeprecatedEventedInfo: () => string;
  declare modelName: string;
  declare isLoaded: boolean;
  declare store: CoreStore;
  declare _updatingPromise: PromiseArray<RecordInstance, RecordArray> | null;
  declare manager: RecordArrayManager;

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
  @tracked
  isUpdating: boolean = false;

  init() {
    super.init();

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
    The store that created this record array.

    @property store
    @private
    @type Store
    */
    this.store = this.store || null;
    this._updatingPromise = null;
  }

  replace() {
    throw new Error(
      `The result of a server query (for all ${this.modelName} types) is immutable. To modify contents, use toArray()`
    );
  }

  /**
   The modelClass represented by this record array.

   @property type
    @public
   @type {subclass of Model}
   */
  @computed('modelName')
  get type() {
    if (!this.modelName) {
      return null;
    }
    return this.store.modelFor(this.modelName);
  }

  /**
    Retrieves an object from the content by index.

    @method objectAtContent
    @private
    @param {Number} index
    @return {Model} record
  */
  objectAtContent(index: number): RecordInstance | undefined {
    let identifier = this.content.objectAt(index);
    return identifier ? recordForIdentifier(this.store, identifier) : undefined;
  }

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
  update(): PromiseArray<RecordInstance, RecordArray> {
    if (this.isUpdating) {
      return this._updatingPromise as PromiseArray<RecordInstance, RecordArray>;
    }

    this.isUpdating = true;

    let updatingPromise = this._update();
    updatingPromise.finally(() => {
      this._updatingPromise = null;
      if (this.isDestroying || this.isDestroyed) {
        return;
      }
      this.isUpdating = false;
    });

    this._updatingPromise = updatingPromise;

    return updatingPromise;
  }

  /*
    Update this RecordArray and return a promise which resolves once the update
    is finished.
   */
  _update(): PromiseArray<RecordInstance, RecordArray> {
    return this.store.findAll(this.modelName, { reload: true });
  }

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
  save(): PromiseArray<RecordInstance, RecordArray> {
    let promiseLabel = `DS: RecordArray#save ${this.modelName}`;
    let promise = Promise.all(this.invoke<DSModel>('save'), promiseLabel).then(
      () => this,
      null,
      'DS: RecordArray#save return RecordArray'
    );

    return promiseArray<RecordInstance, RecordArray>(promise);
  }

  /**
    @method _unregisterFromManager
    @internal
  */
  _unregisterFromManager() {
    this.manager.unregisterRecordArray(this);
  }

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
    set(this, 'content', null as unknown as NativeArray<StableRecordIdentifier>);
    set(this, 'length', 0);
    super.willDestroy();
  }

  /**
    @method _createSnapshot
    @private
  */
  _createSnapshot(options: FindOptions) {
    // this is private for users, but public for ember-data internals
    // meta will only be present for an AdapterPopulatedRecordArray
    return new SnapshotRecordArray(this, undefined, options);
  }

  /**
    @method _dissociateFromOwnRecords
    @internal
  */
  _dissociateFromOwnRecords() {
    this.content.forEach((identifier) => {
      let recordArrays = this.manager.getRecordArraysForIdentifier(identifier);

      if (recordArrays) {
        recordArrays.delete(this);
      }
    });
  }

  /**
    Adds identifiers to the `RecordArray` without duplicates

    @method _pushIdentifiers
    @internal
    @param {StableRecordIdentifier[]} identifiers
  */
  _pushIdentifiers(identifiers: StableRecordIdentifier[]): void {
    this.content.pushObjects(identifiers);
  }

  /**
    Removes identifiers from the `RecordArray`.

    @method _removeIdentifiers
    @internal
    @param {StableRecordIdentifier[]} identifiers
  */
  _removeIdentifiers(identifiers: StableRecordIdentifier[]): void {
    this.content.removeObjects(identifiers);
  }

  /**
    @method _takeSnapshot
    @internal
  */
  _takeSnapshot(): Snapshot[] {
    return this.content.map((identifier) => internalModelFactoryFor(this.store).lookup(identifier).createSnapshot());
  }
}

export default RecordArray;
