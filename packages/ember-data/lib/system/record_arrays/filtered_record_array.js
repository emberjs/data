import RecordArray from "./record_array";

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
var FilteredRecordArray = RecordArray.extend({
  /**
    The filterFunction is a function used to test records from the store to
    determine if they should be part of the record array.

    Example

    ```javascript
    var allPeople = store.all('person');
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
  filterFunction: Ember.computed(function(key, value){
    // getter
    if (arguments.length !== 1) {
      if(get(this, 'parentRecordArray.filterFunction')){
        var _this = this;
        return function(item){
          console.log("in the combined function");
          console.log("first function");
          console.log(get(_this, 'parentRecordArray.filterFunction').call(_this, item));

          console.log("second function");
          console.log(get(_this, 'localFilterFunction').call(_this, item));

          console.log(item._data);
          return get(_this, 'parentRecordArray.filterFunction').call(_this, item) && get(_this, 'localFilterFunction').call(_this, item);
        };
      } else {
        return get(this, 'localFilterFunction');
      }
    // setter
    } else {
      Ember.set(this, 'localFilterFunction', value);
      return value;
    }
  }).property('localFilterFunction', 'parentRecordArray.filterFunction'),

  localFilterFunction: null,
  parentRecordArray: null,
  isLoaded: true,

  replace: function() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a client-side filter (on " + type + ") is immutable.");
  },

  chain: function(filter){

    var array = get(this, 'manager').createFilteredRecordArray(get(this, 'type'), filter);

    array.set('parentRecordArray', this);

    return array;
  },

  /**
    @method updateFilter
    @private
  */
  updateFilter: Ember.observer(function() {
    var manager = get(this, 'manager');
    manager.updateFilter(this, get(this, 'type'), get(this, 'filterFunction'));
  }, 'filterFunction')
});

export default FilteredRecordArray;
