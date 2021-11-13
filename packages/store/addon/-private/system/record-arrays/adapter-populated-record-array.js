import { A } from '@ember/array';
import { get } from '@ember/object';
import { once } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

import { DEPRECATE_EVENTED_API_USAGE } from '@ember-data/private-build-infra/deprecations';

import RecordArray from './record-array';

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
let AdapterPopulatedRecordArray = RecordArray.extend({
  init() {
    this.set('content', this.get('content') || A());

    this._super(...arguments);
    this.query = this.query || null;
    this.links = this.links || null;

    if (DEBUG) {
      this._getDeprecatedEventedInfo = () =>
        `AdapterPopulatedRecordArray containing ${this.modelName} for query: ${this.query}`;
    }
  },

  replace() {
    throw new Error(`The result of a server query (on ${this.modelName}) is immutable.`);
  },

  _update() {
    let store = get(this, 'store');
    let query = get(this, 'query');

    return store._query(this.modelName, query, this);
  },

  _setObjects(identifiersOrInternalModels, payload) {
    // TODO: initial load should not cause change events at all, only
    // subsequent. This requires changing the public api of adapter.query, but
    // hopefully we can do that soon.
    this.get('content').setObjects(identifiersOrInternalModels);

    this.setProperties({
      isLoaded: true,
      isUpdating: false,
      meta: { ...payload.meta },
      links: { ...payload.links },
    });

    this.manager._associateWithRecordArray(identifiersOrInternalModels, this);

    if (DEPRECATE_EVENTED_API_USAGE) {
      let _hasDidLoad = DEBUG ? this._has('didLoad') : this.has('didLoad');
      if (_hasDidLoad) {
        // TODO: should triggering didLoad event be the last action of the runLoop?
        once(this, 'trigger', 'didLoad');
      }
    }
  },

  /**
    @method _setIdentifiers
    @param {StableRecordIdentifier[]} identifiers
    @param {Object} payload normalized payload
    @private
  */
  _setIdentifiers(identifiers, payload) {
    this._setObjects(identifiers, payload);
  },
});

export default AdapterPopulatedRecordArray;
