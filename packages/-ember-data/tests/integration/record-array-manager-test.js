import { A } from '@ember/array';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { gte } from 'ember-compatibility-helpers';
import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';

let store, manager;

class Person extends Model {
  @attr()
  name;

  @hasMany('car', { async: false })
  cars;
}

class Car extends Model {
  @attr()
  make;

  @attr()
  model;

  @belongsTo('person', { async: false })
  person;
}

module('integration/record_array_manager', function (hooks) {
  setupTest(hooks);
  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('adapter:application', RESTAdapter);
    owner.register('model:car', Car);
    owner.register('model:person', Person);

    store = owner.lookup('service:store');
    manager = store.recordArrayManager;
  });

  function tap(obj, methodName, callback) {
    let old = obj[methodName];

    let summary = { called: [] };

    obj[methodName] = function () {
      let result = old.apply(obj, arguments);
      if (callback) {
        callback.apply(obj, arguments);
      }
      summary.called.push(arguments);
      return result;
    };

    return summary;
  }

  test('destroying the store correctly cleans everything up', async function (assert) {
    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini Cooper',
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' },
          },
        },
      },
    });

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
        relationships: {
          cars: {
            data: [{ type: 'car', id: '1' }],
          },
        },
      },
    });

    let all = store.peekAll('person');
    let query = {};
    let adapterPopulated = manager.createAdapterPopulatedRecordArray('person', query);
    let allSummary = tap(all, 'willDestroy');
    let adapterPopulatedSummary = tap(adapterPopulated, 'willDestroy');
    let identifier = recordIdentifierFor(person);

    assert.strictEqual(allSummary.called.length, 0, 'initial: no calls to all.willDestroy');
    assert.strictEqual(adapterPopulatedSummary.called.length, 0, 'initial: no calls to adapterPopulated.willDestroy');
    assert.strictEqual(
      manager.getRecordArraysForIdentifier(identifier).size,
      1,
      'initial: expected the person to be a member of 1 recordArrays'
    );
    assert.true('person' in manager._liveRecordArrays, 'initial: we have a live array for person');

    all.destroy();
    await settled();

    assert.strictEqual(
      manager.getRecordArraysForIdentifier(identifier).size,
      0,
      'expected the person to be a member of no recordArrays'
    );
    assert.strictEqual(allSummary.called.length, 1, 'all.willDestroy called once');
    assert.false('person' in manager._liveRecordArrays, 'no longer have a live array for person');

    manager.destroy();
    await settled();

    assert.strictEqual(
      manager.getRecordArraysForIdentifier(identifier).size,
      0,
      'expected the person to be a member of no recordArrays'
    );
    assert.strictEqual(allSummary.called.length, 1, 'all.willDestroy still only called once');
    assert.strictEqual(adapterPopulatedSummary.called.length, 1, 'adapterPopulated.willDestroy called once');
  });

  if (!gte('4.0.0')) {
    test('batch liveRecordArray changes', async function (assert) {
      let cars = store.peekAll('car');
      let arrayContentWillChangeCount = 0;

      cars.arrayContentWillChange = function (startIndex, removeCount, addedCount) {
        arrayContentWillChangeCount++;
        assert.strictEqual(startIndex, 0, 'expected 0 startIndex');
        assert.strictEqual(removeCount, 0, 'expected 0 removed');
        assert.strictEqual(addedCount, 2, 'expected 2 added');
      };

      assert.deepEqual(cars.toArray(), []);
      assert.strictEqual(arrayContentWillChangeCount, 0, 'expected NO arrayChangeEvents yet');

      store.push({
        data: [
          {
            type: 'car',
            id: '1',
            attributes: {
              make: 'BMC',
              model: 'Mini Cooper',
            },
          },
          {
            type: 'car',
            id: '2',
            attributes: {
              make: 'Jeep',
              model: 'Wrangler',
            },
          },
        ],
      });
      await settled();

      assert.strictEqual(arrayContentWillChangeCount, 1, 'expected ONE array change event');

      assert.deepEqual(cars.toArray(), [store.peekRecord('car', 1), store.peekRecord('car', 2)]);

      store.peekRecord('car', 1).set('model', 'Mini');

      assert.strictEqual(arrayContentWillChangeCount, 1, 'expected ONE array change event');

      cars.arrayContentWillChange = function (startIndex, removeCount, addedCount) {
        arrayContentWillChangeCount++;
        assert.strictEqual(startIndex, 2, 'expected a start index of TWO');
        assert.strictEqual(removeCount, 0, 'expected no removes');
        assert.strictEqual(addedCount, 1, 'expected ONE add');
      };

      arrayContentWillChangeCount = 0;

      store.push({
        data: [
          {
            type: 'car',
            id: 2, // this ID is already present, array wont need to change
            attributes: {
              make: 'Tesla',
              model: 'S',
            },
          },
        ],
      });
      await settled();

      assert.strictEqual(arrayContentWillChangeCount, 0, 'expected NO array change events');

      store.push({
        data: [
          {
            type: 'car',
            id: 3,
            attributes: {
              make: 'Tesla',
              model: 'S',
            },
          },
        ],
      });
      await settled();

      assert.strictEqual(arrayContentWillChangeCount, 1, 'expected ONE array change event');
      // reset function so it doesn't execute after test finishes and store is torn down
      cars.arrayContentWillChange = function () {};
    });
  }

  test('#GH-4041 store#query AdapterPopulatedRecordArrays are removed from their managers instead of retained when #destroy is called', async function (assert) {
    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'Honda',
          model: 'fit',
        },
      },
    });

    const query = {};

    let adapterPopulated = manager.createAdapterPopulatedRecordArray('car', query);

    adapterPopulated.destroy();
    await settled();

    assert.strictEqual(manager._adapterPopulatedRecordArrays.length, 0);
  });

  test('createRecordArray', function (assert) {
    let recordArray = manager.createRecordArray('foo');

    assert.strictEqual(recordArray.modelName, 'foo');
    assert.true(recordArray.isLoaded);
    assert.strictEqual(recordArray.manager, manager);
    assert.deepEqual(recordArray.content, []);
    assert.deepEqual(recordArray.toArray(), []);
  });

  test('createRecordArray with optional content', function (assert) {
    let record = store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini Cooper',
        },
      },
    });
    let content = A([recordIdentifierFor(record)]);

    let recordArray = manager.createRecordArray('foo', content);

    assert.strictEqual(recordArray.modelName, 'foo', 'has modelName');
    assert.true(recordArray.isLoaded, 'isLoaded is true');
    assert.strictEqual(recordArray.manager, manager, 'recordArray has manager');
    assert.deepEqual(recordArray.content, [recordIdentifierFor(record)], 'recordArray has content');
    assert.deepEqual(recordArray.toArray(), [record], 'toArray works');
  });

  test('liveRecordArrayFor always return the same array for a given type', function (assert) {
    assert.strictEqual(manager.liveRecordArrayFor('foo'), manager.liveRecordArrayFor('foo'));
  });

  test('liveRecordArrayFor create with content', function (assert) {
    assert.expect(6);

    let createRecordArrayCalled = 0;
    let superCreateRecordArray = manager.createRecordArray;

    manager.createRecordArray = function (modelName, identifiers) {
      createRecordArrayCalled++;
      assert.strictEqual(modelName, 'car');
      assert.strictEqual(identifiers.length, 1);
      assert.strictEqual(identifiers[0].id, '1');
      return superCreateRecordArray.apply(this, arguments);
    };

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini Cooper',
        },
      },
    });

    assert.strictEqual(createRecordArrayCalled, 0, 'no record array has been created yet');
    manager.liveRecordArrayFor('car');
    assert.strictEqual(createRecordArrayCalled, 1, 'one record array is created');
    manager.liveRecordArrayFor('car');
    assert.strictEqual(createRecordArrayCalled, 1, 'no new record array is created');
  });
});
