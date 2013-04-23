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
    Person[Ember.GUID_KEY+'_name'] = 'Person'; // To test error messages

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
    this.groupByType(records.updated).forEach(function(type, set) {
      equal(type, Person, "the type is correct");
      equal(get(set.toArray(), 'length'), 1, "the array is the right length");

      store.didSaveRecords(set);
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
    equal(get(records.updated.toArray(), 'length'), 0, "no records are marked as being updated");

    this.groupByType(records.created).forEach(function(type, set) {
      equal(type, Person, "the type is correct");
      equal(get(set.toArray(), 'length'), 1, "the array is the right length");

      store.didSaveRecords(set, [{ id: 1, name: "Tom Dale" }]);
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
    store.didSaveRecords(records.created, [{ id: 1, name: "Tom Dale" }]);
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
    equal(records.updated.isEmpty(), true, "no records are marked as updated");
    equal(records.created.isEmpty(), true, "no records are marked as created");

    this.groupByType(records.deleted).forEach(function(type, set) {
      equal(type, Person, "the type is correct");
      equal(get(set.toArray(), 'length'), 1, "the array is the right length");

      store.didSaveRecords(set);
    });
  };

  store.load(Person, { id: 1, name: "Tom Dale" });
  var tom = store.find(Person, 1);

  tom.deleteRecord();
  store.commit();

  equal(get(tom, 'isDeleted'), true, "record is marked as deleted");
});

test("An adapter can notify the store that records were updated by calling `didSaveRecords`.", function() {
  expect(5);

  var tom, yehuda;

  adapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords.toArray(), 'length'), 2, "two updated records are passed to `commit`");

    store.didSaveRecords([tom, yehuda]);

    ok(!tom.get('isDirty'), "tom is no longer dirty");
    ok(!yehuda.get('isDirty'), "yehuda is no longer dirty");
  };

  store.load(Person, { id: 1 });
  store.load(Person, { id: 2 });

  tom = store.find(Person, 1);
  yehuda = store.find(Person, 2);

  tom.set('name', "Michael Phelps");
  yehuda.set('name', "Usain Bolt");

  ok(tom.get('isDirty'), "tom is dirty");
  ok(yehuda.get('isDirty'), "yehuda is dirty");

  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("An adapter can notify the store that records were updated and provide new data by calling `didSaveRecords`.", function() {
  expect(5);

  var tom, yehuda, transaction;

  adapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecords([tom, yehuda], [ { id: 1, name: "Tom Dale", updatedAt: "now" }, { id: 2, name: "Yehuda Katz", updatedAt: "now!" } ]);

    equal(tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    equal(yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  tom = store.find(Person, 1);
  yehuda = store.find(Person, 2);

  tom.set('name', "Draaaaaahm Dale");
  yehuda.set('name', "Goy Katz");

  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("An adapter can notify the store that a record was updated by calling `didSaveRecord`.", function() {
  expect(5);

  var tom, yehuda;

  adapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecord(tom);
    store.didSaveRecord(yehuda);

    ok(!tom.get('isDirty'), "tom is not dirty");
    ok(!yehuda.get('isDirty'), "yehuda is not dirty");
  };

  store.load(Person, { id: 1 });
  store.load(Person, { id: 2 });

  tom = store.find(Person, 1);
  yehuda = store.find(Person, 2);

  tom.set('name', "Tom Dale");
  yehuda.set('name', "Yehuda Katz");

  ok(tom.get('isDirty'), "tom is dirty");
  ok(yehuda.get('isDirty'), "yehuda is dirty");

  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("An adapter can notify the store that a record was updated and provide new data by calling `didSaveRecord`.", function() {
  expect(5);

  var tom, yehuda, transaction;

  adapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecord(tom, { id: 1, name: "Tom Dale", updatedAt: "now" });
    store.didSaveRecord(yehuda, { id: 2, name: "Yehuda Katz", updatedAt: "now!" });

    equal(tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    equal(yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  tom = store.find(Person, 1);
  yehuda = store.find(Person, 2);

  tom.set('name', "Draaaaaahm Dale");
  yehuda.set('name', "Goy Katz");

  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("An adapter can notify the store that records were deleted by calling `didSaveRecords`.", function() {
  expect(3);

  var tom, yehuda, transaction;

  adapter.commit = function(store, commitDetails, relationships) {
    var deletedRecords = commitDetails.deleted;

    equal(get(deletedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecords([tom, yehuda]);

    ok(!get(tom, 'isDirty'), "Tom is no longer dirty");
    ok(!get(yehuda, 'isDirty'), "Yehuda is no longer dirty");
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  tom = store.find(Person, 1);
  yehuda = store.find(Person, 2);

  tom.deleteRecord();
  yehuda.deleteRecord();

  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("An adapter can notify the store that a record was deleted by calling `didSaveRecord`.", function() {
  expect(3);

  var tom, yehuda, transaction;

  adapter.commit = function(store, commitDetails, relationships) {
    var deletedRecords = commitDetails.deleted;

    equal(get(deletedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecord(tom);
    store.didSaveRecord(yehuda);

    ok(!get(tom, 'isDirty'), "Tom is no longer dirty");
    ok(!get(yehuda, 'isDirty'), "Yehuda is no longer dirty");
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  tom = store.find(Person, 1);
  yehuda = store.find(Person, 2);

  tom.deleteRecord();
  yehuda.deleteRecord();

  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("An error is raised when attempting to set a property while a record is being saved", function() {
  expect(3);

  var tom;

  adapter.commit = function(store, commitDetails, relationships) {
  };

  var finishSaving = function() {
    store.didSaveRecord(tom);
  };

  store.load(Person, { id: 1 });
  tom = store.find(Person, 1);
  tom.set('name', "Tom Dale");
  store.commit();
  ok(tom.get('isDirty'), "tom is dirty");
  try {
    tom.set('name', "Tommy Bahama");
  } catch(e) {
    var expectedMessage = "Attempted to handle event `willSetProperty` on <Person:" + Ember.guidFor(tom) + ":1> ";
    expectedMessage +=    "while in state rootState.loaded.updated.inFlight. Called with ";
    expectedMessage +=    "{reference: [object Object], store: <DS.Store:" + Ember.guidFor(store) + ">, name: name}";
    equal(e.message, expectedMessage);
  }
  finishSaving();
  ok(!tom.get('isDirty'), "tom is not dirty");
});
