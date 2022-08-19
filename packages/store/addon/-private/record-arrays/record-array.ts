/**
  @module @ember-data/store
*/
import type NativeArray from '@ember/array/-private/native-array';
import ArrayProxy from '@ember/array/proxy';
import { assert, deprecate } from '@ember/debug';
import { set } from '@ember/object';
import { tracked } from '@glimmer/tracking';

import { Promise } from 'rsvp';

import type { RecordArrayManager, Snapshot } from 'ember-data/-private';

import { DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS } from '@ember-data/private-build-infra/deprecations';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';

import SnapshotRecordArray from '../network/snapshot-record-array';
import type { PromiseArray } from '../proxies/promise-proxies';
import { promiseArray } from '../proxies/promise-proxies';
import type Store from '../store-service';

function recordForIdentifier(store: Store, identifier: StableRecordIdentifier): RecordInstance {
  return store._instanceCache.getRecord(identifier);
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
export default class RecordArray extends ArrayProxy<StableRecordIdentifier, RecordInstance> {
  /**
    The array of client ids backing the record array. When a
    record is requested from the record array, the record
    for the client id at the same index is materialized, if
    necessary, by the store.

    @property content
    @private
    @type Ember.Array
  */
  declare content: NativeArray<StableRecordIdentifier>;
  declare _getDeprecatedEventedInfo: () => string;
  declare modelName: string;
  /**
    The flag to signal a `RecordArray` is finished loading data.

    Example

    ```javascript
    let people = store.peekAll('person');
    people.isLoaded; // true
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
  declare store: Store;
  declare _updatingPromise: PromiseArray<RecordInstance, RecordArray> | null;
  declare manager: RecordArrayManager;

  /**
    The flag to signal a `RecordArray` is currently loading data.
    Example
    ```javascript
    let people = store.peekAll('person');
    people.isUpdating; // false
    people.update();
    people.isUpdating; // true
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
    this.content = this.content || null;
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
    @deprecated
   @type {subclass of Model}
   */

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
    people.isUpdating; // false

    people.update().then(function() {
      people.isUpdating; // false
    });

    people.isUpdating; // true
    ```

    @method update
    @public
  */
  update(): PromiseArray<RecordInstance, RecordArray> {
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
  _update(): PromiseArray<RecordInstance, RecordArray> {
    return this.store.findAll(this.modelName, { reload: true });
  }

  /**
    Saves all of the records in the `RecordArray`.

    Example

    ```javascript
    let messages = store.peekAll('message');
    messages.forEach(function(message) {
      message.hasBeenSeen = true;
    });
    messages.save();
    ```

    @method save
    @public
    @return {PromiseArray} promise
  */
  save(): PromiseArray<RecordInstance, RecordArray> {
    let promiseLabel = `DS: RecordArray#save ${this.modelName}`;
    let promise = Promise.all(this.invoke('save'), promiseLabel).then(
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
    // TODO we have to use set here vs dot notation because computed properties don't clear
    // otherwise for destroyed records and will not update their value.
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

  _updateState(changes: Map<StableRecordIdentifier, 'add' | 'del'>) {
    const content = this.content;
    const adds: StableRecordIdentifier[] = [];
    const removes: StableRecordIdentifier[] = [];
    changes.forEach((value, key) => {
      value === 'add' ? adds.push(key) : removes.push(key);
    });
    if (removes.length) {
      if (removes.length === content.length) {
        content.clear();
      } else {
        content.removeObjects(removes);
      }
    }

    if (adds.length) {
      if (content.length === 0) {
        content.setObjects(adds);
      } else {
        content.addObjects(adds);
      }
    }
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
    @method _takeSnapshot
    @internal
  */
  _takeSnapshot(): Snapshot[] {
    return this.content.map((identifier) => this.store._instanceCache.createSnapshot(identifier));
  }
}

if (DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS) {
  Object.defineProperty(RecordArray.prototype, 'type', {
    get() {
      deprecate(
        `Using RecordArray.type to access the ModelClass for a record is deprecated. Use store.modelFor(<modelName>) instead.`,
        false,
        {
          id: 'ember-data:deprecate-snapshot-model-class-access',
          until: '5.0',
          for: 'ember-data',
          since: { available: '4.5.0', enabled: '4.5.0' },
        }
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!this.modelName) {
        return null;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      return this.store.modelFor(this.modelName);
    },
  });
}
