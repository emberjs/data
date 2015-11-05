import DS from 'ember-data';

var filteredArray;

module("unit/record-arrays/filtered-record-array - DS.FilteredRecordArray", {
  setup: function() {
    filteredArray = DS.FilteredRecordArray.create({ type: 'recordType' });
  }
});

test('recordArray.replace() throws error', function() {
  throws(function() {
    filteredArray.replace();
  }, Error("The result of a client-side filter (on recordType) is immutable."), 'throws error');
});
