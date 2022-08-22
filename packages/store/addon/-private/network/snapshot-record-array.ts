/**
  @module @ember-data/store
*/

import { deprecate } from '@ember/debug';

import { DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS } from '@ember-data/private-build-infra/deprecations';
import type { ModelSchema } from '@ember-data/types/q/ds-model';
import { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { FindOptions } from '@ember-data/types/q/store';
import type { Dict } from '@ember-data/types/q/utils';

import type IdentifierArray from '../record-arrays/identifier-array';
import { SOURCE } from '../record-arrays/identifier-array';
import Store from '../store-service';
import type Snapshot from './snapshot';
/**
  SnapshotRecordArray is not directly instantiable.
  Instances are provided to consuming application's
  adapters for certain requests.

  @class SnapshotRecordArray
  @public
*/
export default class SnapshotRecordArray {
  declare _snapshots: Snapshot[] | null;
  declare _recordArray: IdentifierArray;
  declare _type: ModelSchema | null;
  declare __store: Store;

  declare length: number;
  declare adapterOptions?: Dict<unknown>;
  declare include?: string;

  /**
    SnapshotRecordArray is not directly instantiable.
    Instances are provided to consuming application's
    adapters and serializers for certain requests.

    @method constructor
    @private
    @constructor
    @param {RecordArray} recordArray
    @param options
   */
  constructor(store: Store, recordArray: IdentifierArray, options: FindOptions = {}) {
    this.__store = store;
    /**
      An array of snapshots
      @private
      @property _snapshots
      @type {Array}
    */
    this._snapshots = null;

    /**
      An array of records
      @private
      @property _recordArray
      @type {Array}
    */
    this._recordArray = recordArray;

    /**
      Number of records in the array

      Example

      ```app/adapters/post.js
      import JSONAPIAdapter from '@ember-data/adapter/json-api';

      export default class PostAdapter extends JSONAPIAdapter {
        shouldReloadAll(store, snapshotRecordArray) {
          return !snapshotRecordArray.length;
        }
      });
      ```

      @property length
      @public
      @type {Number}
    */
    this.length = recordArray.length as unknown as number; // deal with computedProperty shennanigans

    /**
      A hash of adapter options passed into the store method for this request.

      Example

      ```app/adapters/post.js
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

      @property adapterOptions
      @public
      @type {Object}
    */
    this.adapterOptions = options.adapterOptions;

    /**
      The relationships to include for this request.

      Example

      ```app/adapters/application.js
      import Adapter from '@ember-data/adapter';

      export default class ApplicationAdapter extends Adapter {
        findAll(store, type, snapshotRecordArray) {
          let url = `/${type.modelName}?include=${encodeURIComponent(snapshotRecordArray.include)}`;

          return fetch(url).then((response) => response.json())
        }
      }
      ```

      @property include
      @public
      @type {String|Array}
    */
    this.include = options.include;
  }

  /**
    The type of the underlying records for the snapshots in the array, as a Model
    @property type
    @deprecated
    @public
    @type {Model}
  */

  /**
    The modelName of the underlying records for the snapshots in the array, as a Model
    @property modelName
    @public
    @type {Model}
  */
  get modelName() {
    return this._recordArray.modelName;
  }

  /**
    Get snapshots of the underlying record array

    Example

    ```app/adapters/post.js
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

    @method snapshots
    @public
    @return {Array} Array of snapshots
  */
  snapshots() {
    if (this._snapshots !== null) {
      return this._snapshots;
    }

    const { _instanceCache } = this.__store;
    this._snapshots = this._recordArray[SOURCE].map((identifier: StableRecordIdentifier) =>
      _instanceCache.createSnapshot(identifier)
    );

    return this._snapshots;
  }
}

if (DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS) {
  Object.defineProperty(SnapshotRecordArray.prototype, 'type', {
    get() {
      deprecate(
        `Using SnapshotRecordArray.type to access the ModelClass for a record is deprecated. Use store.modelFor(<modelName>) instead.`,
        false,
        {
          id: 'ember-data:deprecate-snapshot-model-class-access',
          until: '5.0',
          for: 'ember-data',
          since: { available: '4.5.0', enabled: '4.5.0' },
        }
      );
      return this._recordArray.type;
    },
  });
}
