import type NativeArray from '@ember/array/-private/native-array';
import { assert } from '@ember/debug';

import type { Links, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { Dict } from '@ember-data/types/q/utils';

import type RecordArrayManager from '../managers/record-array-manager';
import type { PromiseArray } from '../proxies/promise-proxies';
import { promiseArray } from '../proxies/promise-proxies';
import type Store from '../store-service';
import RecordArray, { MANAGED } from './record-array';

export interface AdapterPopulatedRecordArrayCreateArgs {
  modelName: string;
  store: Store;
  manager: RecordArrayManager;
  content: NativeArray<StableRecordIdentifier>;
  isLoaded: boolean;
  query: Dict<unknown> | null;
  meta: Dict<unknown> | null;
  links: Links | PaginationLinks | null;
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

    admins.get("length"); // 42

    // somewhere later in the app code, when new admins have been created
    // in the meantime
    //
    // GET /users?isAdmin=true
    admins.update().then(function() {
      admins.isUpdating; // false
      admins.get("length"); // 123
    });

    admins.isUpdating; // true
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
  [MANAGED] = true;

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
    const promise = store.query(this.modelName, query, { _recordArray: this });

    // TODO save options from initial request?
    return promiseArray(promise);
  }

  willDestroy() {
    super.willDestroy();
    this.manager._managed.delete(this);
    this.manager._pending.delete(this);
  }
}
