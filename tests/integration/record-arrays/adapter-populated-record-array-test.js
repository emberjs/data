import { run } from '@ember/runloop';
import { Promise } from 'rsvp';
import { setupStore, createStore } from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

let store;

const Person = DS.Model.extend({
  name: DS.attr('string'),
  toString() {
    return `<Person#${this.get('id')}>`;
  }
});


const adapter = DS.Adapter.extend({
  deleteRecord() {
    return Promise.resolve();
  }
});

module('integration/record-arrays/adapter_populated_record_array - DS.AdapterPopulatedRecordArray', {
  beforeEach() {
    store = createStore({
      adapter: adapter,
      person: Person
    });
  }
});

test('when a record is deleted in an adapter populated record array, it should be removed', function(assert) {
  let recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray('person', null);

  let payload = {
    data: [
      {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale'
        }
      },
      {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Scumbag Katz'
        }
      },
      {
        type: 'person',
        id: '3',
        attributes: {
          name: 'Scumbag Bryn'
        }
      }
    ]
  };

  run(() => {
    recordArray._setInternalModels(store._push(payload), payload);
  });

  assert.equal(recordArray.get('length'), 3, "expected recordArray to contain exactly 3 records");

  run(() => recordArray.get('firstObject').destroyRecord());

  assert.equal(recordArray.get('length'), 2, "expected recordArray to contain exactly 2 records");
});

test('stores the metadata off the payload', function(assert) {
  let recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray('person', null);

  let payload = {
    data: [
      {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale'
        }
      },
      {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Scumbag Katz'
        }
      },
      {
        type: 'person',
        id: '3',
        attributes: {
          name: 'Scumbag Bryn'
        }
      }
    ],
    meta: {
      foo: 'bar'
    }
  };

  run(() => {
    recordArray._setInternalModels(store._push(payload), payload);
  });

  assert.equal(recordArray.get('meta.foo'), 'bar', 'expected meta.foo to be bar from payload');
});

test('stores the links off the payload', function(assert) {
  let recordArray = store.recordArrayManager
      .createAdapterPopulatedRecordArray('person', null);

  let payload = {
    data: [
      {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale'
        }
      },
      {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Scumbag Katz'
        }
      },
      {
        type: 'person',
        id: '3',
        attributes: {
          name: 'Scumbag Bryn'
        }
      }
    ],
    links: {
      first: '/foo?page=1'
    }
  };

  run(() => {
    recordArray._setInternalModels(store._push(payload), payload);
  });

  assert.equal(recordArray.get('links.first'), '/foo?page=1', 'expected links.first to be "/foo?page=1" from payload');
});

test('recordArray.replace() throws error', function(assert) {
  let recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray('person', null);

  assert.throws(() => {
    recordArray.replace();
  }, Error('The result of a server query (on person) is immutable.'), 'throws error');
});

test('pass record array to adapter.query based on arity', function(assert) {
  let env = setupStore({ person: Person });
  let store = env.store;

  let payload = {
    data: [
      { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
      { id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } }
    ]
  };

  env.adapter.query = function(store, type, query) {
    assert.equal(arguments.length, 3);
    return payload;
  };

  return store.query('person', { }).then(recordArray => {
    env.adapter.query = function(store, type, query, _recordArray) {
      assert.equal(arguments.length, 4);
      return payload;
    };
    return store.query('person', { });
  });
});

test('pass record array to adapter.query based on arity', function(assert) {
  let env = setupStore({ person: Person });
  let store = env.store;

  let payload = {
    data: [
      { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
      { id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } }
    ]
  };

  let actualQuery = { };

  let superCreateAdapterPopulatedRecordArray = store.recordArrayManager.createAdapterPopulatedRecordArray;

  store.recordArrayManager.createStore = function(modelName, query, internalModels, _payload) {
    assert.equal(arguments.length === 4);

    assert.equal(modelName, 'person');
    assert.equal(query, actualQuery);
    assert.equal(_payload, payload);
    assert.equal(internalModels.length, 2);
    return superCreateAdapterPopulatedRecordArray.apply(this, arguments);
  };

  env.adapter.query = function(store, type, query) {
    assert.equal(arguments.length, 3);
    return payload;
  };

  return store.query('person', actualQuery).then(recordArray => {
    env.adapter.query = function(store, type, query, _recordArray) {
      assert.equal(arguments.length, 4);
      return payload;
    };

    store.recordArrayManager.createStore = function(modelName, query) {
      assert.equal(arguments.length === 2);

      assert.equal(modelName, 'person');
      assert.equal(query, actualQuery);
      return superCreateAdapterPopulatedRecordArray.apply(this, arguments);
    };

    return store.query('person', actualQuery);
  });
});

test('loadRecord re-syncs internalModels recordArrays', function(assert) {
  let env = setupStore({ person: Person });
  let store = env.store;

  let payload = {
    data: [
      { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
      { id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } }
    ]
  };

  env.adapter.query = function(store, type, query, recordArray) {
    return payload;
  };

  return store.query('person', { }).then(recordArray => {
    return recordArray.update().then(recordArray => {
      assert.deepEqual(recordArray.getEach('name'), ['Scumbag Dale', 'Scumbag Katz'], 'expected query to contain specific records');

      payload = {
        data: [
          { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
          { id: '3', type: 'person', attributes: { name: 'Scumbag Penner' } }
        ]
      };

      return recordArray.update();
    }).then(recordArray => {
      assert.deepEqual(recordArray.getEach('name'), ['Scumbag Dale', 'Scumbag Penner']);
    });
  });
});

test('when an adapter populated record gets updated the array contents are also updated', function(assert) {
  assert.expect(8);

  let filteredPromise, filteredArr, findPromise, findArray;
  let env = setupStore({ person: Person });
  let store = env.store;
  let array = [{ id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } }];

  // resemble server side filtering
  env.adapter.query = function(store, type, query, recordArray) {
    return { data: array.slice(query.slice) };
  };

  // implement findAll to further test that query updates won't muddle
  // with the non-query record arrays
  env.adapter.findAll = function(store, type, sinceToken) {
    return { data: array.slice(0) };
  };

  run(() => {
    filteredPromise = store.query('person', { slice: 1 });
    findPromise = store.findAll('person');

    // initialize adapter populated record array and assert initial state
    filteredPromise.then((_filteredArr) => {
      filteredArr = _filteredArr;
      assert.equal(filteredArr.get('length'), 0, 'No records for this query');
      assert.equal(filteredArr.get('isUpdating'), false, 'Record array isUpdating state updated');
    });

    // initialize a record collection array and assert initial state
    findPromise.then((_findArr) => {
      findArray = _findArr;
      assert.equal(findArray.get('length'), 1, 'All records are included in collection array');
    });
  });

  // a new element gets pushed in record array
  run(() => {
    array.push({ id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } });
    filteredArr.update().then(() => {
      assert.equal(filteredArr.get('length'), 1, 'The new record is returned and added in adapter populated array');
      assert.equal(filteredArr.get('isUpdating'), false, 'Record array isUpdating state updated');
      assert.equal(findArray.get('length'), 2);
    });
  });

  // element gets removed
  run(() => {
    array.pop(0);
    filteredArr.update().then(() => {
      assert.equal(filteredArr.get('length'), 0, 'Record removed from array');
      // record not removed from the model collection
      assert.equal(findArray.get('length'), 2, 'Record still remains in collection array');
    });
  });
});
