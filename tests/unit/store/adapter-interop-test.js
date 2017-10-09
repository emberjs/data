import { A } from '@ember/array';
import {
  resolve,
  all,
  Promise as EmberPromise
} from 'rsvp';
import { set, get } from '@ember/object';
import { run } from '@ember/runloop';
import { createStore } from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';

import DS from 'ember-data';

let TestAdapter, store, oldFilterEnabled;

module('unit/store/adapter-interop - DS.Store working with a DS.Adapter', {
  beforeEach() {
    TestAdapter = DS.Adapter.extend();
    oldFilterEnabled = Ember.ENV.ENABLE_DS_FILTER;
    Ember.ENV.ENABLE_DS_FILTER = false;
  },

  afterEach() {
    run(() => {
      if (store) { store.destroy(); }
      Ember.ENV.ENABLE_DS_FILTER = oldFilterEnabled;
    });
  }
});

test('Adapter can be set as a factory', function(assert) {
  store = createStore({ adapter: TestAdapter });

  assert.ok(store.get('defaultAdapter') instanceof TestAdapter);
});

test('Adapter can be set as a name', function(assert) {
  store = createStore({ adapter: '-rest' });

  assert.ok(store.get('defaultAdapter') instanceof DS.RESTAdapter);
});

testInDebug('Adapter can not be set as an instance', function(assert) {
  assert.expect(1);

  store = DS.Store.create({
    adapter: DS.Adapter.create()
  });
  assert.expectAssertion(() => store.get('defaultAdapter'));
});

test('Calling Store#find invokes its adapter#find', function(assert) {
  assert.expect(5);

  let currentStore;
  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.ok(true, "Adapter#find was called");
      assert.equal(store, currentStore, "Adapter#find was called with the right store");
      assert.equal(type, store.modelFor('test'), "Adapter#find was called with the type passed into Store#find");
      assert.equal(id, 1, "Adapter#find was called with the id passed into Store#find");
      assert.equal(snapshot.id, '1', "Adapter#find was called with the record created from Store#find");

      return resolve({
        data: {
          id: 1,
          type: 'test'
        }
      });
    }
  });

  const Type = DS.Model.extend();

  currentStore = createStore({
    adapter: Adapter,
    test: Type
  });

  return run(() => currentStore.findRecord('test', 1));
});

test('Calling Store#findRecord multiple times coalesces the calls into a adapter#findMany call', function(assert) {
  assert.expect(2);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.ok(false, 'Adapter#findRecord was not called');
    },
    findMany(store, type, ids, snapshots) {
      assert.ok(true, 'Adapter#findMany was called');
      assert.deepEqual(ids, ['1','2'], 'Correct ids were passed in to findMany');
      return resolve({ data: [{ id: 1, type: 'test' }, { id: 2, type: 'test' }] });
    },
    coalesceFindRequests: true
  });

  const Type = DS.Model.extend();
  let store = createStore({
    adapter: Adapter,
    test: Type
  });

  return run(() => {
    return all([
      store.findRecord('test', 1),
      store.findRecord('test', 2)
    ]);
  });
});

test('Returning a promise from `findRecord` asynchronously loads data', function(assert) {
  assert.expect(1);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      return resolve({ data: { id: 1, type: 'test', attributes: { name: "Scumbag Dale" } } });
    }
  });

  const Type = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({
    adapter: Adapter,
    test: Type
  });

  return run(() => {
    return store.findRecord('test', 1).then(object => {
      assert.strictEqual(get(object, 'name'), 'Scumbag Dale', 'the data was pushed');
    });
  });
});

test('IDs provided as numbers are coerced to strings', function(assert) {
  assert.expect(5);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(typeof id, 'string', 'id has been normalized to a string');
      return resolve({ data: { id, type: 'test', attributes: { name: 'Scumbag Sylvain' } } });
    }
  });

  const Type = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({
    adapter: Adapter,
    test: Type
  });

  return run(() => {
    return store.findRecord('test', 1).then(object => {
      assert.equal(typeof object.get('id'), 'string', 'id was coerced to a string');
      run(() => {
        store.push({
          data: {
            type: 'test',
            id: '2',
            attributes: {
              name: 'Scumbag Sam Saffron'
            }
          }
        });
      });

      return store.findRecord('test', 2);
    }).then(object =>  {
      assert.ok(object, 'object was found');
      assert.equal(typeof object.get('id'), 'string', 'id is a string despite being supplied and searched for as a number');
    });
  });
});

