import DS from 'ember-data';

import {module, test} from 'qunit';

var filteredArray;

module("unit/record-arrays/filtered-record-array - DS.FilteredRecordArray", {
  beforeEach() {
    filteredArray = DS.FilteredRecordArray.create({ type: 'recordType' });
  }
});

test('recordArray.replace() throws error', function(assert) {
  assert.throws(function() {
    filteredArray.replace();
  }, Error("The result of a client-side filter (on recordType) is immutable."), 'throws error');
});
