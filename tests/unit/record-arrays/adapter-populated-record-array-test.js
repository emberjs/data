import { A } from '@ember/array';
import RSVP from 'rsvp';
import { run } from '@ember/runloop';
import DS from 'ember-data';

import { module, test } from 'qunit';
const { AdapterPopulatedRecordArray } = DS;

module('unit/record-arrays/adapter-populated-record-array - DS.AdapterPopulatedRecordArray');

function internalModelFor(record) {
  let _internalModel = {
    get id() {
      return record.id;
    },
    getRecord() {
      return record;
    }
  };

  record._internalModel = _internalModel
  return _internalModel;
}

test('default initial state', function(assert) {
  let recordArray = AdapterPopulatedRecordArray.create({ modelName: 'recordType' });

  assert.equal(recordArray.get('isLoaded'), false, 'expected isLoaded to be false');
  assert.equal(recordArray.get('modelName'), 'recordType');
  assert.deepEqual(recordArray.get('content'), []);
  assert.equal(recordArray.get('query'), null);
  assert.equal(recordArray.get('store'), null);
  assert.equal(recordArray.get('links'), null);
});

test('custom initial state', function(assert) {
  let content = A([]);
  let store = {};
  let recordArray = AdapterPopulatedRecordArray.create({
    modelName: 'apple',
    isLoaded: true,
    isUpdating: true,
    content,
    store,
    query: 'some-query',
    links: 'foo'
  });
  assert.equal(recordArray.get('isLoaded'), true);
  assert.equal(recordArray.get('isUpdating'), false);
  assert.equal(recordArray.get('modelName'), 'apple');
  assert.equal(recordArray.get('content'), content);
  assert.equal(recordArray.get('store'), store);
  assert.equal(recordArray.get('query'), 'some-query');
  assert.equal(recordArray.get('links'), null);
});

test('#replace() throws error', function(assert) {
  let recordArray = AdapterPopulatedRecordArray.create({ modelName: 'recordType' });

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
    modelName: 'recordType',
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
test('#_setInternalModels', function(assert) {
  let didAddRecord = 0;
  function add(array) {
    didAddRecord++;
    assert.equal(array, recordArray);
  }

  let recordArray = AdapterPopulatedRecordArray.create({
    query: 'some-query'
  });

  let model1 = internalModelFor({ id: 1 });
  let model2 = internalModelFor({ id: 2 });

  model1._recordArrays = { add };
  model2._recordArrays = { add };

  assert.equal(didAddRecord, 0, 'no records should have been added yet');

  let didLoad = 0;
  recordArray.on('didLoad', function() {
    didLoad++;
  });

  let links = { foo: 1 };
  let meta = { bar: 2 };

  run(() => {
    assert.equal(recordArray._setInternalModels([model1, model2], {
      links,
      meta
    }), undefined, '_setInternalModels should have no return value');

    assert.equal(didAddRecord, 2, 'two records should have been added');

    assert.deepEqual(recordArray.toArray(), [
      model1,
      model2
    ].map(x => x.getRecord()), 'should now contain the loaded records');

    assert.equal(didLoad, 0, 'didLoad event should not have fired');
    assert.equal(recordArray.get('links').foo, 1);
    assert.equal(recordArray.get('meta').bar, 2);
  });
  assert.equal(didLoad, 1, 'didLoad event should have fired once');
});

test('change events when receiving a new query payload', function(assert) {
  assert.expect(37);

  let arrayDidChange = 0;
  let contentDidChange = 0;
  let didAddRecord = 0;

  function add(array) {
    didAddRecord++;
    assert.equal(array, recordArray);
  }

  function del(array) {
    assert.equal(array, recordArray);
  }

  let recordArray = AdapterPopulatedRecordArray.create({
    query: 'some-query'
  });

  let model1 = internalModelFor({ id: '1', name: 'Scumbag Dale' });
  let model2 = internalModelFor({ id: '2', name: 'Scumbag Katz' })

  model1._recordArrays = { add, delete: del };
  model2._recordArrays = { add, delete: del };

  run(() => {
    recordArray._setInternalModels([
      model1,
      model2
    ], {});
  });

  assert.equal(didAddRecord, 2, 'expected 2 didAddRecords');
  assert.deepEqual(recordArray.map(x => x.name), ['Scumbag Dale', 'Scumbag Katz']);

  assert.equal(arrayDidChange, 0, 'array should not yet have emitted a change event');
  assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

  recordArray.addObserver('content', function() {
    contentDidChange++;
  });

  recordArray.one('@array:change', function(array, startIdx, removeAmt, addAmt) {
    arrayDidChange++;

    // first time invoked
    assert.equal(array, recordArray, 'should be same record array as above');
    assert.equal(startIdx,  0, 'expected startIdx');
    assert.equal(removeAmt, 2, 'expcted removeAmt');
    assert.equal(addAmt,    2, 'expected addAmt');
  });

  assert.equal(recordArray.get('isLoaded'), true, 'should be considered loaded');
  assert.equal(recordArray.get('isUpdating'), false, 'should not yet be updating');

  assert.equal(arrayDidChange, 0);
  assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

  arrayDidChange = 0;
  contentDidChange = 0;
  didAddRecord = 0;

  let model3 = internalModelFor({ id: '3', name: 'Scumbag Penner' });
  let model4 = internalModelFor({ id: '4', name: 'Scumbag Hamilton' });

  model3._recordArrays = { add, delete: del };
  model4._recordArrays = { add, delete: del };

  run(() => {
    // re-query
    recordArray._setInternalModels([
      model3,
      model4
    ], {});
  });

  assert.equal(didAddRecord, 2, 'expected 2 didAddRecords');
  assert.equal(recordArray.get('isLoaded'), true, 'should be considered loaded');
  assert.equal(recordArray.get('isUpdating'), false, 'should no longer be updating');

  assert.equal(arrayDidChange, 1, 'record array should have omitted ONE change event');
  assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

  assert.deepEqual(recordArray.map(x => x.name), ['Scumbag Penner', 'Scumbag Hamilton']);

  arrayDidChange = 0; // reset change event counter
  contentDidChange = 0; // reset change event counter
  didAddRecord = 0;

  recordArray.one('@array:change', function(array, startIdx, removeAmt, addAmt) {
    arrayDidChange++;

    // first time invoked
    assert.equal(array, recordArray, 'should be same recordArray as above');
    assert.equal(startIdx,  0, 'expected startIdx');
    assert.equal(removeAmt, 2, 'expcted removeAmt');
    assert.equal(addAmt,    1, 'expected addAmt');
  });

  // re-query
  assert.equal(recordArray.get('isLoaded'), true, 'should be considered loaded');
  assert.equal(recordArray.get('isUpdating'), false, 'should not yet be updating');

  assert.equal(arrayDidChange, 0, 'record array should not yet have omitted a change event');
  assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

  let model5 = internalModelFor({ id: '3', name: 'Scumbag Penner' })

  model5._recordArrays = { add, delete: del };

  run(() => {
    recordArray._setInternalModels([
      model5
    ], {});
  });

  assert.equal(didAddRecord, 1, 'expected 0 didAddRecord');

  assert.equal(recordArray.get('isLoaded'), true, 'should be considered loaded');
  assert.equal(recordArray.get('isUpdating'), false, 'should not longer be updating');

  assert.equal(arrayDidChange, 1, 'record array should have emitted one change event');
  assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

  assert.deepEqual(recordArray.map(x => x.name), ['Scumbag Penner']);
});
