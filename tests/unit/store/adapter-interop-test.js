import {createStore} from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

var get = Ember.get;
var set = Ember.set;
var resolve = Ember.RSVP.resolve;
var TestAdapter, store, person, oldFilterEnabled;
var run = Ember.run;

module("unit/store/adapter-interop - DS.Store working with a DS.Adapter", {
  beforeEach() {
    TestAdapter = DS.Adapter.extend();
    oldFilterEnabled = Ember.ENV.ENABLE_DS_FILTER;
    Ember.ENV.ENABLE_DS_FILTER = false;
  },
  afterEach() {
    run(function() {
      if (store) { store.destroy(); }
      Ember.ENV.ENABLE_DS_FILTER = oldFilterEnabled;
    });
  }
});

test("Adapter can be set as a factory", function(assert) {
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

test("Calling Store#find invokes its adapter#find", function(assert) {
  assert.expect(5);
  let done = assert.async();

  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.ok(true, "Adapter#find was called");
      assert.equal(store, currentStore, "Adapter#find was called with the right store");
      assert.equal(type, store.modelFor('test'), "Adapter#find was called with the type passed into Store#find");
      assert.equal(id, 1, "Adapter#find was called with the id passed into Store#find");
      assert.equal(snapshot.id, '1', "Adapter#find was called with the record created from Store#find");

      return Ember.RSVP.resolve({ id: 1 });
    }
  });

  var currentType = DS.Model.extend();
  var currentStore = createStore({ adapter: adapter, test: currentType });


  run(function() {
    currentStore.findRecord('test', 1).finally(done);
  });
});

test("Calling Store#findRecord multiple times coalesces the calls into a adapter#findMany call", function(assert) {
  assert.expect(2);
  let done = assert.async();

  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.ok(false, "Adapter#findRecord was not called");
    },
    findMany(store, type, ids, snapshots) {
      assert.ok(true, "Adapter#findMany was called");
      assert.deepEqual(ids, ["1","2"], 'Correct ids were passed in to findMany');
      return Ember.RSVP.resolve([{ id: 1 }, { id: 2 }]);
    },
    coalesceFindRequests: true
  });

  var currentType = DS.Model.extend();
  var currentStore = createStore({ adapter: adapter, test: currentType });

  run(function() {
    let promises = [
      currentStore.findRecord('test', 1),
      currentStore.findRecord('test', 2)
    ];
    Ember.RSVP.all(promises).finally(done);
  });
});

test("Returning a promise from `findRecord` asynchronously loads data", function(assert) {
  assert.expect(1);

  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      return resolve({ id: 1, name: "Scumbag Dale" });
    }
  });

  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });
  var currentStore = createStore({ adapter: adapter, test: currentType });

  run(function() {
    currentStore.findRecord('test', 1).then(assert.wait(function(object) {
      assert.strictEqual(get(object, 'name'), "Scumbag Dale", "the data was pushed");
    }));
  });
});

test("IDs provided as numbers are coerced to strings", function(assert) {
  assert.expect(5);

  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(typeof id, 'string', "id has been normalized to a string");
      return resolve({ id, name: "Scumbag Sylvain" });
    }
  });

  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });
  var currentStore = createStore({ adapter: adapter, test: currentType });

  run(function() {
    currentStore.findRecord('test', 1).then(assert.wait(function(object) {
      assert.equal(typeof object.get('id'), 'string', "id was coerced to a string");
      run(function() {
        currentStore.push({
          data: {
            type: 'test',
            id: '2',
            attributes: {
              name: "Scumbag Sam Saffron"
            }
          }
        });
      });
      return currentStore.findRecord('test', 2);
    })).then(assert.wait(function(object) {
      assert.ok(object, "object was found");
      assert.equal(typeof object.get('id'), 'string', "id is a string despite being supplied and searched for as a number");
    }));
  });
});

test("can load data for the same record if it is not dirty", function(assert) {
  assert.expect(3);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({
    person: Person,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord: () => false
    })
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom Dale"
        }
      }
    });

    store.findRecord('person', 1).then(assert.wait(function(tom) {
      assert.equal(get(tom, 'hasDirtyAttributes'), false, "precond - record is not dirty");
      assert.equal(get(tom, 'name'), "Tom Dale", "returns the correct name");

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: "Captain Underpants"
          }
        }
      });
      assert.equal(get(tom, 'name'), "Captain Underpants", "updated record with new date");
    }));
  });
});

