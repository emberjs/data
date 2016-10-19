import Ember from 'ember';
import RecordArray from "ember-data/-private/system/record-arrays/record-array";
import cloneNull from "ember-data/-private/system/clone-null";
import isEnabled from 'ember-data/-private/features';

/**
  @module ember-data
*/

var get = Ember.get;

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
  query: null,

  replace() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a server query (on " + type + ") is immutable.");
  },

  _update() {
    let store = get(this, 'store');
    let modelName = get(this, 'type.modelName');
    let query = get(this, 'query');

    return store._query(modelName, query, this);
  },

  /**
    @method loadRecords
    @param {Array} records
    @param {Object} payload normalized payload
    @private
  */
  loadRecords(records, payload) {
    let token = heimdall.start('AdapterPopulatedRecordArray.loadRecords');
    //TODO Optimize
    var internalModels = Ember.A(records).mapBy('_internalModel');
    this.setProperties({
      content: Ember.A(internalModels),
      isLoaded: true,
      isUpdating: false,
      meta: cloneNull(payload.meta)
    });

    if (isEnabled('ds-links-in-record-array')) {
      this.set('links', cloneNull(payload.links));
    }

    internalModels.forEach((record) => {
      this.manager.recordArraysForRecord(record).add(this);
    });

    // TODO: should triggering didLoad event be the last action of the runLoop?
    Ember.run.once(this, 'trigger', 'didLoad');
    heimdall.stop(token);
  }
});