test('can load data for the same record if it is not dirty', function(assert) {
  assert.expect(3);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({
    person: Person,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord() {
        return false;
      }
    })
  });

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom Dale"
        }
      }
    });

    return store.findRecord('person', 1).then(tom => {
      assert.equal(get(tom, 'hasDirtyAttributes'), false, 'precond - record is not dirty');
      assert.equal(get(tom, 'name'), 'Tom Dale', 'returns the correct name');

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Captain Underpants'
          }
        }
      });
      assert.equal(get(tom, 'name'), 'Captain Underpants', 'updated record with new date');
    });
  });
});

test('loadMany takes an optional Object and passes it on to the Adapter', function(assert) {
  assert.expect(2);

  let passedQuery = { page: 1 };

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const Adapter = TestAdapter.extend({
    query(store, type, query) {
      assert.equal(type, store.modelFor('person'), 'The type was Person');
      assert.equal(query, passedQuery, 'The query was passed in');
      return resolve({ data: [] });
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });

  run(() => store.query('person', passedQuery));
});

test('Find with query calls the correct normalizeResponse', function(assert) {
  let passedQuery = { page: 1 };

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const Adapter = TestAdapter.extend({
    query(store, type, query) {
      return resolve([]);
    }
  });

  let callCount = 0;

  const ApplicationSerializer = DS.JSONSerializer.extend({
    normalizeQueryResponse() {
      callCount++;
      return this._super(...arguments);
    }
  });

  let env = setupStore({
    adapter: Adapter,
    person: Person
  });

  let { store } = env;

  env.registry.register('serializer:application', ApplicationSerializer);

  run(() => store.query('person', passedQuery));
  assert.equal(callCount, 1, 'normalizeQueryResponse was called');
});

test('peekAll(type) returns a record array of all records of a specific type', function(assert) {
  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({
    person: Person
  });

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom Dale"
        }
      }
    });
  });

  let results = store.peekAll('person');

  assert.equal(get(results, 'length'), 1, 'record array should have the original object');
  assert.equal(get(results.objectAt(0), 'name'), 'Tom Dale', 'record has the correct information');

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Yehuda Katz'
        }
      }
    });
  });

  assert.equal(get(results, 'length'), 2, 'record array should have the new object');
  assert.equal(get(results.objectAt(1), 'name'), 'Yehuda Katz', 'record has the correct information');

  assert.strictEqual(results, store.peekAll('person'), 'subsequent calls to peekAll return the same recordArray)');
});

test('a new record of a particular type is created via store.createRecord(type)', function(assert) {
  const Person = DS.Model.extend({
    name: DS.attr('string')
  });
  let store = createStore({
    person: Person
  });

  let person = run(() => store.createRecord('person'));

  assert.equal(get(person, 'isLoaded'), true, 'A newly created record is loaded');
  assert.equal(get(person, 'isNew'), true, 'A newly created record is new');
  assert.equal(get(person, 'hasDirtyAttributes'), true, 'A newly created record is dirty');

  run(() => set(person, 'name', 'Braaahm Dale'));

  assert.equal(get(person, 'name'), 'Braaahm Dale', 'Even if no hash is supplied, `set` still worked');
});

testInDebug("a new record with a specific id can't be created if this id is already used in the store", function(assert) {
  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  Person.reopenClass({
    toString() {
      return 'Person';
    }
  });

  let store = createStore({
    person: Person
  });

  run(() => store.createRecord('person', { id: 5 }));

  assert.expectAssertion(() => {
    run(() => {
      store.createRecord('person', { id: 5 });
    });
  }, /The id 5 has already been used with another record for modelClass 'person'/);
});

