import { A } from '@ember/array';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { once } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

import { DEPRECATE_EVENTED_API_USAGE } from '@ember-data/private-build-infra/deprecations';

import { promiseArray } from '../promise-proxies';
import SnapshotRecordArray from '../snapshot-record-array';
import RecordArray from './record-array';

type Meta = import('../../ts-interfaces/ember-data-json-api').Meta;

type CoreStore = import('../core-store').default;
type RecordArrayManager = import('ember-data/-private').RecordArrayManager;
type NativeArray<T> = import('@ember/array/-private/native-array').default<T>;

type RecordInstance = import('../../ts-interfaces/record-instance').RecordInstance;
type PromiseArray<K, V> = import('ember-data/-private').PromiseArray<K, V>;

type FindOptions = import('../../ts-interfaces/store').FindOptions;
type StableRecordIdentifier = import('../../ts-interfaces/identifier').StableRecordIdentifier;
type CollectionResourceDocument = import('../../ts-interfaces/ember-data-json-api').CollectionResourceDocument;
type Dict<T> = import('../../ts-interfaces/utils').Dict<T>;
type Links = import('../../ts-interfaces/ember-data-json-api').Links;
type PaginationLinks = import('../../ts-interfaces/ember-data-json-api').PaginationLinks;

/**
  @module @ember-data/store
*/

/**
  Represents an ordered list of records whose order and membership is
  determined by the adapter. For example, a query sent to the adapter
  may trigger a search on the server, whose results would be loaded
  into an instance of the `AdapterPopulatedRecordArray`.

  This class should not be imported and instantiated by consuming applications.

  ---

  If you want to update the array and get the latest records from the
  adapter, you can invoke [`update()`](AdapterPopulatedRecordArray/methods/update?anchor=update):

  Example

  ```javascript
  // GET /users?isAdmin=true
  store.query('user', { isAdmin: true }).then(function(admins) {

    admins.then(function() {
      console.log(admins.get("length")); // 42
    });

    // somewhere later in the app code, when new admins have been created
    // in the meantime
    //
    // GET /users?isAdmin=true
    admins.update().then(function() {
      admins.get('isUpdating'); // false
      console.log(admins.get("length")); // 123
    });

    admins.get('isUpdating'); // true
  }
  ```

  @class AdapterPopulatedRecordArray
  @public
  @extends RecordArray
*/
export interface AdapterPopulatedRecordArrayCreateArgs {
  modelName: string;
  store: CoreStore;
  manager: RecordArrayManager;
  content: NativeArray<StableRecordIdentifier>;
  isLoaded?: boolean;
  query?: Dict<unknown>;
  meta?: Meta;
  links?: Links | PaginationLinks | null;
}
export interface AdapterPopulatedRecordArrayCreator {
  create(args: AdapterPopulatedRecordArrayCreateArgs): AdapterPopulatedRecordArray;
}
export default class AdapterPopulatedRecordArray extends RecordArray {
  declare links?: Links | PaginationLinks | null;
  declare meta?: Dict<unknown>;
  declare query: Dict<unknown> | null;

  init(props?: { isUpdating?: boolean }) {
    assert(`Cannot initialize AdapterPopulatedRecordArray with isUpdating`, !props || !('isUpdating' in props));
    super.init();
    this.set('content', this.get('content') || A());

    super.init();
    this.query = this.query || null;
    this.links = this.links || null;

    if (DEBUG) {
      this._getDeprecatedEventedInfo = () =>
        `AdapterPopulatedRecordArray containing ${this.modelName} for query: ${this.query}`;
    }
  }

  replace() {
    throw new Error(`The result of a server query (on ${this.modelName}) is immutable.`);
  }

  _update(): PromiseArray<RecordInstance, AdapterPopulatedRecordArray> {
    const { store, query } = this;

    // TODO save options from initial request?
    return promiseArray(store._query(this.modelName, query, this));
  }

  _setObjects(identifiers: StableRecordIdentifier[], payload: CollectionResourceDocument) {
    // TODO: initial load should not cause change events at all, only
    // subsequent. This requires changing the public api of adapter.query, but
    // hopefully we can do that soon.
    this.content.setObjects(identifiers);

    this.setProperties({
      isLoaded: true,
      isUpdating: false,
      // TODO this assign kills the root reference but a deep-copy would be required
      // for both meta and links to actually not be by-ref. We whould likely change
      // this to a dev-only deep-freeze.
      meta: assign({}, payload.meta),
      links: assign({}, payload.links),
    });

    this.manager._associateWithRecordArray(identifiers, this);

    if (DEPRECATE_EVENTED_API_USAGE) {
      let _hasDidLoad = DEBUG ? this._has('didLoad') : this.has('didLoad');
      if (_hasDidLoad) {
        // TODO: should triggering didLoad event be the last action of the runLoop?
        once(this, 'trigger', 'didLoad');
      }
    }
  }

  _createSnapshot(options: FindOptions) {
    // this is private for users, but public for ember-data internals
    // meta will only be present for an AdapterPopulatedRecordArray
    return new SnapshotRecordArray(this, this.meta, options);
  }

  /**
    @method _setIdentifiers
    @param {StableRecordIdentifier[]} identifiers
    @param {Object} payload normalized payload
    @private
  */
  _setIdentifiers(identifiers: StableRecordIdentifier[], payload: CollectionResourceDocument): void {
    this._setObjects(identifiers, payload);
  }
}
