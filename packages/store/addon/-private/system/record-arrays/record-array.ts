/**
  @module @ember-data/store
*/
import type NativeArray from '@ember/array/-private/native-array';
import ArrayProxy from '@ember/array/proxy';
import { assert } from '@ember/debug';
import { computed, get, set } from '@ember/object';
import { tracked } from '@glimmer/tracking';

import { Promise } from 'rsvp';

import type { RecordArrayManager, Snapshot } from 'ember-data/-private';

import { ResolvedRegistry } from '@ember-data/types';
import { RecordInstance, RecordType } from '@ember-data/types/utils';

import type { StableRecordIdentifier } from '../../ts-interfaces/identifier';
import type { FindOptions } from '../../ts-interfaces/store';
import type { PromiseArray } from '../promise-proxies';
import { promiseArray } from '../promise-proxies';
import SnapshotRecordArray from '../snapshot-record-array';
import type Store from '../store';
import { internalModelFactoryFor } from '../store/internal-model-factory';

function recordForIdentifier<R extends ResolvedRegistry, T extends RecordType<R>>(
  store: Store<R>,
  identifier: StableRecordIdentifier<T>
): RecordInstance<R, T> {
  return internalModelFactoryFor(store).lookup(identifier).getRecord();
}

export interface RecordArrayCreateArgs {
  modelName: string;
  store: Store;
  manager: RecordArrayManager;
  content: NativeArray<StableRecordIdentifier>;
  isLoaded: boolean;
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
*/
export default class RecordArray<R extends ResolvedRegistry, T extends RecordType<R>> extends ArrayProxy<
  StableRecordIdentifier<T>,
  RecordInstance<R, T>
> {
  /**
    The array of client ids backing the record array. When a
    record is requested from the record array, the record
    for the client id at the same index is materialized, if
    necessary, by the store.

    @property content
    @private
    @type Ember.Array
  */
  declare content: NativeArray<StableRecordIdentifier<T>>;
  declare _getDeprecatedEventedInfo: () => string;
  declare modelName: T;
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
  declare isLoaded: boolean;
  /**
    The store that created this record array.

    @property store
    @private
    @type Store
    */
  declare store: Store<R>;
  declare _updatingPromise: PromiseArray<RecordInstance<R, T>, RecordArray<R, T>> | null;
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
  @tracked isUpdating: boolean = false;

  init(props?: RecordArrayCreateArgs) {
    assert(`Cannot initialize RecordArray with isUpdating`, !props || !('isUpdating' in props));
    assert(`Cannot initialize RecordArray with isUpdating`, !props || !('_updatingPromise' in props));
    super.init();

    // TODO can we get rid of this?
    this.set('content', this.content || null);
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
  objectAtContent(index: number): RecordInstance<R, T> | undefined {
    let identifier = get(this, 'content').objectAt(index);
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
  update(): PromiseArray<RecordInstance<R, T>, RecordArray<R, T>> {
    if (this.isUpdating) {
      return this._updatingPromise!;
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
  _update(): PromiseArray<RecordInstance<R, T>, RecordArray<R, T>> {
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
  save(): PromiseArray<RecordInstance<R, T>, RecordArray<R, T>> {
    let promiseLabel = `DS: RecordArray#save ${this.modelName}`;
    let promise = Promise.all(this.invoke('save'), promiseLabel).then(
      () => this,
      null,
      'DS: RecordArray#save return RecordArray'
    );

    return promiseArray<RecordInstance<R, T>, RecordArray<R, T>>(promise);
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
    set(this, 'content', null as unknown as NativeArray<StableRecordIdentifier<T>>);
    set(this, 'length', 0);
    super.willDestroy();
  }

  /**
    @method _createSnapshot
    @private
  */
  _createSnapshot(options: FindOptions): SnapshotRecordArray<R, T> {
    // this is private for users, but public for ember-data internals
    // meta will only be present for an AdapterPopulatedRecordArray
    return new SnapshotRecordArray(this, null, options);
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
  _pushIdentifiers(identifiers: StableRecordIdentifier<T>[]): void {
    this.content.pushObjects(identifiers);
  }

  /**
    Removes identifiers from the `RecordArray`.

    @method _removeIdentifiers
    @internal
    @param {StableRecordIdentifier[]} identifiers
  */
  _removeIdentifiers(identifiers: StableRecordIdentifier<T>[]): void {
    this.content.removeObjects(identifiers);
  }

  /**
    @method _takeSnapshot
    @internal
  */
  _takeSnapshot(): Snapshot<R, T>[] {
    return this.content.map((identifier) => internalModelFactoryFor(this.store).lookup(identifier).createSnapshot());
  }
}
