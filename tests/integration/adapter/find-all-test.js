import {createStore} from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';
import DS from 'ember-data';

const { attr } = DS;
const { get, run } = Ember;
const { resolve, reject } = Ember.RSVP;

let Person, store, allRecords, env;

module("integration/adapter/find_all - Finding All Records of a Type", {
  beforeEach() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });
    Person.reopenClass({ toString() { return 'Person'; } });

    allRecords = null;

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  afterEach() {
    run(() => {
      if (allRecords) { allRecords.destroy(); }
      store.destroy();
    });
  }
});

test("When all records for a type are requested, the store should call the adapter's `findAll` method.", (assert) => {
  assert.expect(5);

  env.registry.register('adapter:person', DS.Adapter.extend({
    findAll() {
      // this will get called twice
      assert.ok(true, "the adapter's findAll method should be invoked");

      return resolve([{ id: 1, name: "Braaaahm Dale" }]);
    }
  }));

  let allRecords;

  run(() => {
    store.findAll('person').then((all) => {
      allRecords = all;
      assert.equal(get(all, 'length'), 1, "the record array's length is 1 after a record is loaded into it");
      assert.equal(all.objectAt(0).get('name'), "Braaaahm Dale", "the first item in the record array is Braaaahm Dale");
    });
  });

  run(() => {
    store.findAll('person').then((all) => {
      // Only one record array per type should ever be created (identity map)
      assert.strictEqual(allRecords, all, "the same record array is returned every time all records of a type are requested");
    });
  });
});

test("When all records for a type are requested, a rejection should reject the promise", (assert) => {
  assert.expect(5);

  let count = 0;
  env.registry.register('adapter:person', DS.Adapter.extend({
    findAll() {
      // this will get called twice
      assert.ok(true, "the adapter's findAll method should be invoked");

      if (count++ === 0) {
        return reject();
      } else {
        return resolve([{ id: 1, name: "Braaaahm Dale" }]);
      }
    }
  }));

  run(() => {
    store.findAll('person').then(null, () => {
      assert.ok(true, "The rejection should get here");
      return store.findAll('person');
    }).then((all) => {
      assert.equal(get(all, 'length'), 1, "the record array's length is 1 after a record is loaded into it");
      assert.equal(all.objectAt(0).get('name'), "Braaaahm Dale", "the first item in the record array is Braaaahm Dale");
    });
  });
});

test("When all records for a type are requested, records that are already loaded should be returned immediately.", (assert) => {
  assert.expect(3);
  store = createStore({
    adapter: DS.Adapter.extend(),
    person: Person
  });

  run(() => {
    // Load a record from the server
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Jeremy Ashkenas'
        }
      }
    });
    // Create a new, unsaved record in the store
    store.createRecord('person', { name: "Alex MacCaw" });
  });

  allRecords = store.peekAll('person');

  assert.equal(get(allRecords, 'length'), 2, "the record array's length is 2");
  assert.equal(allRecords.objectAt(0).get('name'), "Jeremy Ashkenas", "the first item in the record array is Jeremy Ashkenas");
  assert.equal(allRecords.objectAt(1).get('name'), "Alex MacCaw", "the second item in the record array is Alex MacCaw");
});

test("When all records for a type are requested, records that are created on the client should be added to the record array.", (assert) => {
  assert.expect(3);

  store = createStore({
    adapter: DS.Adapter.extend(),
    person: Person
  });

  allRecords = store.peekAll('person');

  assert.equal(get(allRecords, 'length'), 0, "precond - the record array's length is zero before any records are loaded");

  run(() => {
    store.createRecord('person', { name: "Carsten Nielsen" });
  });

  assert.equal(get(allRecords, 'length'), 1, "the record array's length is 1");
  assert.equal(allRecords.objectAt(0).get('name'), "Carsten Nielsen", "the first item in the record array is Carsten Nielsen");
});

testInDebug('When all records are requested, assert the payload is not blank', (assert) => {
  env.registry.register('adapter:person', DS.Adapter.extend({
    findAll: () => Ember.RSVP.resolve({})
  }));

  assert.expectAssertion(() => {
    run(() => store.findAll('person'));
  }, /You made a 'findAll' request for 'person' records, but the adapter's response did not have any data/);
});

test("isUpdating is true while records are fetched", function(assert) {
  let done = assert.async();

  let findAllDeferred = Ember.RSVP.defer();
  env.registry.register('adapter:person', DS.Adapter.extend({
    findAll() {
      return findAllDeferred.promise;
    },

    shouldReloadAll: () => true
  }));

  run(function() {
    store.push({
      data: [{
        type: 'person',
        id: 1
      }]
    });
  });

  let persons = store.peekAll('person');
  assert.equal(persons.get("length"), 1);

  run(function() {
    store.findAll('person').then(function(persons) {
      assert.equal(persons.get("isUpdating"), false);
      assert.equal(persons.get("length"), 2);

      done();
    });
  });

  assert.equal(persons.get("isUpdating"), true);

  findAllDeferred.resolve([{ id: 2 }]);
});

test("isUpdating is true while records are fetched in the background", function(assert) {
  let done = assert.async();

  let findAllDeferred = Ember.RSVP.defer();
  env.registry.register('adapter:person', DS.Adapter.extend({
    findAll() {
      return findAllDeferred.promise;
    },

    shouldReloadAll: () => false,
    shouldBackgroundReloadAll: () => true
  }));

  run(function() {
    store.push({
      data: [{
        type: 'person',
        id: 1
      }]
    });
  });

  let persons = store.peekAll('person');
  assert.equal(persons.get("length"), 1);

  run(function() {
    store.findAll('person').then(function(persons) {
      assert.equal(persons.get("isUpdating"), true);
      assert.equal(persons.get("length"), 1, "persons are updated in the background");
    });
  });

  assert.equal(persons.get("isUpdating"), true);

  run(function() {
    findAllDeferred.resolve([{ id: 2 }]);
  });

  run(function() {
    findAllDeferred.promise.then(function() {
      assert.equal(persons.get("isUpdating"), false);
      assert.equal(persons.get("length"), 2);

      done();
    });
  });
});

test("isUpdating is false if records are not fetched in the background", function(assert) {
  let findAllDeferred = Ember.RSVP.defer();
  env.registry.register('adapter:person', DS.Adapter.extend({
    findAll() {
      return findAllDeferred.promise;
    },
    shouldReloadAll: () => false,
    shouldBackgroundReloadAll: () => false
  }));

  run(function() {
    store.push({
      data: [{
        type: 'person',
        id: 1
      }]
    });
  });

  let persons = store.peekAll('person');
  assert.equal(persons.get("length"), 1);

  run(function() {
    store.findAll('person').then(function(persons) {
      assert.equal(persons.get("isUpdating"), false);
    });
  });

  assert.equal(persons.get("isUpdating"), false);
});
