require("ember-data/system/record_arrays/record_array");

/**
  @module data
  @submodule data-record-array
*/

var get = Ember.get;

/**
  @class FilteredRecordArray
  @namespace DS
  @extends DS.RecordArray
  @constructor
*/
DS.FilteredRecordArray = DS.RecordArray.extend({
  filterFunction: null,
  isLoaded: true,

  replace: function() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a client-side filter (on " + type + ") is immutable.");
  },

  updateFilter: Ember.observer(function() {
    var manager = get(this, 'manager');
    manager.updateFilter(this, get(this, 'type'), get(this, 'filterFunction'));
  }, 'filterFunction')
});
