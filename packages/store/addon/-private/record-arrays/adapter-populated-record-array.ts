import type NativeArray from '@ember/array/-private/native-array';
import { assert } from '@ember/debug';

import type { CollectionResourceDocument, Links, Meta, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';
import type { Dict } from '@ember-data/types/q/utils';

import type Store from '../core-store';
import type { PromiseArray } from '../promise-proxies';
import { promiseArray } from '../promise-proxies';
import type RecordArrayManager from '../record-array-manager';
import SnapshotRecordArray from '../snapshot-record-array';
import RecordArray from './record-array';

export interface AdapterPopulatedRecordArrayCreateArgs {
  modelName: string;
  store: Store;
  manager: RecordArrayManager;
  content: NativeArray<StableRecordIdentifier>;
  isLoaded: boolean;
  query?: Dict<unknown>;
  meta?: Meta;
  links?: Links | PaginationLinks | null;
}

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
export default class AdapterPopulatedRecordArray extends RecordArray {
  declare links: Links | PaginationLinks | null;
  declare meta: Dict<unknown> | null;
  declare query: Dict<unknown> | null;

  init(props?: AdapterPopulatedRecordArrayCreateArgs) {
    assert(`Cannot initialize AdapterPopulatedRecordArray with isUpdating`, !props || !('isUpdating' in props));
    super.init();
    this.query = this.query || null;
    this.links = this.links || null;
    this.meta = this.meta || null;
  }

  replace() {
    throw new Error(`The result of a server query (on ${this.modelName}) is immutable.`);
  }

  _update(): PromiseArray<RecordInstance, AdapterPopulatedRecordArray> {
    const { store, query } = this;

    // TODO save options from initial request?
    return promiseArray(store.query(this.modelName, query, { _recordArray: this }));
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
      meta: Object.assign({}, payload.meta),
      links: Object.assign({}, payload.links),
    });

    this.manager._associateWithRecordArray(identifiers, this);
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