test('an initial data hash can be provided via store.createRecord(type, hash)', function(assert) {
  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({
    person: Person
  });

  let person = run(() => store.createRecord('person', { name: 'Brohuda Katz' }));

  assert.equal(get(person, 'isLoaded'), true, 'A newly created record is loaded');
  assert.equal(get(person, 'isNew'), true, 'A newly created record is new');
  assert.equal(get(person, 'hasDirtyAttributes'), true, 'A newly created record is dirty');

  assert.equal(get(person, 'name'), 'Brohuda Katz', 'The initial data hash is provided');
});

test("if an id is supplied in the initial data hash, it can be looked up using `store.find`", function(assert) {
  assert.expect(1);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({
    person: Person,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord: () => false
    })
  });

  return run(() => {
    let person = store.createRecord('person', { id: 1, name: 'Brohuda Katz' });

    return store.findRecord('person', 1).then(again => {
      assert.strictEqual(person, again, 'the store returns the loaded object');
    });
  });
});

test("initial values of attributes can be passed in as the third argument to find", function(assert) {
  assert.expect(1);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.attr('name'), 'Test', 'Preloaded attribtue set');
      return { data: { id: '1', type: 'test', attributes: { name: 'Test' } } };
    }
  });

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({
    adapter: Adapter,
    test: Person
  });

  return run(() => store.findRecord('test', 1, { preload: { name: 'Test' } }));
});

test('initial values of belongsTo can be passed in as the third argument to find as records', function(assert) {
  assert.expect(1);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.belongsTo('friend').attr('name'), 'Tom', 'Preloaded belongsTo set');
      return { data: { id, type: 'person' } };
    }
  });

  let env = setupStore({
    adapter: Adapter
  });

  let { store } = env;

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    friend: DS.belongsTo('person', { inverse: null, async: true })
  });

  env.registry.register('model:person', Person);

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Tom'
        }
      }
    });

    let tom = store.peekRecord('person', 2);
    return store.findRecord('person', 1, { preload: { friend: tom } });
  });
});

test('initial values of belongsTo can be passed in as the third argument to find as ids', function(assert) {
  assert.expect(1);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      return { data: { id, type: 'person' } };
    }
  });

  let env = setupStore({
    adapter: Adapter

  });
  let { store } = env;

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    friend: DS.belongsTo('person', { async: true, inverse: null })
  });

  env.registry.register('model:person', Person);

  return run(() => {
    return store.findRecord('person', 1, { preload: { friend: 2 } }).then(() => {
      return store.peekRecord('person', 1).get('friend').then(friend => {
        assert.equal(friend.get('id'), '2', 'Preloaded belongsTo set');
      });
    });
  });
});

test('initial values of hasMany can be passed in as the third argument to find as records', function(assert) {
  assert.expect(1);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.hasMany('friends')[0].attr('name'), 'Tom', 'Preloaded hasMany set');
      return { data: { id, type: 'person' } };
    }
  });

  let env = setupStore({
    adapter: Adapter
  });

  let { store } = env;

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    friends: DS.hasMany('person', { inverse: null, async: true })
  });

  env.registry.register('model:person', Person);

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Tom'
        }
      }
    });

    let tom = store.peekRecord('person', 2);
    return store.findRecord('person', 1, { preload: { friends: [tom] } });
  });
});

test('initial values of hasMany can be passed in as the third argument to find as ids', function(assert) {
  assert.expect(1);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.hasMany('friends')[0].id, '2', 'Preloaded hasMany set');
      return { data: { id, type: 'person' } };
    }
  });

  let env = setupStore({
    adapter: Adapter
  });
  let { store } = env;

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    friends: DS.hasMany('person', { async: true, inverse: null })
  });

  env.registry.register('model:person', Person);

  return run(() => store.findRecord('person', 1, { preload: { friends: [2] } }));
});

test('initial empty values of hasMany can be passed in as the third argument to find as records', function(assert) {
  assert.expect(1);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.hasMany('friends').length, 0, 'Preloaded hasMany set');
      return { data: { id, type: 'person' } };
    }
  });

  let env = setupStore({
    adapter: Adapter
  });

  let { store } = env;

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    friends: DS.hasMany('person', { inverse: null, async: true })
  });

  env.registry.register('model:person', Person);

  return run(() => {
    return store.findRecord('person', 1, { preload: { friends: [] } });
  });
});

