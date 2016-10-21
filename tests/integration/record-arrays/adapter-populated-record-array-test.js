import {setupStore, createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

let store;
const { run, RSVP: { Promise } } = Ember;

const Person = DS.Model.extend({
  name: DS.attr('string')
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
    .createAdapterPopulatedRecordArray(store.modelFor('person'), null);

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
    let records = store.push(payload);
    recordArray.loadRecords(records, payload);
  });

  assert.equal(recordArray.get('length'), 3, "expected recordArray to contain exactly 3 records");

  run(() => recordArray.get('firstObject').destroyRecord());

  assert.equal(recordArray.get('length'), 2, "expected recordArray to contain exactly 2 records");
});

test('stores the metadata off the payload', function(assert) {
  let recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray(store.modelFor('person'), null);

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
    let records = store.push(payload);
    recordArray.loadRecords(records, payload);
  });

  assert.equal(recordArray.get('meta.foo'), 'bar', 'expected meta.foo to be bar from payload');
});

test('stores the links off the payload', function(assert) {
  let recordArray = store.recordArrayManager
      .createAdapterPopulatedRecordArray(store.modelFor('person'), null);

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
    let records = store.push(payload);
    recordArray.loadRecords(records, payload);
  });

  assert.equal(recordArray.get('links.first'), '/foo?page=1', 'expected links.first to be "/foo?page=1" from payload');
});

test('recordArray.replace() throws error', function(assert) {
  let recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray(Person, null);

  assert.throws(() => {
    recordArray.replace();
  }, Error('The result of a server query (on (subclass of DS.Model)) is immutable.'), 'throws error');
});

test('when an adapter populated record gets updated the array contents are also updated', function(assert) {
  assert.expect(8);

  let filteredPromise, filteredArr, findPromise, findArray;
  let env = setupStore({ person: Person });
  let store = env.store;
  let array = [{ id: '1', name: 'Scumbag Dale' }];

  // resemble server side filtering
  env.adapter.query = function(store, type, query, recordArray) {
    return array.slice(query.slice);
  };

  // implement findAll to further test that query updates won't muddle
  // with the non-query record arrays
  env.adapter.findAll = function(store, type, sinceToken) {
    return array.slice(0);
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
    array.push({ id: '2', name: 'Scumbag Katz' });
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

test('batches adds/removals', function(assert) {
  assert.expect(23);

  let env = setupStore({ person: Person });
  let store = env.store;
  let query1 = {}

  let payload = [
    { id: '1', name: 'Scumbag Dale' },
    { id: '2', name: 'Scumbag Katz' }
  ];
  // resemble server side filtering
  env.adapter.query = function(store, type, query, recordArray) {
    return payload;
  };

  let result = Ember.run(() => {
    return store.query('person', query1);
  });

  let arrayDidChange = 0;
  let contentDidChange = 0;

  let lastRecordArray;
  return result.then(recordArray => {
    lastRecordArray = recordArray;
    assert.deepEqual(recordArray.map(x => x.get('name')), ['Scumbag Dale', 'Scumbag Katz']);

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

    // set next payload;
    payload = [
      { id: '3', name: 'Scumbag Penner' },
      { id: '4', name: 'Scumbag Hamilton' }
    ];

    return Ember.run(() => {
      // re-query
      let result = recordArray.update();
      assert.equal(arrayDidChange, 0);
      assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');
      return result;
    });
  }).then(recordArray => {
    assert.equal(arrayDidChange, 1, 'record array should have omitted ONE change event');
    assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');
    assert.equal(recordArray, lastRecordArray);

    lastRecordArray = recordArray;

    assert.deepEqual(recordArray.map(x => x.get('name')), ['Scumbag Penner', 'Scumbag Hamilton']);

    // set next payload;
    payload = [
      { id: '3', name: 'Scumbag Penner' }
    ];

    arrayDidChange = 0; // reset change event counter
    contentDidChange = 0; // reset change event counter

    recordArray.one('@array:change', function(array, startIdx, removeAmt, addAmt) {
      arrayDidChange++;

      // first time invoked
      assert.equal(array, recordArray, 'should be same recordArray as above');
      assert.equal(startIdx,  0, 'expected startIdx');
      assert.equal(removeAmt, 2, 'expcted removeAmt');
      assert.equal(addAmt,    1, 'expected addAmt');
    });

    return Ember.run(() => {
      // re-query
      let result = recordArray.update();
      assert.equal(arrayDidChange, 0, 'record array should not yet have omitted a change event');
      assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');
      return result;
    });
  }).then(recordArray => {
    assert.equal(arrayDidChange, 1, 'record array should have emitted one change event');
    assert.equal(contentDidChange, 0, 'recordArray.content should not have changed');
    assert.equal(recordArray, lastRecordArray);

    lastRecordArray = recordArray;

    assert.deepEqual(recordArray.map(x => x.get('name')), ['Scumbag Penner']);
  });
});
