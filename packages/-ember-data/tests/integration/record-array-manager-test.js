import { A } from '@ember/array';
import OrderedSet from '@ember/ordered-set';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import { RECORD_ARRAY_MANAGER_IDENTIFIERS } from '@ember-data/canary-features';
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

module('integration/record_array_manager', function(hooks) {
  setupTest(hooks);
  hooks.beforeEach(function() {
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

    obj[methodName] = function() {
      let result = old.apply(obj, arguments);
      if (callback) {
        callback.apply(obj, arguments);
      }
      summary.called.push(arguments);
      return result;
    };

    return summary;
  }

  test('destroying the store correctly cleans everything up', async function(assert) {
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
    let internalPersonModel = person._internalModel;

    assert.equal(allSummary.called.length, 0, 'initial: no calls to all.willDestroy');
    assert.equal(adapterPopulatedSummary.called.length, 0, 'initial: no calls to adapterPopulated.willDestroy');
    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      assert.equal(
        manager.getRecordArraysForIdentifier(internalPersonModel.identifier).size,
        1,
        'initial: expected the person to be a member of 1 recordArrays'
      );
    } else {
      assert.equal(
        internalPersonModel._recordArrays.size,
        1,
        'initial: expected the person to be a member of 1 recordArrays'
      );
    }
    assert.equal('person' in manager._liveRecordArrays, true, 'initial: we have a live array for person');

    all.destroy();
    await settled();

    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      assert.equal(
        manager.getRecordArraysForIdentifier(internalPersonModel.identifier).size,
        0,
        'expected the person to be a member of no recordArrays'
      );
    } else {
      assert.equal(internalPersonModel._recordArrays.size, 0, 'expected the person to be a member of no recordArrays');
    }
    assert.equal(allSummary.called.length, 1, 'all.willDestroy called once');
    assert.equal('person' in manager._liveRecordArrays, false, 'no longer have a live array for person');

    manager.destroy();
    await settled();

    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      assert.equal(
        manager.getRecordArraysForIdentifier(internalPersonModel.identifier).size,
        0,
        'expected the person to be a member of no recordArrays'
      );
    } else {
      assert.equal(internalPersonModel._recordArrays.size, 0, 'expected the person to be a member of no recordArrays');
    }
    assert.equal(allSummary.called.length, 1, 'all.willDestroy still only called once');
    assert.equal(adapterPopulatedSummary.called.length, 1, 'adapterPopulated.willDestroy called once');
  });

  test('batch liveRecordArray changes', async function(assert) {
    let cars = store.peekAll('car');
    let arrayContentWillChangeCount = 0;

    cars.arrayContentWillChange = function(startIndex, removeCount, addedCount) {
      arrayContentWillChangeCount++;
      assert.equal(startIndex, 0, 'expected 0 startIndex');
      assert.equal(removeCount, 0, 'expected 0 removed');
      assert.equal(addedCount, 2, 'expected 2 added');
    };

    assert.deepEqual(cars.toArray(), []);
    assert.equal(arrayContentWillChangeCount, 0, 'expected NO arrayChangeEvents yet');

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

    assert.equal(arrayContentWillChangeCount, 1, 'expected ONE array change event');

    assert.deepEqual(cars.toArray(), [store.peekRecord('car', 1), store.peekRecord('car', 2)]);

    store.peekRecord('car', 1).set('model', 'Mini');

    assert.equal(arrayContentWillChangeCount, 1, 'expected ONE array change event');

    cars.arrayContentWillChange = function(startIndex, removeCount, addedCount) {
      arrayContentWillChangeCount++;
      assert.equal(startIndex, 2, 'expected a start index of TWO');
      assert.equal(removeCount, 0, 'expected no removes');
      assert.equal(addedCount, 1, 'expected ONE add');
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

    assert.equal(arrayContentWillChangeCount, 0, 'expected NO array change events');

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

    assert.equal(arrayContentWillChangeCount, 1, 'expected ONE array change event');
    // reset function so it doesn't execute after test finishes and store is torn down
    cars.arrayContentWillChange = function() {};
  });

  test('#GH-4041 store#query AdapterPopulatedRecordArrays are removed from their managers instead of retained when #destroy is called', async function(assert) {
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

    assert.equal(manager._adapterPopulatedRecordArrays.length, 0);
  });

  test('createRecordArray', function(assert) {
    let recordArray = manager.createRecordArray('foo');

    assert.equal(recordArray.modelName, 'foo');
    assert.equal(recordArray.isLoaded, true);
    assert.equal(recordArray.manager, manager);
    assert.deepEqual(recordArray.get('content'), []);
    assert.deepEqual(recordArray.toArray(), []);
  });

  test('createRecordArray with optional content', function(assert) {
    let content;
    let record;
    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      record = store.push({
        data: {
          type: 'car',
          id: '1',
          attributes: {
            make: 'BMC',
            model: 'Mini Cooper',
          },
        },
      });
      content = A([recordIdentifierFor(record)]);
    } else {
      let internalModel = {
        _recordArrays: new OrderedSet(),
        getRecord() {
          return record;
        },
      };

      content = A([internalModel]);
    }

    let recordArray = manager.createRecordArray('foo', content);

    assert.equal(recordArray.modelName, 'foo', 'has modelName');
    assert.equal(recordArray.isLoaded, true, 'isLoaded is true');
    assert.equal(recordArray.manager, manager, 'recordArray has manager');
    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      assert.deepEqual(recordArray.get('content'), [recordIdentifierFor(record)], 'recordArray has content');
    } else {
      assert.equal(recordArray.get('content'), content);
    }
    assert.deepEqual(recordArray.toArray(), [record], 'toArray works');
  });

  test('liveRecordArrayFor always return the same array for a given type', function(assert) {
    assert.equal(manager.liveRecordArrayFor('foo'), manager.liveRecordArrayFor('foo'));
  });

  test('liveRecordArrayFor create with content', function(assert) {
    assert.expect(6);

    let createRecordArrayCalled = 0;
    let superCreateRecordArray = manager.createRecordArray;

    manager.createRecordArray = function(modelName, internalModels) {
      createRecordArrayCalled++;
      assert.equal(modelName, 'car');
      assert.equal(internalModels.length, 1);
      assert.equal(internalModels[0].id, 1);
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

    assert.equal(createRecordArrayCalled, 0, 'no record array has been created yet');
    manager.liveRecordArrayFor('car');
    assert.equal(createRecordArrayCalled, 1, 'one record array is created');
    manager.liveRecordArrayFor('car');
    assert.equal(createRecordArrayCalled, 1, 'no new record array is created');
  });
});
