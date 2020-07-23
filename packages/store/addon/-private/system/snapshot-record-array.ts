type Dict<T> = import('../ts-interfaces/utils').Dict<T>;
/**
  @module @ember-data/store
*/
type RecordArray = import('./record-arrays/record-array').default;
type Snapshot = import('./snapshot').default;
type ModelSchema = import('../ts-interfaces/ds-model').ModelSchema;
/**
  @class SnapshotRecordArray
  @private
  @constructor
  @param {Array} snapshots An array of snapshots
  @param {Object} meta
*/
export default class SnapshotRecordArray {
  private _snapshots: Snapshot[] | null;
  private _recordArray: RecordArray | null;
  private _type: ModelSchema | null;

  public length: number;
  public meta?: Dict<any>;
  public adapterOptions: Dict<any>;
  public include?: string;

  constructor(recordArray: RecordArray, meta?: Dict<any>, options: Dict<any> = {}) {
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

      export default JSONAPIAdapter.extend({
        shouldReloadAll(store, snapshotRecordArray) {
          return !snapshotRecordArray.length;
        },
      });
      ```

      @property length
      @type {Number}
    */
    this.length = recordArray.get('length');

    this._type = null;

    /**
      Meta objects for the record array.

      Example

      ```app/adapters/post.js
      import JSONAPIAdapter from '@ember-data/adapter/json-api';

      export default JSONAPIAdapter.extend({
        shouldReloadAll(store, snapshotRecordArray) {
          var lastRequestTime = snapshotRecordArray.meta.lastRequestTime;
          var twentyMinutes = 20 * 60 * 1000;
          return Date.now() > lastRequestTime + twentyMinutes;
        },
      });
      ```

      @property meta
      @type {Object}
    */
    this.meta = meta;

    /**
      A hash of adapter options passed into the store method for this request.

      Example

      ```app/adapters/post.js
      import MyCustomAdapter from './custom-adapter';

      export default MyCustomAdapter.extend({
        findAll(store, type, sinceToken, snapshotRecordArray) {
          if (snapshotRecordArray.adapterOptions.subscribe) {
            // ...
          }
          // ...
        }
      });
      ```

      @property adapterOptions
      @type {Object}
    */
    this.adapterOptions = options.adapterOptions;

    /**
      The relationships to include for this request.

      Example

      ```app/adapters/application.js
      import Adapter from '@ember-data/adapter';

      export default Adapter.extend({
        findAll(store, type, snapshotRecordArray) {
          var url = `/${type.modelName}?include=${encodeURIComponent(snapshotRecordArray.include)}`;

          return fetch(url).then((response) => response.json())
        }
      });
      ```

      @property include
      @type {String|Array}
    */
    this.include = options.include;
  }

  /**
    The type of the underlying records for the snapshots in the array, as a Model
    @property type
    @type {Model}
  */
  get type() {
    return this._type || (this._type = this._recordArray.get('type'));
  }
  /**
    The modelName of the underlying records for the snapshots in the array, as a Model
    @property type
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

    export default JSONAPIAdapter.extend({
      shouldReloadAll(store, snapshotArray) {
        var snapshots = snapshotArray.snapshots();

        return snapshots.any(function(ticketSnapshot) {
          var timeDiff = moment().diff(ticketSnapshot.attr('lastAccessedAt'), 'minutes');
          if (timeDiff > 20) {
            return true;
          } else {
            return false;
          }
        });
      }
    });
    ```

    @method snapshots
    @return {Array} Array of snapshots
  */
  snapshots() {
    if (this._snapshots !== null) {
      return this._snapshots;
    }

    this._snapshots = this._recordArray._takeSnapshot();

    return this._snapshots;
  }
}