/*
test("DS.Store loads individual records without explicit IDs with a custom primaryKey", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({ name: DS.attr('string'), primaryKey: 'key' });

  store.load(Person, { key: 1, name: "Tom Dale" });

  var tom = store.findRecord(Person, 1);
  equal(get(tom, 'name'), "Tom Dale", "the person was successfully loaded for the given ID");
});
*/

test("loadMany takes an optional Object and passes it on to the Adapter", function(assert) {
  assert.expect(2);

  var passedQuery = { page: 1 };

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var adapter = TestAdapter.extend({
    query(store, type, query) {
      assert.equal(type, store.modelFor('person'), 'The type was Person');
      assert.equal(query, passedQuery, "The query was passed in");
      return Ember.RSVP.resolve([]);
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });

  run(function() {
    store.query('person', passedQuery);
  });
});

test("Find with query calls the correct normalizeResponse", function(assert) {
  var passedQuery = { page: 1 };

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var adapter = TestAdapter.extend({
    query(store, type, query) {
      return Ember.RSVP.resolve([]);
    }
  });

  var callCount = 0;

  var ApplicationSerializer = DS.JSONSerializer.extend({
    normalizeQueryResponse() {
      callCount++;
      return this._super(...arguments);
    }
  });

  var env = setupStore({
    adapter: adapter,
    person: Person
  });
  var store = env.store;

  env.registry.register('serializer:application', ApplicationSerializer);

  run(function() {
    store.query('person', passedQuery);
  });
  assert.equal(callCount, 1, 'normalizeQueryResponse was called');
});

test("peekAll(type) returns a record array of all records of a specific type", function(assert) {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({
    person: Person
  });

  run(function() {
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

  var results = store.peekAll('person');
  assert.equal(get(results, 'length'), 1, "record array should have the original object");
  assert.equal(get(results.objectAt(0), 'name'), "Tom Dale", "record has the correct information");

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: "Yehuda Katz"
        }
      }
    });
  });
  assert.equal(get(results, 'length'), 2, "record array should have the new object");
  assert.equal(get(results.objectAt(1), 'name'), "Yehuda Katz", "record has the correct information");

  assert.strictEqual(results, store.peekAll('person'), "subsequent calls to peekAll return the same recordArray)");
});

test("a new record of a particular type is created via store.createRecord(type)", function(assert) {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });
  var person;

  var store = createStore({
    person: Person
  });

  run(function() {
    person = store.createRecord('person');
  });

  assert.equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  assert.equal(get(person, 'isNew'), true, "A newly created record is new");
  assert.equal(get(person, 'hasDirtyAttributes'), true, "A newly created record is dirty");

  run(function() {
    set(person, 'name', "Braaahm Dale");
  });

  assert.equal(get(person, 'name'), "Braaahm Dale", "Even if no hash is supplied, `set` still worked");
});

testInDebug("a new record with a specific id can't be created if this id is already used in the store", function(assert) {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  Person.reopenClass({
    toString() {
      return 'Person';
    }
  });

  var store = createStore({
    person: Person
  });

  run(function() {
    store.createRecord('person', { id: 5 });
  });

  assert.expectAssertion(function() {
    run(function() {
      store.createRecord('person', { id: 5 });
    });
  }, /The id 5 has already been used with another record for modelClass 'person'/);
});

test("an initial data hash can be provided via store.createRecord(type, hash)", function(assert) {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({
    person: Person
  });

  run(function() {
    person = store.createRecord('person', { name: "Brohuda Katz" });
  });

  assert.equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  assert.equal(get(person, 'isNew'), true, "A newly created record is new");
  assert.equal(get(person, 'hasDirtyAttributes'), true, "A newly created record is dirty");

  assert.equal(get(person, 'name'), "Brohuda Katz", "The initial data hash is provided");
});

test("if an id is supplied in the initial data hash, it can be looked up using `store.find`", function(assert) {
  assert.expect(1);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });
  var store = createStore({
    person: Person,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord: () => false
    })
  });
  var person;

  run(function() {
    person = store.createRecord('person', { id: 1, name: "Brohuda Katz" });
    store.findRecord('person', 1).then(assert.wait(function(again) {
      assert.strictEqual(person, again, "the store returns the loaded object");
    }));
  });
});