test('initial values of hasMany can be passed in as the third argument to find as ids', function(assert) {
  assert.expect(1);

  const Adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.hasMany('friends').length, 0, 'Preloaded hasMany set');
      return { data: { id, type: 'person' } };
    }
  });

  let env = setupStore({
    adapter: Adapter
  });
  let { store } = env;

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    friends: DS.hasMany('person', { async: true, inverse: null })
  });

  env.registry.register('model:person', Person);

  return run(() => store.findRecord('person', 1, { preload: { friends: [] } }));
});

test('records should have their ids updated when the adapter returns the id data', function(assert) {
  assert.expect(2);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let idCounter = 1;
  const Adapter = TestAdapter.extend({
    createRecord(store, type, snapshot) {
      return {
        data: {
          id: idCounter++,
          type: 'person',
          attributes: {
            name: snapshot.attr('name')
          }
        }
      };
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });

  let people = store.peekAll('person');
  let tom, yehuda;

  run(() => {
    tom = store.createRecord('person', { name: 'Tom Dale' });
    yehuda = store.createRecord('person', { name: 'Yehuda Katz' });
  });

  return run(() => {
    return all([
      tom.save(),
      yehuda.save()
    ]).then(() => {
      people.forEach((person, index) => {
        assert.equal(person.get('id'), index + 1, `The record's id should be correct.`);
      });
    });
  });
});

test('store.fetchMany should always return a promise', function(assert) {
  assert.expect(3);

  const Person = DS.Model.extend();
  let store = createStore({
    adapter: TestAdapter.extend(),
    person: Person
  });

  run(() => store.createRecord('person'));

  let records = [];
  let results = run(() => store._scheduleFetchMany(records));

  assert.ok(results, 'A call to store._scheduleFetchMany() should return a result');
  assert.ok(results.then, 'A call to store._scheduleFetchMany() should return a promise');

  return results.then(returnedRecords => {
    assert.deepEqual(returnedRecords, [], 'The correct records are returned');
  });
});

test('store._scheduleFetchMany should not resolve until all the records are resolved', function(assert) {
  assert.expect(1);

  const Person = DS.Model.extend();
  const Phone = DS.Model.extend();

  const adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      let record = { id, type: type.modelName };

      return new EmberPromise(resolve => {
        run.later(() => resolve({ data: record }), 5);
      });
    },

    findMany(store, type, ids, snapshots) {
      let records = ids.map(id => ( { id, type: type.modelName }) );

      return new EmberPromise(resolve => {
        run.later(() => {
          resolve({data: records });
        }, 15);
      });
    }
  });

  let store = createStore({
    adapter: adapter,
    test: Person,
    phone: Phone
  });

  run(() => store.createRecord('test'));

  let internalModels = [
    store._internalModelForId('test', 10),
    store._internalModelForId('phone', 20),
    store._internalModelForId('phone', 21)
  ];

  return run(() => {
    return store._scheduleFetchMany(internalModels).then(() => {
      let unloadedRecords = A(internalModels.map(r => r.getRecord())).filterBy('isEmpty');

      assert.equal(get(unloadedRecords, 'length'), 0, 'All unloaded records should be loaded');
    });
  });
});

test('the store calls adapter.findMany according to groupings returned by adapter.groupRecordsForFindMany', function(assert) {
  assert.expect(3);

  const Person = DS.Model.extend();

  const Adapter = TestAdapter.extend({
    groupRecordsForFindMany(store, snapshots) {
      return [
        [snapshots[0]],
        [snapshots[1], snapshots[2]]
      ];
    },

    findRecord(store, type, id, snapshot) {
      assert.equal(id, '10', 'The first group is passed to find');
      return { data: { id, type: 'test' } };
    },

    findMany(store, type, ids, snapshots) {
      let records = ids.map(id => ({ id, type: 'test' }));

      assert.deepEqual(ids, ['20', '21'], 'The second group is passed to findMany');

      return { data: records };
    }
  });

  let store = createStore({
    adapter: Adapter,
    test: Person
  });

  let internalModels = [
    store._internalModelForId('test', 10),
    store._internalModelForId('test', 20),
    store._internalModelForId('test', 21)
  ];

  return run(() => {
    return store._scheduleFetchMany(internalModels).then(() => {
      let ids = internalModels.map(x => x.id )
      assert.deepEqual(ids, ['10', '20', '21'], 'The promise fulfills with the records');
    });
  });
});

