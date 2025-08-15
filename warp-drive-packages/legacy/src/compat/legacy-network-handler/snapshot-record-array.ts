import type { Store } from '@warp-drive/core';
import { Context } from '@warp-drive/core/reactive/-private';
import type { LegacyLiveArray, PrivateReactiveResourceArray } from '@warp-drive/core/store/-private';
import type { FindAllOptions, ModelSchema } from '@warp-drive/core/types';
import type { ResourceKey } from '@warp-drive/core/types/identifier';

import { upgradeStore } from '../-private.ts';
import type { Snapshot } from './snapshot.ts';
/**
  SnapshotRecordArray is not directly instantiable.
  Instances are provided to consuming application's
  adapters for certain `findAll` requests.

  @hideconstructor
  @public
*/
export class SnapshotRecordArray {
  /**
   * An array of snapshots
   *
   * @internal
   */
  declare private _snapshots: Snapshot[] | null;

  /** @internal */
  declare private _type: ModelSchema | null;

  /**
   * The ResourceType of the underlying records for the {@link Snapshot | Snapshots} in the array
   */
  declare modelName: string;

  /** @internal */
  declare private __store: Store;

  /**
   *  A hash of adapter options passed into the store method for this request.

      Example

      ```js [app/adapters/post.js]
      import MyCustomAdapter from './custom-adapter';

      export default class PostAdapter extends MyCustomAdapter {
        findAll(store, type, sinceToken, snapshotRecordArray) {
          if (snapshotRecordArray.adapterOptions.subscribe) {
            // ...
          }
          // ...
        }
      }
      ```
   */
  declare adapterOptions?: Record<string, unknown>;
  /**
   * The relationships to include for this request.

      Example

      ```js [app/adapters/application.js]
      import Adapter from '@ember-data/adapter';

      export default class ApplicationAdapter extends Adapter {
        findAll(store, type, snapshotRecordArray) {
          let url = `/${type.modelName}?include=${encodeURIComponent(snapshotRecordArray.include)}`;

          return fetch(url).then((response) => response.json())
        }
      }
      ```
   */
  declare include?: string | string[];

  /**
    SnapshotRecordArray is not directly instantiable.
    Instances are provided to consuming application's
    adapters and serializers for certain requests.

    @private
    @constructor
    @param {Store} store
    @param {String} type
    @param options
   */
  constructor(store: Store, type: string, options: FindAllOptions = {}) {
    this.__store = store;
    this._snapshots = null;
    this.modelName = type;
    this.adapterOptions = options.adapterOptions;
    this.include = options.include;
  }

  /**
    An array of records

    @internal
  */
  get _recordArray(): LegacyLiveArray {
    return this.__store.peekAll(this.modelName);
  }

  /**
      Number of records in the array

      Example

      ```js [app/adapters/post.js]
      import JSONAPIAdapter from '@ember-data/adapter/json-api';

      export default class PostAdapter extends JSONAPIAdapter {
        shouldReloadAll(store, snapshotRecordArray) {
          return !snapshotRecordArray.length;
        }
      });
      ```
    */
  get length(): number {
    return this._recordArray.length;
  }

  /**
    Get snapshots of the underlying record array

    Example

    ```js [app/adapters/post.js]
    import JSONAPIAdapter from '@ember-data/adapter/json-api';

    export default class PostAdapter extends JSONAPIAdapter {
      shouldReloadAll(store, snapshotArray) {
        let snapshots = snapshotArray.snapshots();

        return snapshots.any(function(ticketSnapshot) {
          let timeDiff = moment().diff(ticketSnapshot.attr('lastAccessedAt'), 'minutes');
          if (timeDiff > 20) {
            return true;
          } else {
            return false;
          }
        });
      }
    }
    ```

    @public
    @return Array of snapshots
  */
  snapshots(): Snapshot[] {
    if (this._snapshots !== null) {
      return this._snapshots;
    }
    upgradeStore(this.__store);

    const { _fetchManager } = this.__store;
    const LiveArrayContext = (this._recordArray as unknown as PrivateReactiveResourceArray)[Context];
    this._snapshots = LiveArrayContext.source.map((identifier: ResourceKey) =>
      _fetchManager.createSnapshot(identifier)
    );

    return this._snapshots;
  }
}
