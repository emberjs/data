import Ember from 'ember';
import RecordArray from "ember-data/-private/system/record-arrays/record-array";

/**
  @module ember-data
*/

var get = Ember.get;

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
  filterFunction: null,
  isLoaded: true,

  replace() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a client-side filter (on " + type + ") is immutable.");
  },

  /**
    @method updateFilter
    @private
  */
  _updateFilter() {
    var manager = get(this, 'manager');
    manager.updateFilter(this, get(this, 'type'), get(this, 'filterFunction'));
  },

  updateFilter: Ember.observer('filterFunction', function() {
    Ember.run.once(this, this._updateFilter);
  })
});