test('the promise returned by `_scheduleFetch`, when it resolves, does not depend on the promises returned to other calls to `_scheduleFetch` that are in the same run loop, but different groups', function(assert) {
  assert.expect(2);

  let davidResolved = false;

  const Person = DS.Model.extend();
  const Adapter = TestAdapter.extend({
    groupRecordsForFindMany(store, snapshots) {
      return [
        [snapshots[0]],
        [snapshots[1]]
      ];
    },

    findRecord(store, type, id, snapshot) {
      let record = { id, type: 'test' };

      return new EmberPromise(function(resolve, reject) {
        if (id === 'igor') {
          resolve({ data: record });
        } else {
          run.later(function () {
            davidResolved = true;
            resolve({ data: record });
          }, 5);
        }
      });
    }
  });

  let store = createStore({
    adapter: Adapter,
    test: Person
  });

  return run(() => {
    let david = store.findRecord('test', 'david');
    let igor = store.findRecord('test', 'igor');
    let wait = [];

    wait.push(igor.then(() => {
      assert.equal(davidResolved, false, 'Igor did not need to wait for David');
    }));

    wait.push(david.then(() => {
      assert.equal(davidResolved, true, 'David resolved');
    }));

    return all(wait);
  });
});

test('the promise returned by `_scheduleFetch`, when it rejects, does not depend on the promises returned to other calls to `_scheduleFetch` that are in the same run loop, but different groups', function(assert) {
  assert.expect(2);

  let davidResolved = false;

  const Person = DS.Model.extend();
  const Adapter = TestAdapter.extend({
    groupRecordsForFindMany(store, snapshots) {
      return [
        [snapshots[0]],
        [snapshots[1]]
      ];
    },

    findRecord(store, type, id, snapshot) {
      let record = { id, type: 'test' };

      return new EmberPromise((resolve, reject) => {
        if (id === 'igor') {
          reject({ data: record });
        } else {
          run.later(() => {
            davidResolved = true;
            resolve({ data: record });
          }, 5);
        }
      });
    }
  });

  let store = createStore({
    adapter: Adapter,
    test: Person
  });

  return run(() => {
    let david = store.findRecord('test', 'david');
    let igor = store.findRecord('test', 'igor');
    let wait = [];

    wait.push(igor.catch(() => {
      assert.equal(davidResolved, false, 'Igor did not need to wait for David');
    }));

    wait.push(david.then(() => {
      assert.equal(davidResolved, true, 'David resolved');
    }));

    return EmberPromise.all(wait);
  });
});

testInDebug('store._fetchRecord reject records that were not found, even when those requests were coalesced with records that were found', function(assert) {
  assert.expect(3);

  const Person = DS.Model.extend();

  const Adapter = TestAdapter.extend({
    findMany(store, type, ids, snapshots) {
      let records = ids.map((id) => ({ id, type: 'test' }));
      return { data: [records[0]] };
    }
  });

  let store = createStore({
    adapter: Adapter,
    test: Person
  });

  let wait = [];
  assert.expectWarning(() => {
    run(() => {
      let david = store.findRecord('test', 'david');
      let igor = store.findRecord('test', 'igor');

      wait.push(david.then(() => assert.ok(true, 'David resolved')));
      wait.push(igor.catch(() => assert.ok(true, 'Igor rejected')));
    });
  }, /expected to find records with the following ids/);

  return EmberPromise.all(wait);
});

