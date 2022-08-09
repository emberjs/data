import { A } from '@ember/array';
import Evented from '@ember/object/evented';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import RSVP from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';

const { AdapterPopulatedRecordArray, RecordArrayManager } = DS;

class Tag extends Model {
  @attr()
  name;
}

module('unit/record-arrays/adapter-populated-record-array - DS.AdapterPopulatedRecordArray', function (hooks) {
  setupTest(hooks);

  test('default initial state', async function (assert) {
    let recordArray = AdapterPopulatedRecordArray.create({
      modelName: 'recordType',
      isLoaded: false,
      content: A(),
      store: null,
    });

    assert.false(recordArray.isLoaded, 'expected isLoaded to be false');
    assert.strictEqual(recordArray.modelName, 'recordType', 'has modelName');
    assert.deepEqual(recordArray.content, [], 'has no content');
    assert.strictEqual(recordArray.query, null, 'no query');
    assert.strictEqual(recordArray.store, null, 'no store');
    assert.strictEqual(recordArray.links, null, 'no links');
  });

  test('custom initial state', async function (assert) {
    let content = A([]);
    let store = {};
    let recordArray = AdapterPopulatedRecordArray.create({
      modelName: 'apple',
      isLoaded: true,
      content,
      store,
      query: 'some-query',
      links: 'foo',
    });
    assert.true(recordArray.isLoaded);
    assert.false(recordArray.isUpdating);
    assert.strictEqual(recordArray.modelName, 'apple');
    assert.deepEqual(recordArray.content, content);
    assert.strictEqual(recordArray.store, store);
    assert.strictEqual(recordArray.query, 'some-query');
    assert.strictEqual(recordArray.links, 'foo');
  });

  test('#replace() throws error', function (assert) {
    let recordArray = AdapterPopulatedRecordArray.create({ modelName: 'recordType' });

    assert.throws(
      () => {
        recordArray.replace();
      },
      Error('The result of a server query (on recordType) is immutable.'),
      'throws error'
    );
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

    let recordArray = AdapterPopulatedRecordArray.create({
      modelName: 'recordType',
      store,
      content: A(),
      isLoaded: true,
      query: 'some-query',
    });

    assert.false(recordArray.isUpdating, 'should not yet be updating');

    assert.strictEqual(queryCalled, 0);

    let updateResult = recordArray.update();

    assert.strictEqual(queryCalled, 1);
    const expectedResult = A();
    deferred.resolve(expectedResult);

    assert.true(recordArray.isUpdating, 'should be updating');

    const result = await updateResult;
    assert.strictEqual(result, expectedResult);
    assert.false(recordArray.isUpdating, 'should no longer be updating');
  });

  // TODO: is this method required, i suspect store._query should be refactor so this is not needed
  test('#_setIdentifiers', async function (assert) {
    let didAddRecord = 0;
    function add(array) {
      didAddRecord++;
      assert.strictEqual(array, recordArray);
    }

    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    const set = new Set();
    set.add = add;
    let manager = new RecordArrayManager({
      store,
    });
    manager.getRecordArraysForIdentifier = () => {
      return set;
    };

    let recordArray = AdapterPopulatedRecordArray.create({
      query: 'some-query',
      manager,
      content: A(),
      store,
    });

    let model1 = {
      type: 'tag',
      id: '1',
    };
    let model2 = {
      type: 'tag',
      id: '2',
    };

    let [record1, record2] = store.push({
      data: [model1, model2],
    });

    let identifier1 = recordIdentifierFor(record1);
    let identifier2 = recordIdentifierFor(record2);

    assert.strictEqual(didAddRecord, 0, 'no records should have been added yet');

    let links = { foo: 1 };
    let meta = { bar: 2 };

    let result = recordArray._setIdentifiers([identifier1, identifier2], {
      links,
      meta,
    });

    assert.strictEqual(result, undefined, '_setIdentifiers should have no return value');

    assert.strictEqual(didAddRecord, 2, 'two records should have been added');

    assert.deepEqual(recordArray.toArray(), [record1, record2], 'should now contain the loaded records by identifier');
    assert.strictEqual(recordArray.links.foo, 1, 'has links');
    assert.strictEqual(recordArray.meta.bar, 2, 'has meta');

    await settled();
  });

  test('change events when receiving a new query payload', async function (assert) {
    assert.expect(37);

    let arrayDidChange = 0;
    let contentDidChange = 0;
    let didAddRecord = 0;

    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    function add(array) {
      didAddRecord++;
      assert.strictEqual(array, recordArray);
    }

    function del(array) {
      assert.strictEqual(array, recordArray);
    }

    const set = new Set();
    set.add = add;
    set.delete = del;
    let manager = new RecordArrayManager({
      store,
    });
    manager.getRecordArraysForIdentifier = () => {
      return set;
    };
    let recordArray = AdapterPopulatedRecordArray.extend(Evented).create({
      query: 'some-query',
      manager,
      content: A(),
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

    let [record1, record2] = store.push({
      data: [model1, model2],
    });

    recordArray._setIdentifiers([recordIdentifierFor(record1), recordIdentifierFor(record2)], {});

    assert.strictEqual(didAddRecord, 2, 'expected 2 didAddRecords');
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
    didAddRecord = 0;

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

    let [record3, record4] = store.push({
      data: [model3, model4],
    });

    recordArray._setIdentifiers([recordIdentifierFor(record3), recordIdentifierFor(record4)], {});

    assert.strictEqual(didAddRecord, 2, 'expected 2 didAddRecords');
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
    didAddRecord = 0;

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

    let record5 = store.push({
      data: model5,
    });

    recordArray._setIdentifiers([recordIdentifierFor(record5)], {});

    assert.strictEqual(didAddRecord, 1, 'expected 0 didAddRecord');

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
