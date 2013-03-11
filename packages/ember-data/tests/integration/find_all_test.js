var get = Ember.get, set = Ember.set;

var Person, adapter, store, allRecords;

module("Finding All Records of a Type", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    adapter = DS.Adapter.create();
    store = DS.Store.create({ adapter: adapter });
    allRecords = null;
  },

  teardown: function() {
    if (allRecords) { allRecords.destroy(); }
    adapter.destroy();
    store.destroy();
  }
});

test("When all records for a type are requested, the store should call the adapter's `findAll` method.", function() {
  expect(5);

  adapter.findAll = function(store, type, since) {
    ok(true, "the adapter's findAll method should be invoked");

    // Simulate latency to ensure correct behavior in asynchronous conditions.
    invokeAsync(function() {
      store.loadMany(type, [{ id: 1, name: "Braaaahm Dale" }]);

      // Only one record array per type should ever be created (identity map)
      strictEqual(allRecords, store.all(Person), "the same record array is returned every time all records of a type are requested");
    });
  };

  allRecords = store.find(Person);

  equal(get(allRecords, 'length'), 0, "the record array's length is zero before any records are loaded");

  Ember.addObserver(allRecords, 'length', function() {
    equal(get(allRecords, 'length'), 1, "the record array's length is 1 after a record is loaded into it");
    equal(allRecords.objectAt(0).get('name'), "Braaaahm Dale", "the first item in the record array is Braaaahm Dale");
  });
});

test("When all records for a type are requested, records that are already loaded should be returned immediately.", function() {
  expect(3);

  // Load a record from the server
  store.load(Person, { id: 1, name: "Jeremy Ashkenas" });

  // Create a new, unsaved record in the store
  store.createRecord(Person, { name: "Alex MacCaw" });

  allRecords = store.all(Person);

  equal(get(allRecords, 'length'), 2, "the record array's length is 2");
  equal(allRecords.objectAt(0).get('name'), "Jeremy Ashkenas", "the first item in the record array is Jeremy Ashkenas");
  equal(allRecords.objectAt(1).get('name'), "Alex MacCaw", "the first item in the record array is Jeremy Ashkenas");
});

test("When all records for a type are requested, records that are created on the client should be added to the record array.", function() {
  expect(3);

  allRecords = store.all(Person);

  equal(get(allRecords, 'length'), 0, "precond - the record array's length is zero before any records are loaded");

  store.createRecord(Person, { name: "Carsten Nielsen" });

  equal(get(allRecords, 'length'), 1, "the record array's length is 1");
  equal(allRecords.objectAt(0).get('name'), "Carsten Nielsen", "the first item in the record array is Carsten Nielsen");
});