testInDebug('store._fetchRecord warns when records are missing', function(assert) {
  const Person = DS.Model.extend();

  const Adapter = TestAdapter.extend({
    findMany(store, type, ids, snapshots) {
      let records = ids.map(id => ({ id, type: 'test' })).filter(({ id }) => id === 'david');

      return {data: [records[0]] };
    }
  });

  let store = createStore({
    adapter: Adapter,
    test: Person
  });

  let wait = [];
  let igorDidReject = true;

  assert.expectWarning(() => {
    run(() => {
      wait.push(store.findRecord('test', 'david'));
      wait.push(store.findRecord('test', 'igor').catch(e => {
        igorDidReject = true;
        assert.equal(e.message, `Expected: '<test:igor>' to be present in the adapter provided payload, but it was not found.`);
      }));
    });
  }, /expected to find records with the following ids in the adapter response but they were missing/);

  return EmberPromise.all(wait).then(() => {
    assert.ok(igorDidReject, 'expected rejection that <test:igor> could not be found in the payload, but no such rejection occured');
  });
});

test('store should not call shouldReloadRecord when the record is not in the store', function(assert) {
  assert.expect(1);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldReloadRecord(store, type, id, snapshot) {
      assert.ok(false, 'shouldReloadRecord should not be called when the record is not loaded');
      return false;
    },
    findRecord() {
      assert.ok(true, 'find is always called when the record is not in the store');
      return { data: { id: 1, type: 'person' } };
    }
  });

  let store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  return run(() => store.findRecord('person', 1));
});

test('store should not reload record when shouldReloadRecord returns false', function(assert) {
  assert.expect(1);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldReloadRecord(store, type, id, snapshot) {
      assert.ok(true, 'shouldReloadRecord should be called when the record is in the store');
      return false;
    },
    shouldBackgroundReloadRecord() {
      return false;
    },
    findRecord() {
      assert.ok(false, 'find should not be called when shouldReloadRecord returns false');
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });

    return store.findRecord('person', 1);
  });
});

test('store should reload record when shouldReloadRecord returns true', function(assert) {
  assert.expect(3);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldReloadRecord(store, type, id, snapshot) {
      assert.ok(true, 'shouldReloadRecord should be called when the record is in the store');
      return true;
    },
    findRecord() {
      assert.ok(true, 'find should not be called when shouldReloadRecord returns false');
      return { data: { id: 1, type: 'person', attributes: { name: 'Tom' } } };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });

    return store.findRecord('person', 1).then(record => {
      assert.equal(record.get('name'), 'Tom');
    });
  });
});

test('store should not call shouldBackgroundReloadRecord when the store is already loading the record', function(assert) {
  assert.expect(2);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldReloadRecord(store, type, id, snapshot) {
      return true;
    },
    shouldBackgroundReloadRecord(store, type, id, snapshot) {
      assert.ok(false, 'shouldBackgroundReloadRecord is not called when shouldReloadRecord returns true');
    },
    findRecord() {
      assert.ok(true, 'find should be called');
      return { data: { id: 1, type: 'person', attributes: { name: 'Tom' } } };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });

    return store.findRecord('person', 1).then(record => {
      assert.equal(record.get('name'), 'Tom');
    });
  });
});

test('store should not reload a record when `shouldBackgroundReloadRecord` is false', function(assert) {
  assert.expect(2);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldBackgroundReloadRecord(store, type, id, snapshot) {
      assert.ok(true, 'shouldBackgroundReloadRecord is called when record is loaded form the cache');
      return false;
    },
    findRecord() {
      assert.ok(false, 'find should not be called');
      return { data: { id: 1, type: 'person', attributes: { name: 'Tom' } } };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });

    return store.findRecord('person', 1).then(record => {
      assert.equal(record.get('name'), undefined);
    });
  });
});


test('store should reload the record in the background when `shouldBackgroundReloadRecord` is true', function(assert) {
  assert.expect(4);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldBackgroundReloadRecord(store, type, id, snapshot) {
      assert.ok(true, 'shouldBackgroundReloadRecord is called when record is loaded form the cache');
      return true;
    },
    findRecord() {
      assert.ok(true, 'find should not be called');
      return { data: { id: 1, type: 'person', attributes: { name: 'Tom' } } };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  let done = run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });

    return store.findRecord('person', 1).then(record => {
      assert.equal(record.get('name'), undefined);
    });
  });

  assert.equal(store.peekRecord('person', 1).get('name'), 'Tom');

  return done;
});

