var get = Ember.get;
var Person, store, allRecords;
var run = Ember.run;
var env;

module("integration/adapter/find_all - Finding All Records of a Type", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    allRecords = null;

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  teardown: function() {
    run(function() {
      if (allRecords) { allRecords.destroy(); }
      store.destroy();
    });
  }
});

test("When all records for a type are requested, the store should call the adapter's `findAll` method.", function() {
  expect(5);

  env.registry.register('adapter:person', DS.Adapter.extend({
    findAll: function(store, type, since) {
      // this will get called twice
      ok(true, "the adapter's findAll method should be invoked");

      return Ember.RSVP.resolve([{ id: 1, name: "Braaaahm Dale" }]);
    }
  }));

  var allRecords;

  run(function() {
    store.find('person').then(function(all) {
      allRecords = all;
      equal(get(all, 'length'), 1, "the record array's length is 1 after a record is loaded into it");
      equal(all.objectAt(0).get('name'), "Braaaahm Dale", "the first item in the record array is Braaaahm Dale");
    });
  });

  run(function() {
    store.find('person').then(function(all) {
      // Only one record array per type should ever be created (identity map)
      strictEqual(allRecords, all, "the same record array is returned every time all records of a type are requested");
    });
  });
});

test("When all records for a type are requested, a rejection should reject the promise", function() {
  expect(5);

  var count = 0;
  env.registry.register('adapter:person', DS.Adapter.extend({
    findAll: function(store, type, since) {
      // this will get called twice
      ok(true, "the adapter's findAll method should be invoked");

      if (count++ === 0) {
        return Ember.RSVP.reject();
      } else {
        return Ember.RSVP.resolve([{ id: 1, name: "Braaaahm Dale" }]);
      }
    }
  }));

  var allRecords;

  run(function() {
    store.find('person').then(null, function() {
      ok(true, "The rejection should get here");
      return store.find('person');
    }).then(function(all) {
      allRecords = all;
      equal(get(all, 'length'), 1, "the record array's length is 1 after a record is loaded into it");
      equal(all.objectAt(0).get('name'), "Braaaahm Dale", "the first item in the record array is Braaaahm Dale");
    });
  });
});

test("When all records for a type are requested, records that are already loaded should be returned immediately.", function() {
  expect(3);
  store = createStore({
    adapter: DS.Adapter.extend(),
    person: Person
  });

  run(function() {
    // Load a record from the server
    store.push('person', { id: 1, name: "Jeremy Ashkenas" });
    // Create a new, unsaved record in the store
    store.createRecord('person', { name: "Alex MacCaw" });
  });

  allRecords = store.all('person');

  equal(get(allRecords, 'length'), 2, "the record array's length is 2");
  equal(allRecords.objectAt(0).get('name'), "Jeremy Ashkenas", "the first item in the record array is Jeremy Ashkenas");
  equal(allRecords.objectAt(1).get('name'), "Alex MacCaw", "the second item in the record array is Alex MacCaw");
});

test("When all records for a type are requested, records that are created on the client should be added to the record array.", function() {
  expect(3);

  store = createStore({
    adapter: DS.Adapter.extend(),
    person: Person
  });

  allRecords = store.all('person');

  equal(get(allRecords, 'length'), 0, "precond - the record array's length is zero before any records are loaded");

  run(function() {
    store.createRecord('person', { name: "Carsten Nielsen" });
  });

  equal(get(allRecords, 'length'), 1, "the record array's length is 1");
  equal(allRecords.objectAt(0).get('name'), "Carsten Nielsen", "the first item in the record array is Carsten Nielsen");
});
