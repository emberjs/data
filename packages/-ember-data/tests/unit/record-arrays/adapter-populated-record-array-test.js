import { A } from '@ember/array';
import Evented from '@ember/object/evented';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import RSVP from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { DEPRECATE_EVENTED_API_USAGE } from '@ember-data/private-build-infra/deprecations';
import { recordIdentifierFor } from '@ember-data/store';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

const { AdapterPopulatedRecordArray, RecordArrayManager } = DS;

class Tag extends Model {
  @attr()
  name;
}

module('unit/record-arrays/adapter-populated-record-array - DS.AdapterPopulatedRecordArray', function (hooks) {
  setupTest(hooks);

  test('default initial state', async function (assert) {
    let recordArray = AdapterPopulatedRecordArray.create({ modelName: 'recordType' });

    assert.false(recordArray.get('isLoaded'), 'expected isLoaded to be false');
    assert.equal(recordArray.get('modelName'), 'recordType', 'has modelName');
    assert.deepEqual(recordArray.get('content'), [], 'has no content');
    assert.strictEqual(recordArray.get('query'), null, 'no query');
    assert.strictEqual(recordArray.get('store'), null, 'no store');
    assert.strictEqual(recordArray.get('links'), null, 'no links');
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
    assert.true(recordArray.get('isLoaded'));
    assert.false(recordArray.get('isUpdating'));
    assert.equal(recordArray.get('modelName'), 'apple');
    assert.deepEqual(recordArray.get('content'), content);
    assert.equal(recordArray.get('store'), store);
    assert.equal(recordArray.get('query'), 'some-query');
    assert.strictEqual(recordArray.get('links'), 'foo');
  });

  testInDebug('cannot set isUpdating in init', async function (assert) {
    try {
      AdapterPopulatedRecordArray.create({
        isUpdating: true,
        modelName: 'apple',
        isLoaded: true,
        content: A(),
        store: {},
        query: 'some-query',
        links: 'foo',
      });
      assert.ok(false, 'we should have erred but did not');
    } catch (e) {
      assert.strictEqual(
        e.message,
        'Assertion Failed: Cannot initialize AdapterPopulatedRecordArray with isUpdating',
        'we errored appropriately'
      );
    }
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
      _query(modelName, query, array) {
        queryCalled++;
        assert.equal(modelName, 'recordType');
        assert.equal(query, 'some-query');
        assert.equal(array, recordArray);

        return deferred.promise;
      },
    };

    let recordArray = AdapterPopulatedRecordArray.create({
      modelName: 'recordType',
      store,
      query: 'some-query',
    });

    assert.false(recordArray.isUpdating, 'should not yet be updating');

    assert.equal(queryCalled, 0);

    let updateResult = recordArray.update();

    assert.equal(queryCalled, 1);

    deferred.resolve(['return value']);

    assert.true(recordArray.isUpdating, 'should be updating');

    let result = await updateResult;
    assert.deepEqual(result, ['return value']);
    assert.false(recordArray.isUpdating, 'should no longer be updating');
  });

  // TODO: is this method required, i suspect store._query should be refactor so this is not needed
  test('#_setIdentifiers', async function (assert) {
    let didAddRecord = 0;
    function add(array) {
      didAddRecord++;
      assert.equal(array, recordArray);
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

    assert.equal(didAddRecord, 0, 'no records should have been added yet');

    let didLoad = 0;
    if (DEPRECATE_EVENTED_API_USAGE) {
      recordArray.on('didLoad', function () {
        didLoad++;
      });
    }

    let links = { foo: 1 };
    let meta = { bar: 2 };

    let result = recordArray._setIdentifiers([identifier1, identifier2], {
      links,
      meta,
    });

    assert.equal(result, undefined, '_setIdentifiers should have no return value');

    assert.equal(didAddRecord, 2, 'two records should have been added');

    assert.deepEqual(recordArray.toArray(), [record1, record2], 'should now contain the loaded records by identifier');

    if (DEPRECATE_EVENTED_API_USAGE) {
      assert.equal(didLoad, 0, 'didLoad event should not have fired');
    }
    assert.equal(recordArray.get('links').foo, 1, 'has links');
    assert.equal(recordArray.get('meta').bar, 2, 'has meta');

    await settled();

    if (DEPRECATE_EVENTED_API_USAGE) {
      assert.equal(didLoad, 1, 'didLoad event should have fired once');
    }
    assert.expectDeprecation({
      id: 'ember-data:evented-api-usage',
    });
  });

  test('change events when receiving a new query payload', async function (assert) {
    assert.expect(38);

    let arrayDidChange = 0;
    let contentDidChange = 0;
    let didAddRecord = 0;

    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    function add(array) {
      didAddRecord++;
      assert.equal(array, recordArray);
    }

    function del(array) {
      assert.equal(array, recordArray);
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

    assert.equal(didAddRecord, 2, 'expected 2 didAddRecords');
    assert.deepEqual(
      recordArray.map((x) => x.name),
      ['Scumbag Dale', 'Scumbag Katz']
    );

    assert.equal(arrayDidChange, 0, 'array should not yet have emitted a change event');
    assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

    recordArray.addObserver('content', function () {
      contentDidChange++;
    });

    recordArray.one('@array:change', function (array, startIdx, removeAmt, addAmt) {
      arrayDidChange++;

      // first time invoked
      assert.equal(array, recordArray, 'should be same record array as above');
      assert.equal(startIdx, 0, 'expected startIdx');
      assert.equal(removeAmt, 2, 'expected removeAmt');
      assert.equal(addAmt, 2, 'expected addAmt');
    });

    assert.true(recordArray.get('isLoaded'), 'should be considered loaded');
    assert.false(recordArray.get('isUpdating'), 'should not yet be updating');

    assert.equal(arrayDidChange, 0);
    assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

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

    assert.equal(didAddRecord, 2, 'expected 2 didAddRecords');
    assert.true(recordArray.get('isLoaded'), 'should be considered loaded');
    assert.false(recordArray.get('isUpdating'), 'should no longer be updating');

    assert.equal(arrayDidChange, 1, 'record array should have omitted ONE change event');
    assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

    assert.deepEqual(
      recordArray.map((x) => x.name),
      ['Scumbag Penner', 'Scumbag Hamilton']
    );

    arrayDidChange = 0; // reset change event counter
    contentDidChange = 0; // reset change event counter
    didAddRecord = 0;

    recordArray.one('@array:change', function (array, startIdx, removeAmt, addAmt) {
      arrayDidChange++;

      assert.equal(array, recordArray, 'should be same recordArray as above');
      assert.equal(startIdx, 0, 'expected startIdx');
      assert.equal(removeAmt, 2, 'expected removeAmt');
      assert.equal(addAmt, 1, 'expected addAmt');
    });

    // re-query
    assert.true(recordArray.get('isLoaded'), 'should be considered loaded');
    assert.false(recordArray.get('isUpdating'), 'should not yet be updating');

    assert.equal(arrayDidChange, 0, 'record array should not yet have omitted a change event');
    assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

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

    assert.equal(didAddRecord, 1, 'expected 0 didAddRecord');

    assert.true(recordArray.get('isLoaded'), 'should be considered loaded');
    assert.false(recordArray.get('isUpdating'), 'should not longer be updating');

    assert.equal(arrayDidChange, 1, 'record array should have emitted one change event');
    assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');

    assert.deepEqual(
      recordArray.map((x) => x.name),
      ['Scumbag Penner']
    );
    assert.expectDeprecation({
      id: 'ember-data:evented-api-usage',
      count: 1,
    });
  });
});
