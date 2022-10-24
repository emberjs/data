import { module, skip, test } from 'qunit';
import RSVP from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { AdapterPopulatedRecordArray, RecordArrayManager, SOURCE } from '@ember-data/store/-private';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

class Tag extends Model {
  @attr()
  name;
}

module('unit/record-arrays/adapter-populated-record-array - DS.AdapterPopulatedRecordArray', function (hooks) {
  setupTest(hooks);

  test('default initial state', async function (assert) {
    let recordArray = new AdapterPopulatedRecordArray({
      type: 'recordType',
      isLoaded: false,
      identifiers: [],
      store: null,
    });

    assert.false(recordArray.isLoaded, 'expected isLoaded to be false');
    assert.strictEqual(recordArray.modelName, 'recordType', 'has modelName');
    assert.deepEqual(recordArray.slice(), [], 'has no content');
    assert.strictEqual(recordArray.query, null, 'no query');
    assert.strictEqual(recordArray.store, null, 'no store');
    assert.strictEqual(recordArray.links, null, 'no links');
  });

  test('custom initial state', async function (assert) {
    let store = {};
    let recordArray = new AdapterPopulatedRecordArray({
      type: 'apple',
      isLoaded: true,
      identifiers: ['1'],
      store,
      query: 'some-query',
      links: 'foo',
    });
    assert.true(recordArray.isLoaded);
    assert.false(recordArray.isUpdating);
    assert.strictEqual(recordArray.modelName, 'apple');
    assert.deepEqual(recordArray[SOURCE].slice(), ['1']);
    assert.strictEqual(recordArray.store, store);
    assert.strictEqual(recordArray.query, 'some-query');
    assert.strictEqual(recordArray.links, 'foo');
  });

  testInDebug('#replace() throws error', function (assert) {
    let recordArray = new AdapterPopulatedRecordArray({ type: 'recordType', identifiers: [] });

    assert.throws(
      () => {
        recordArray.replace();
      },
      Error('Assertion Failed: Mutating this array of records via splice is not allowed.'),
      'throws error'
    );
    assert.expectDeprecation({ id: 'ember-data:deprecate-array-like' });
  });

  test('#update uses _update enabling query specific behavior', async function (assert) {
    let queryCalled = 0;
    let deferred = RSVP.defer();

    const store = {
      query(modelName, query, options) {
        queryCalled++;
        assert.strictEqual(modelName, 'recordType');
        assert.strictEqual(query, 'some-query');
        assert.strictEqual(options._recordArray, recordArray);

        return deferred.promise;
      },
    };

    let recordArray = new AdapterPopulatedRecordArray({
      type: 'recordType',
      store,
      identifiers: [],
      isLoaded: true,
      query: 'some-query',
    });

    assert.false(recordArray.isUpdating, 'should not yet be updating');

    assert.strictEqual(queryCalled, 0);

    let updateResult = recordArray.update();

    assert.strictEqual(queryCalled, 1);
    const expectedResult = [];
    deferred.resolve(expectedResult);

    assert.true(recordArray.isUpdating, 'should be updating');

    const result = await updateResult;
    assert.strictEqual(result, expectedResult);
    assert.false(recordArray.isUpdating, 'should no longer be updating');
  });

  skip('change events when receiving a new query payload', async function (assert) {
    assert.expect(29);

    let arrayDidChange = 0;
    let contentDidChange = 0;

    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    let manager = new RecordArrayManager({
      store,
    });
    let recordArray = new AdapterPopulatedRecordArray({
      query: 'some-query',
      manager,
      identifiers: [],
      store,
    });

    let model1 = {
      type: 'tag',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };
    let model2 = {
      type: 'tag',
      id: '2',
      attributes: {
        name: 'Scumbag Katz',
      },
    };

    let results = store._push({
      data: [model1, model2],
    });

    store.recordArrayManager.populateManagedArray(recordArray, results, {});

    assert.deepEqual(
      recordArray.map((x) => x.name),
      ['Scumbag Dale', 'Scumbag Katz']
    );

    assert.strictEqual(arrayDidChange, 0, 'array should not yet have emitted a change event');
    assert.strictEqual(contentDidChange, 0, 'recordArray.content should not have changed');

    recordArray.addObserver('content', function () {
      contentDidChange++;
    });

    recordArray.one('@array:change', function (array, startIdx, removeAmt, addAmt) {
      arrayDidChange++;

      // first time invoked
      assert.strictEqual(array, recordArray, 'should be same record array as above');
      assert.strictEqual(startIdx, 0, 'expected startIdx');
      assert.strictEqual(removeAmt, 2, 'expected removeAmt');
      assert.strictEqual(addAmt, 2, 'expected addAmt');
    });

    assert.true(recordArray.isLoaded, 'should be considered loaded');
    assert.false(recordArray.isUpdating, 'should not yet be updating');

    assert.strictEqual(arrayDidChange, 0);
    assert.strictEqual(contentDidChange, 0, 'recordArray.content should not have changed');

    arrayDidChange = 0;
    contentDidChange = 0;

    let model3 = {
      type: 'tag',
      id: '3',
      attributes: {
        name: 'Scumbag Penner',
      },
    };
    let model4 = {
      type: 'tag',
      id: '4',
      attributes: {
        name: 'Scumbag Hamilton',
      },
    };

    results = store._push({
      data: [model3, model4],
    });

    store.recordArrayManager.populateManagedArray(recordArray, results, {});

    assert.true(recordArray.isLoaded, 'should be considered loaded');
    assert.false(recordArray.isUpdating, 'should no longer be updating');

    assert.strictEqual(arrayDidChange, 1, 'record array should have omitted ONE change event');
    assert.strictEqual(contentDidChange, 0, 'recordArray.content should not have changed');

    assert.deepEqual(
      recordArray.map((x) => x.name),
      ['Scumbag Penner', 'Scumbag Hamilton']
    );

    arrayDidChange = 0; // reset change event counter
    contentDidChange = 0; // reset change event counter

    recordArray.one('@array:change', function (array, startIdx, removeAmt, addAmt) {
      arrayDidChange++;

      assert.strictEqual(array, recordArray, 'should be same recordArray as above');
      assert.strictEqual(startIdx, 0, 'expected startIdx');
      assert.strictEqual(removeAmt, 2, 'expected removeAmt');
      assert.strictEqual(addAmt, 1, 'expected addAmt');
    });

    // re-query
    assert.true(recordArray.isLoaded, 'should be considered loaded');
    assert.false(recordArray.isUpdating, 'should not yet be updating');

    assert.strictEqual(arrayDidChange, 0, 'record array should not yet have omitted a change event');
    assert.strictEqual(contentDidChange, 0, 'recordArray.content should not have changed');

    let model5 = {
      type: 'tag',
      id: '5',
      attributes: {
        name: 'Scumbag Penner',
      },
    };

    results = store._push({
      data: model5,
    });

    store.recordArrayManager.populateManagedArray(recordArray, [results], {});

    assert.true(recordArray.isLoaded, 'should be considered loaded');
    assert.false(recordArray.isUpdating, 'should not longer be updating');

    assert.strictEqual(arrayDidChange, 1, 'record array should have emitted one change event');
    assert.strictEqual(contentDidChange, 0, 'recordArray.content should not have changed');

    assert.deepEqual(
      recordArray.map((x) => x.name),
      ['Scumbag Penner']
    );
  });
});
