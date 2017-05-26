import DS from 'ember-data';
import Ember from 'ember';

import {module, test} from 'qunit';

const { get } = Ember;
const { FilteredRecordArray } = DS;

module('unit/record-arrays/filtered-record-array - DS.FilteredRecordArray');

test('default initial state', function(assert) {
  let recordArray = FilteredRecordArray.create({ modelName: 'recordType' });

  assert.equal(get(recordArray, 'isLoaded'), true);
  assert.equal(get(recordArray, 'modelName'), 'recordType');
  assert.equal(get(recordArray, 'content'), null);
  assert.equal(get(recordArray, 'filterFunction'), null);
  assert.equal(get(recordArray, 'store'), null);
});

test('custom initial state', function(assert) {
  let content = Ember.A();
  let store = {};
  let filterFunction = () => true;
  let recordArray = FilteredRecordArray.create({
    modelName: 'apple',
    isLoaded: false, // ignored
    isUpdating: true,
    content,
    store,
    filterFunction
  });
  assert.equal(get(recordArray, 'isLoaded'), true);
  assert.equal(get(recordArray, 'isUpdating'), false); // cannot set as default value:
  assert.equal(get(recordArray, 'modelName'), 'apple');
  assert.equal(get(recordArray, 'content'), content);
  assert.equal(get(recordArray, 'store'), store);
  assert.equal(get(recordArray, 'filterFunction'), filterFunction);
});

test('#replace() throws error', function(assert) {
  let recordArray = FilteredRecordArray.create({ modelName: 'recordType' });

  assert.throws(() => {
    recordArray.replace();
  }, Error('The result of a client-side filter (on recordType) is immutable.'), 'throws error');
});

test('updateFilter', function(assert) {
  let didUpdateFilter = 0;
  const updatedFilterFunction = () => true;

  const manager = {
    updateFilter(array, modelName, filterFunction) {
      didUpdateFilter++;
      assert.equal(recordArray, array);
      assert.equal(modelName, 'recordType');
      assert.equal(filterFunction, updatedFilterFunction);
    },
    unregisterRecordArray() {}
  };

  let recordArray = FilteredRecordArray.create({
    modelName: 'recordType',
    manager,
    content: Ember.A()
  });

  assert.equal(didUpdateFilter, 0, 'no filterFunction should have been changed yet');

  Ember.run(() => {
    recordArray.set('filterFunction', updatedFilterFunction);
    assert.equal(didUpdateFilter, 0, 'record array manager should not yet be informed of the filterFunction change');
    recordArray.set('filterFunction', updatedFilterFunction);
    assert.equal(didUpdateFilter, 0, 'record array manager should not yet be informed of the filterFunction change')
  });

  assert.equal(didUpdateFilter, 1, 'record array manager should have been informed once that the array filterFunction has changed');

  didUpdateFilter = 0;
  Ember.run(() => {
    recordArray.set('filterFunction', updatedFilterFunction);
    assert.equal(didUpdateFilter, 0, 'record array manager should not be informed of this change');
    recordArray.destroy();
    assert.equal(didUpdateFilter, 0, 'record array manager should not be informed of this change');
  });

  assert.equal(didUpdateFilter, 0, 'record array manager should not be informed of this change');
});