test("initial values of attributes can be passed in as the third argument to find", function(assert) {
  assert.expect(1);

  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.attr('name'), 'Test', 'Preloaded attribtue set');
      return Ember.RSVP.resolve({ id: '1', name: 'Test' });
    }
  });

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({
    adapter: adapter,
    test: Person
  });

  run(function() {
    store.findRecord('test', 1, { preload: { name: 'Test' } });
  });
});

test("initial values of belongsTo can be passed in as the third argument to find as records", function(assert) {
  assert.expect(1);
  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.belongsTo('friend').attr('name'), 'Tom', 'Preloaded belongsTo set');
      return new Ember.RSVP.Promise(function() {});
    }
  });

  var env = setupStore({
    adapter: adapter
  });
  var store = env.store;

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    friend: DS.belongsTo('person', { inverse: null, async: true })
  });

  env.registry.register('model:person', Person);
  var tom;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Tom'
        }
      }
    });
    tom = store.peekRecord('person', 2);
    store.findRecord('person', 1, { preload: { friend: tom } });
  });
});

test("initial values of belongsTo can be passed in as the third argument to find as ids", function(assert) {
  assert.expect(1);

  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      return Ember.RSVP.Promise.resolve({ id: id });
    }
  });

  var env = setupStore({
    adapter: adapter
  });
  var store = env.store;

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    friend: DS.belongsTo('person', { async: true, inverse: null })
  });

  env.registry.register('model:person', Person);

  run(function() {
    store.findRecord('person', 1, { preload: { friend: 2 } }).then(assert.wait(function() {
      store.peekRecord('person', 1).get('friend').then(assert.wait(function(friend) {
        assert.equal(friend.get('id'), '2', 'Preloaded belongsTo set');
      }));
    }));
  });
});

test("initial values of hasMany can be passed in as the third argument to find as records", function(assert) {
  assert.expect(1);
  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.hasMany('friends')[0].attr('name'), 'Tom', 'Preloaded hasMany set');
      return new Ember.RSVP.Promise(function() {});
    }
  });

  var env = setupStore({
    adapter: adapter
  });
  var store = env.store;

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    friends: DS.hasMany('person', { inverse: null, async: true })
  });

  env.registry.register('model:person', Person);
  var tom;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Tom'
        }
      }
    });
    tom = store.peekRecord('person', 2);
    store.findRecord('person', 1, { preload: { friends: [tom] } });
  });
});

test("initial values of hasMany can be passed in as the third argument to find as ids", function(assert) {
  assert.expect(1);

  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      assert.equal(snapshot.hasMany('friends')[0].id, '2', 'Preloaded hasMany set');
      return Ember.RSVP.resolve({ id: id });
    }
  });

  var env = setupStore({
    adapter: adapter
  });
  var store = env.store;

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    friends: DS.hasMany('person', { async: true, inverse: null })
  });

  env.registry.register('model:person', Person);

  run(function() {
    store.findRecord('person', 1, { preload: { friends: [2] } });
  });
});

