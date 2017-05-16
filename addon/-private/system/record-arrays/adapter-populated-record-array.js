import Ember from 'ember';
import RecordArray from "./record-array";
import cloneNull from "../clone-null";
import { associateWithRecordArray } from '../record-array-manager';

/**
  @module ember-data
*/

const { get } = Ember;

/**
  Represents an ordered list of records whose order and membership is
  determined by the adapter. For example, a query sent to the adapter
  may trigger a search on the server, whose results would be loaded
  into an instance of the `AdapterPopulatedRecordArray`.

  ---

  If you want to update the array and get the latest records from the
  adapter, you can invoke [`update()`](#method_update):

  Example

  ```javascript
  // GET /users?isAdmin=true
  var admins = store.query('user', { isAdmin: true });

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
  ```

  @class AdapterPopulatedRecordArray
  @namespace DS
  @extends DS.RecordArray
*/
export default RecordArray.extend({
  init() {
    // yes we are touching `this` before super, but ArrayProxy has a bug that requires this.
    this.set('content', this.get('content') || Ember.A());

    this._super(...arguments);
    this.query = this.query || null;
    this.links = null;
  },

  replace() {
    throw new Error(`The result of a server query (on ${this.modelName}) is immutable.`);
  },

  _update() {
    let store = get(this, 'store');
    let query = get(this, 'query');

    return store._query(this.modelName, query, this);
  },

  /**
    @method _setInternalModels
    @param {Array} internalModels
    @param {Object} payload normalized payload
    @private
  */
  _setInternalModels(internalModels, payload) {
    let token = heimdall.start('AdapterPopulatedRecordArray._setInternalModels');

    // TODO: initial load should not cause change events at all, only
    // subsequent. This requires changing the public api of adapter.query, but
    // hopefully we can do that soon.
    this.get('content').setObjects(internalModels);

    this.setProperties({
      isLoaded: true,
      isUpdating: false,
      meta: cloneNull(payload.meta),
      links: cloneNull(payload.links)
    });

    associateWithRecordArray(internalModels, this);

    // TODO: should triggering didLoad event be the last action of the runLoop?
    Ember.run.once(this, 'trigger', 'didLoad');
    heimdall.stop(token);
  }
});
