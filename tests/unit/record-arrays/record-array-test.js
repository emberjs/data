import DS from 'ember-data';

import {module, test} from 'qunit';

var recordArray;

module("unit/record-arrays/record-array - DS.RecordArray", {
  beforeEach() {
    recordArray = DS.RecordArray.create({ type: 'recordType' });
  }
});

test('recordArray.replace() throws error', function(assert) {
  assert.throws(function() {
    recordArray.replace();
  }, Error("The result of a server query (for all [recordType] types) is immutable."), 'throws error');
});