test("records should have their ids updated when the adapter returns the id data", function(assert) {
  assert.expect(2);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var idCounter = 1;
  var adapter = TestAdapter.extend({
    createRecord(store, type, snapshot) {
      return Ember.RSVP.resolve({ name: snapshot.attr('name'), id: idCounter++ });
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });

  var people = store.peekAll('person');
  var tom, yehuda;

  run(function() {
    tom = store.createRecord('person', { name: 'Tom Dale' });
    yehuda = store.createRecord('person', { name: 'Yehuda Katz' });
  });

  run(function() {
    Ember.RSVP.all([tom.save(), yehuda.save()]).then(assert.wait(function() {
      people.forEach(function(person, index) {
        assert.equal(person.get('id'), index + 1, "The record's id should be correct.");
      });
    }));
  });
});

test("store.fetchMany should always return a promise", function(assert) {
  assert.expect(3);

  var Person = DS.Model.extend();
  var store = createStore({
    adapter: TestAdapter.extend(),
    person: Person
  });
  run(function() {
    store.createRecord('person');
  });
  var records = [];
  var results;

  run(function() {
    results = store._scheduleFetchMany(records);
  });
  assert.ok(results, "A call to store._scheduleFetchMany() should return a result");
  assert.ok(results.then, "A call to store._scheduleFetchMany() should return a promise");

  results.then(assert.wait(function(returnedRecords) {
    assert.deepEqual(returnedRecords, [], "The correct records are returned");
  }));
});

test("store._scheduleFetchMany should not resolve until all the records are resolved", function(assert) {
  assert.expect(1);

  var Person = DS.Model.extend();
  var Phone = DS.Model.extend();

  var adapter = TestAdapter.extend({
    findRecord(store, type, id, snapshot) {
      var wait = 5;

      var record = { id: id };

      return new Ember.RSVP.Promise(function(resolve, reject) {
        run.later(function() {
          resolve(record);
        }, wait);
      });
    },

    findMany(store, type, ids, snapshots) {
      var wait = 15;

      var records = ids.map(function(id) {
        return { id: id };
      });

      return new Ember.RSVP.Promise(function(resolve, reject) {
        run.later(function() {
          resolve(records);
        }, wait);
      });
    }
  });

  var store = createStore({
    adapter: adapter,
    test: Person,
    phone: Phone
  });

  run(function() {
    store.createRecord('test');
  });

  let internalModels = [
    store._internalModelForId('test', 10),
    store._internalModelForId('phone', 20),
    store._internalModelForId('phone', 21)
  ];

  run(function() {
    store._scheduleFetchMany(internalModels).then(assert.wait(function() {
      var unloadedRecords = Ember.A(internalModels.map(r => r.record)).filterBy('isEmpty');

      assert.equal(get(unloadedRecords, 'length'), 0, 'All unloaded records should be loaded');
    }));
  });
});

test("the store calls adapter.findMany according to groupings returned by adapter.groupRecordsForFindMany", function(assert) {
  assert.expect(3);

  var Person = DS.Model.extend();

  var adapter = TestAdapter.extend({
    groupRecordsForFindMany(store, snapshots) {
      return [
        [snapshots[0]],
        [snapshots[1], snapshots[2]]
      ];
    },

    findRecord(store, type, id, snapshot) {
      assert.equal(id, "10", "The first group is passed to find");
      return Ember.RSVP.resolve({ id: id });
    },

    findMany(store, type, ids, snapshots) {
      var records = ids.map(function(id) {
        return { id: id };
      });

      assert.deepEqual(ids, ["20", "21"], "The second group is passed to findMany");

      return new Ember.RSVP.Promise(function(resolve, reject) {
        resolve(records);
      });
    }
  });

  var store = createStore({
    adapter: adapter,
    test: Person
  });

  var internalModels = [
    store._internalModelForId('test', 10),
    store._internalModelForId('test', 20),
    store._internalModelForId('test', 21)
  ];

  run(function() {
    store._scheduleFetchMany(internalModels).then(assert.wait(function() {
      var ids = Ember.A(internalModels).mapBy('id');
      assert.deepEqual(ids, ["10", "20", "21"], "The promise fulfills with the records");
    }));
  });
});

test("the promise returned by `_scheduleFetch`, when it resolves, does not depend on the promises returned to other calls to `_scheduleFetch` that are in the same run loop, but different groups", function(assert) {
  assert.expect(2);

  var Person = DS.Model.extend();
  var davidResolved = false;

  var adapter = TestAdapter.extend({
    groupRecordsForFindMany(store, snapshots) {
      return [
        [snapshots[0]],
        [snapshots[1]]
      ];
    },

    findRecord(store, type, id, snapshot) {
      var record = { id: id };

      return new Ember.RSVP.Promise(function(resolve, reject) {
        if (id === 'igor') {
          resolve(record);
        } else {
          run.later(function () {
            davidResolved = true;
            resolve(record);
          }, 5);
        }
      });
    }
  });

  var store = createStore({
    adapter: adapter,
    test: Person
  });

  run(function () {
    var davidPromise = store.findRecord('test', 'david');
    var igorPromise = store.findRecord('test', 'igor');

    igorPromise.then(assert.wait(function () {
      assert.equal(davidResolved, false, "Igor did not need to wait for David");
    }));

    davidPromise.then(assert.wait(function () {
      assert.equal(davidResolved, true, "David resolved");
    }));
  });
});

test("the promise returned by `_scheduleFetch`, when it rejects, does not depend on the promises returned to other calls to `_scheduleFetch` that are in the same run loop, but different groups", function(assert) {
  assert.expect(2);

  var Person = DS.Model.extend();
  var davidResolved = false;

  var adapter = TestAdapter.extend({
    groupRecordsForFindMany(store, snapshots) {
      return [
        [snapshots[0]],
        [snapshots[1]]
      ];
    },

    findRecord(store, type, id, snapshot) {
      var record = { id: id };

      return new Ember.RSVP.Promise(function(resolve, reject) {
        if (id === 'igor') {
          reject(record);
        } else {
          run.later(function () {
            davidResolved = true;
            resolve(record);
          }, 5);
        }
      });
    }
  });

  var store = createStore({
    adapter: adapter,
    test: Person
  });

  run(function () {
    var davidPromise = store.findRecord('test', 'david');
    var igorPromise = store.findRecord('test', 'igor');

    igorPromise.then(null, assert.wait(function () {
      assert.equal(davidResolved, false, "Igor did not need to wait for David");
    }));

    davidPromise.then(assert.wait(function () {
      assert.equal(davidResolved, true, "David resolved");
    }));
  });
});

testInDebug("store._fetchRecord reject records that were not found, even when those requests were coalesced with records that were found", function(assert) {
  assert.expect(3);

  var Person = DS.Model.extend();

  var adapter = TestAdapter.extend({
    findMany(store, type, ids, snapshots) {
      var records = ids.map(function(id) {
        return { id: id };
      });

      return new Ember.RSVP.Promise(function(resolve, reject) {
        resolve([
          records[0]
        ]);
      });
    }
  });

  var store = createStore({
    adapter: adapter,
    test: Person
  });

  assert.expectWarning(function() {
    run(function () {
      var davidPromise = store.findRecord('test', 'david');
      var igorPromise = store.findRecord('test', 'igor');

      davidPromise.then(function () {
        assert.ok(true, "David resolved");
      });

      igorPromise.then(null, function () {
        assert.ok(true, "Igor rejected");
      });
    });
  }, /expected to find records with the following ids/);
});

testInDebug("store._fetchRecord warns when records are missing", function(assert) {
  var Person = DS.Model.extend();

  var adapter = TestAdapter.extend({
    findMany(store, type, ids, snapshots) {
      var records = ids.map(function(id) {
        return { id: id };
      });

      return new Ember.RSVP.Promise(function(resolve, reject) {
        resolve([
          records[0]
        ]);
      });
    }
  });

  var store = createStore({
    adapter: adapter,
    test: Person
  });

  assert.expectWarning(function() {
    run(function () {
      store.findRecord('test', 'david');
      store.findRecord('test', 'igor');
    });
  }, /expected to find records with the following ids in the adapter response but they were missing/);
});

test("store should not call shouldReloadRecord when the record is not in the store", function(assert) {
  assert.expect(1);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
    shouldReloadRecord(store, type, id, snapshot) {
      assert.ok(false, 'shouldReloadRecord should not be called when the record is not loaded');
      return false;
    },
    findRecord() {
      assert.ok(true, 'find is always called when the record is not in the store');
      return { id: 1 };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.findRecord('person', 1);
  });
});

