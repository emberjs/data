var get = Ember.get, set = Ember.set;
var Person, store, adapter;

module("Persisting Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    adapter = DS.Adapter.create();
    store = DS.Store.create({ adapter: adapter });
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
  }
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been changed.", function() {
  expect(2);

  adapter.commit = function(store, records) {
    this.groupByType(records.updated).forEach(function(type, array) {
      equal(type, Person, "the type is correct");
      equal(get(array, 'length'), 1, "the array is the right length");

      store.didUpdateRecords(array);
    });
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });

  var tom = store.find(Person, 1);
  set(tom, "name", "Tom Dale");

  store.commit();

  // Make sure that if we commit again, the previous records have been
  // removed.
  store.commit();
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been created.", function() {
  expect(3);

  adapter.commit = function(store, records) {
    equal(get(records.updated, 'length'), 0, "no records are marked as being updated");

    this.groupByType(records.created).forEach(function(type, array) {
      equal(type, Person, "the type is correct");
      equal(get(array, 'length'), 1, "the array is the right length");

      store.didCreateRecords(Person, array, [{ id: 1, name: "Tom Dale" }]);
    });
  };

  var tom = store.createRecord(Person, { name: "Tom Dale" });

  store.commit();

  // Make sure that if we commit again, the previous records have been
  // removed.
  store.commit();
});

test("After a created record has been assigned an ID, finding a record by that ID returns the original record.", function() {
  expect(1);

  adapter.commit = function(store, records) {
    store.didCreateRecords(Person, records.created, [{ id: 1, name: "Tom Dale" }]);
  };

  var tom = store.createRecord(Person, { name: "Tom Dale" });
  store.commit();

  strictEqual(tom, store.find(Person, 1), "the retrieved record is the same as the created record");

  // Make sure that if we commit again, the previous records have been
  // removed.
  store.commit();
});

test("when a store is committed, the adapter's `commit` method should be called with records that have been deleted.", function() {
  expect(5);

  adapter.commit = function(store, records) {
    equal(get(records.updated, 'length'), 0, "no records are marked as updated");
    equal(get(records.created, 'length'), 0, "no records are marked as created");

    this.groupByType(records.deleted).forEach(function(type, array) {
      equal(type, Person, "the type is correct");
      equal(get(array, 'length'), 1, "the array is the right length");

      store.didDeleteRecords(array);
    });
  };

  store.load(Person, { id: 1, name: "Tom Dale" });
  var tom = store.find(Person, 1);

  tom.deleteRecord();
  store.commit();

  equal(get(tom, 'isDeleted'), true, "record is marked as deleted");
});
