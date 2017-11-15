import { once } from '@ember/runloop';
import { get, observer } from '@ember/object';
import RecordArray from "./record-array";

/**
  Represents a list of records whose membership is determined by the
  store. As records are created, loaded, or modified, the store
  evaluates them to determine if they should be part of the record
  array.

  @class FilteredRecordArray
  @namespace DS
  @extends DS.RecordArray
*/
export default RecordArray.extend({
  init() {
    this._super(...arguments);

    this.set('filterFunction', this.get('filterFunction') || null);
    this.isLoaded = true;
  },
  /**
    The filterFunction is a function used to test records from the store to
    determine if they should be part of the record array.

    Example

    ```javascript
    var allPeople = store.peekAll('person');
    allPeople.mapBy('name'); // ["Tom Dale", "Yehuda Katz", "Trek Glowacki"]

    var people = store.filter('person', function(person) {
      if (person.get('name').match(/Katz$/)) { return true; }
    });
    people.mapBy('name'); // ["Yehuda Katz"]

    var notKatzFilter = function(person) {
      return !person.get('name').match(/Katz$/);
    };
    people.set('filterFunction', notKatzFilter);
    people.mapBy('name'); // ["Tom Dale", "Trek Glowacki"]
    ```

    @method filterFunction
    @param {DS.Model} record
    @return {Boolean} `true` if the record should be in the array
  */

  replace() {
    throw new Error(`The result of a client-side filter (on ${this.modelName}) is immutable.`);
  },

  /**
    @method updateFilter
    @private
  */
  _updateFilter() {
    if (get(this, 'isDestroying') || get(this, 'isDestroyed')) {
      return;
    }
    get(this, 'manager').updateFilter(this, this.modelName, get(this, 'filterFunction'));
  },

  updateFilter: observer('filterFunction', function() {
    once(this, this._updateFilter);
  })
});