test("store should not reload record when shouldReloadRecord returns false", function(assert) {
  assert.expect(1);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
    shouldReloadRecord(store, type, id, snapshot) {
      assert.ok(true, 'shouldReloadRecord should be called when the record is in the store');
      return false;
    },
    shouldBackgroundReloadRecord: () => false,
    findRecord() {
      assert.ok(false, 'find should not be called when shouldReloadRecord returns false');
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
    store.findRecord('person', 1);
  });
});

test("store should reload record when shouldReloadRecord returns true", function(assert) {
  assert.expect(3);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
    shouldReloadRecord(store, type, id, snapshot) {
      assert.ok(true, 'shouldReloadRecord should be called when the record is in the store');
      return true;
    },
    findRecord() {
      assert.ok(true, 'find should not be called when shouldReloadRecord returns false');
      return { id: 1, name: 'Tom' };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
    store.findRecord('person', 1).then(function(record) {
      assert.equal(record.get('name'), 'Tom');
    });
  });
});

test("store should not call shouldBackgroundReloadRecord when the store is already loading the record", function(assert) {
  assert.expect(2);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
    shouldReloadRecord(store, type, id, snapshot) {
      return true;
    },
    shouldBackgroundReloadRecord(store, type, id, snapshot) {
      assert.ok(false, 'shouldBackgroundReloadRecord is not called when shouldReloadRecord returns true');
    },
    findRecord() {
      assert.ok(true, 'find should be called');
      return { id: 1, name: 'Tom' };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
    store.findRecord('person', 1).then(function(record) {
      assert.equal(record.get('name'), 'Tom');
    });
  });
});

