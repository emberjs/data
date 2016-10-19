import DS from 'ember-data';

import {module, test} from 'qunit';
import Ember from 'ember';

const { RSVP, run } = Ember;
const { AdapterPopulatedRecordArray } = DS;

module('unit/record-arrays/adapter-populated-record-array - DS.AdapterPopulatedRecordArray');

test('default initial state', function(assert) {
  let recordArray = AdapterPopulatedRecordArray.create({ type: 'recordType' });

  assert.equal(recordArray.get('isLoaded'), false, 'expected isLoaded to be false');
  assert.equal(recordArray.get('type'), 'recordType');
  assert.equal(recordArray.get('content'), null);
  assert.equal(recordArray.get('query'), null);
  assert.equal(recordArray.get('store'), null);
  assert.equal(recordArray.get('links'), null);
});

test('custom initial state', function(assert) {
  let content = [];
  let store = {};
  let recordArray = AdapterPopulatedRecordArray.create({
    type: 'apple',
    isLoaded: true,
    isUpdating: true,
    content,
    store,
    query: 'some-query',
    links: 'foo'
  })
  assert.equal(recordArray.get('isLoaded'), true);
  assert.equal(recordArray.get('isUpdating'), false);
  assert.equal(recordArray.get('type'), 'apple');
  assert.equal(recordArray.get('content'), content);
  assert.equal(recordArray.get('store'), store);
  assert.equal(recordArray.get('query'), 'some-query');
  assert.equal(recordArray.get('links'), null);
});

test('#replace() throws error', function(assert) {
  let recordArray = AdapterPopulatedRecordArray.create({ type: 'recordType' });

  assert.throws(() => {
    recordArray.replace();
  }, Error('The result of a server query (on recordType) is immutable.'), 'throws error');
});

test('#update uses _update enabling query specific behavior', function(assert) {
  let queryCalled = 0;
  let deferred = RSVP.defer();

  const store = {
    _query(modelName, query, array) {
      queryCalled++;
      assert.equal(modelName, 'recordType');
      assert.equal(query, 'some-query');
      assert.equal(array, recordArray);

      return deferred.promise;
    }
  };

  let recordArray = AdapterPopulatedRecordArray.create({
    type: { modelName: 'recordType' },
    store,
    query: 'some-query'
  });

  assert.equal(recordArray.get('isUpdating'), false, 'should not yet be updating');

  assert.equal(queryCalled, 0);

  let updateResult = recordArray.update();

  assert.equal(queryCalled, 1);

  deferred.resolve('return value');

  assert.equal(recordArray.get('isUpdating'), true, 'should be updating');

  return updateResult.then(result => {
    assert.equal(result, 'return value');
    assert.equal(recordArray.get('isUpdating'), false, 'should no longer be updating');
  });
});

// TODO: is this method required, i suspect store._query should be refactor so this is not needed
test('#loadRecords', function(assert) {
  let didAddRecord = 0;
  const manager = {
    recordArraysForRecord(record) {
      return {
        add(array) {
          didAddRecord++;
          assert.equal(array, recordArray);
        }
      }
    }
  };

  let recordArray = AdapterPopulatedRecordArray.create({
    query: 'some-query',
    manager
  });

  let model1 = {
    id: 2,
    _internalModel: { getRecord() { return model1; }}
  };

  let model2 = {
    id: 2,
    _internalModel: { getRecord() { return model2; }}
  };

  assert.equal(didAddRecord, 0, 'no records should have been added yet');

  let didLoad = 0;
  recordArray.on('didLoad', function() {
    didLoad++;
  });

  let links = { foo:1 };
  let meta = { bar:2 };

  run(() => {
    assert.equal(recordArray.loadRecords([model1, model2], {
      links,
      meta
    }), undefined, 'loadRecords should have no return value');

    assert.equal(didAddRecord, 2, 'two records should have been adde');

    assert.deepEqual(recordArray.toArray(), [
      model1,
      model2
    ], 'should now contain the loaded records');

    assert.equal(didLoad, 0, 'didLoad event should not have fired');
    assert.equal(recordArray.get('links').foo, 1);
    assert.equal(recordArray.get('meta').bar, 2);
  });
  assert.equal(didLoad, 1, 'didLoad event should have fired once');
});