test('store should not reload record array when shouldReloadAll returns false', function(assert) {
  assert.expect(1);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldReloadAll(store, snapshot) {
      assert.ok(true, 'shouldReloadAll should be called when the record is in the store');
      return false;
    },
    shouldBackgroundReloadAll(store, snapshot) {
      return false;
    },
    findAll() {
      assert.ok(false, 'findAll should not be called when shouldReloadAll returns false');
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  return run(() => store.findAll('person'));
});

test('store should reload all records when shouldReloadAll returns true', function(assert) {
  assert.expect(3);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldReloadAll(store, type, id, snapshot) {
      assert.ok(true, 'shouldReloadAll should be called when the record is in the store');
      return true;
    },
    findAll() {
      assert.ok(true, 'findAll should be called when shouldReloadAll returns true');
      return { data: [{ id: 1, type: 'person', attributes: { name: 'Tom' } }]};
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  return run(() => {
    return store.findAll('person').then(records => {
      assert.equal(records.get('firstObject.name'), 'Tom');
    });
  });
});

test('store should not call shouldBackgroundReloadAll when the store is already loading all records', function(assert) {
  assert.expect(2);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldReloadAll(store, type, id, snapshot) {
      return true;
    },
    shouldBackgroundReloadAll(store, type, id, snapshot) {
      assert.ok(false, 'shouldBackgroundReloadRecord is not called when shouldReloadRecord returns true');
    },
    findAll() {
      assert.ok(true, 'find should be called');
      return { data: [{ id: 1, type: 'person', attributes: { name: 'Tom' } }]};
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  return run(() => {
    return store.findAll('person').then(records => {
      assert.equal(records.get('firstObject.name'), 'Tom');
    });
  });
});

test('store should not reload all records when `shouldBackgroundReloadAll` is false', function(assert) {
  assert.expect(3);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldReloadAll(store, type, id, snapshot) {
      assert.ok(true, 'shouldReloadAll is called when record is loaded form the cache');
      return false;
    },
    shouldBackgroundReloadAll(store, type, id, snapshot) {
      assert.ok(true, 'shouldBackgroundReloadAll is called when record is loaded form the cache');
      return false;
    },
    findAll() {
      assert.ok(false, 'findAll should not be called');
      return { data: [{ id: 1, type: 'person', attributes: { name: 'Tom' } }] };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  return run(() => {
    return store.findAll('person').then(records => {
      assert.equal(records.get('firstObject'), undefined);
    });
  });
});


test('store should reload all records in the background when `shouldBackgroundReloadAll` is true', function(assert) {
  assert.expect(5);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  const TestAdapter = DS.Adapter.extend({
    shouldReloadAll() {
      assert.ok(true, 'shouldReloadAll is called');
      return false;
    },
    shouldBackgroundReloadAll(store, snapshot) {
      assert.ok(true, 'shouldBackgroundReloadAll is called when record is loaded form the cache');
      return true;
    },
    findAll() {
      assert.ok(true, 'find should not be called');
      return { data: [{ id: 1, type: 'person', attributes: { name: 'Tom' } }] };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  let done = run(() => {
    return store.findAll('person').then(records => {
      assert.equal(records.get('firstObject.name'), undefined);
    });
  });

  assert.equal(store.peekRecord('person', 1).get('name'), 'Tom');

  return done;
});

testInDebug('store should assert of the user tries to call store.filter', function(assert) {
  assert.expect(1);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store = createStore({
    person: Person
  });

  assert.expectAssertion(() => {
    run(() => store.filter('person', {}));
  }, /The filter API has been moved to a plugin/);
});

testInDebug("Calling adapterFor with a model class should assert", function(assert) {
  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store = createStore({
    person: Person
  });

  assert.expectAssertion(() => {
    store.adapterFor(Person);
  }, /Passing classes to store.adapterFor has been removed/);
});