test("store should not reload a record when `shouldBackgroundReloadRecord` is false", function(assert) {
  assert.expect(2);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
    shouldBackgroundReloadRecord(store, type, id, snapshot) {
      assert.ok(true, 'shouldBackgroundReloadRecord is called when record is loaded form the cache');
      return false;
    },
    findRecord() {
      assert.ok(false, 'find should not be called');
      return { id: 1, name: 'Tom' };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
    store.findRecord('person', 1).then(function(record) {
      assert.equal(record.get('name'), undefined);
    });
  });
});


test("store should reload the record in the background when `shouldBackgroundReloadRecord` is true", function(assert) {
  assert.expect(4);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
    shouldBackgroundReloadRecord(store, type, id, snapshot) {
      assert.ok(true, 'shouldBackgroundReloadRecord is called when record is loaded form the cache');
      return true;
    },
    findRecord() {
      assert.ok(true, 'find should not be called');
      return { id: 1, name: 'Tom' };
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
    store.findRecord('person', 1).then(function(record) {
      assert.equal(record.get('name'), undefined);
    });
  });

  assert.equal(store.peekRecord('person', 1).get('name'), 'Tom');
});

test("store should not reload record array when shouldReloadAll returns false", function(assert) {
  assert.expect(1);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
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

  run(function() {
    store.findAll('person');
  });
});

test("store should reload all records when shouldReloadAll returns true", function(assert) {
  assert.expect(3);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
    shouldReloadAll(store, type, id, snapshot) {
      assert.ok(true, 'shouldReloadAll should be called when the record is in the store');
      return true;
    },
    findAll() {
      assert.ok(true, 'findAll should be called when shouldReloadAll returns true');
      return [{ id: 1, name: 'Tom' }];
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.findAll('person').then(function(records) {
      assert.equal(records.get('firstObject.name'), 'Tom');
    });
  });
});

test("store should not call shouldBackgroundReloadAll when the store is already loading all records", function(assert) {
  assert.expect(2);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
    shouldReloadAll(store, type, id, snapshot) {
      return true;
    },
    shouldBackgroundReloadAll(store, type, id, snapshot) {
      assert.ok(false, 'shouldBackgroundReloadRecord is not called when shouldReloadRecord returns true');
    },
    findAll() {
      assert.ok(true, 'find should be called');
      return [{ id: 1, name: 'Tom' }];
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.findAll('person').then(function(records) {
      assert.equal(records.get('firstObject.name'), 'Tom');
    });
  });
});

test("store should not reload all records when `shouldBackgroundReloadAll` is false", function(assert) {
  assert.expect(3);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
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
      return [{ id: 1, name: 'Tom' }];
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.findAll('person').then(function(records) {
      assert.equal(records.get('firstObject'), undefined);
    });
  });
});


test("store should reload all records in the background when `shouldBackgroundReloadAll` is true", function(assert) {
  assert.expect(5);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var TestAdapter = DS.Adapter.extend({
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
      return [{ id: 1, name: 'Tom' }];
    }
  });

  store = createStore({
    adapter: TestAdapter,
    person: Person
  });

  run(function() {
    store.findAll('person').then(function(records) {
      assert.equal(records.get('firstObject.name'), undefined);
    });
  });

  assert.equal(store.peekRecord('person', 1).get('name'), 'Tom');
});

testInDebug("store should assert of the user tries to call store.filter", function(assert) {
  assert.expect(1);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store = createStore({
    person: Person
  });

  assert.expectAssertion(function() {
    run(function() {
      store.filter('person', {});
    });
  }, /The filter API has been moved to a plugin/);
});


testInDebug("Calling adapterFor with a model class should assert", function(assert) {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store = createStore({
    person: Person
  });

  assert.expectAssertion(function() {
    store.adapterFor(Person);
  }, /Passing classes to store.adapterFor has been removed/);
});
