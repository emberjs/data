var get = Ember.get, set = Ember.set, attr = DS.attr;
var Person, env;

module("integration/adapter/record_persistence - Persisting Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });
    Person.toString = function() { return "Person"; };

    env = setupStore({ person: Person });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been changed.", function() {
  expect(2);

  env.adapter.commit = function(store, records) {
    this.groupByType(records.updated).forEach(function(type, set) {
      equal(type, Person, "the type is correct");
      equal(get(set.toArray(), 'length'), 1, "the array is the right length");

      store.didSaveRecords(set);
    });
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });

  var tom = env.store.find('person', 1);
  set(tom, "name", "Tom Dale");

  env.store.commit();

  // Make sure that if we commit again, the previous records have been
  // removed.
  env.store.commit();
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been created.", function() {
  expect(3);

  env.adapter.commit = function(store, records) {
    equal(get(records.updated.toArray(), 'length'), 0, "no records are marked as being updated");

    this.groupByType(records.created).forEach(function(type, set) {
      equal(type, Person, "the type is correct");
      equal(get(set.toArray(), 'length'), 1, "the array is the right length");

      store.didSaveRecords(set, [{ id: 1, name: "Tom Dale" }]);
    });
  };

  var tom = env.store.createRecord('person', { name: "Tom Dale" });

  env.store.commit();

  // Make sure that if we commit again, the previous records have been
  // removed.
  env.store.commit();
});

test("After a created record has been assigned an ID, finding a record by that ID returns the original record.", function() {
  expect(1);

  env.adapter.commit = function(store, records) {
    store.didSaveRecords(records.created, [{ id: 1, name: "Tom Dale" }]);
  };

  var tom = env.store.createRecord('person', { name: "Tom Dale" });
  env.store.commit();

  strictEqual(tom, env.store.find('person', 1), "the retrieved record is the same as the created record");

  // Make sure that if we commit again, the previous records have been
  // removed.
  env.store.commit();
});

test("when a store is committed, the adapter's `commit` method should be called with records that have been deleted.", function() {
  expect(5);

  env.adapter.commit = function(store, records) {
    equal(records.updated.isEmpty(), true, "no records are marked as updated");
    equal(records.created.isEmpty(), true, "no records are marked as created");

    this.groupByType(records.deleted).forEach(function(type, set) {
      equal(type, Person, "the type is correct");
      equal(get(set.toArray(), 'length'), 1, "the array is the right length");

      store.didSaveRecords(set);
    });
  };

  env.store.push('person', { id: 1, name: "Tom Dale" });
  var tom = env.store.find('person', 1);

  tom.deleteRecord();
  env.store.commit();

  equal(get(tom, 'isDeleted'), true, "record is marked as deleted");
});

test("An adapter can notify the store that records were updated by calling `didSaveRecords`.", function() {
  expect(5);

  var tom, yehuda;

  env.adapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords.toArray(), 'length'), 2, "two updated records are passed to `commit`");

    store.didSaveRecords([tom, yehuda]);

    ok(!tom.get('isDirty'), "tom is no longer dirty");
    ok(!yehuda.get('isDirty'), "yehuda is no longer dirty");
  };

  env.store.push('person', { id: 1 });
  env.store.push('person', { id: 2 });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.set('name', "Michael Phelps");
  yehuda.set('name', "Usain Bolt");

  ok(tom.get('isDirty'), "tom is dirty");
  ok(yehuda.get('isDirty'), "yehuda is dirty");

  env.store.commit();

  // there is nothing to commit, so there won't be any records
  env.store.commit();
});

test("An adapter can notify the store that records were updated and provide new data by calling `didSaveRecords`.", function() {
  expect(5);

  var tom, yehuda, transaction;

  env.adapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecords([tom, yehuda], [ { id: 1, name: "Tom Dale", updatedAt: "now" }, { id: 2, name: "Yehuda Katz", updatedAt: "now!" } ]);

    equal(tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    equal(yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.set('name', "Draaaaaahm Dale");
  yehuda.set('name', "Goy Katz");

  env.store.commit();

  // there is nothing to commit, so there won't be any records
  env.store.commit();
});

test("An adapter can notify the store that a record was updated by calling `didSaveRecord`.", function() {
  expect(5);

  var tom, yehuda;

  env.adapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecord(tom);
    store.didSaveRecord(yehuda);

    ok(!tom.get('isDirty'), "tom is not dirty");
    ok(!yehuda.get('isDirty'), "yehuda is not dirty");
  };

  env.store.push('person', { id: 1 });
  env.store.push('person', { id: 2 });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.set('name', "Tom Dale");
  yehuda.set('name', "Yehuda Katz");

  ok(tom.get('isDirty'), "tom is dirty");
  ok(yehuda.get('isDirty'), "yehuda is dirty");

  env.store.commit();

  // there is nothing to commit, so there won't be any records
  env.store.commit();
});

test("An adapter can notify the store that a record was updated and provide new data by calling `didSaveRecord`.", function() {
  expect(5);

  var tom, yehuda, transaction;

  env.adapter.commit = function(store, commitDetails, relationships) {
    var updatedRecords = commitDetails.updated;

    equal(get(updatedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecord(tom, { id: 1, name: "Tom Dale", updatedAt: "now" });
    store.didSaveRecord(yehuda, { id: 2, name: "Yehuda Katz", updatedAt: "now!" });

    equal(tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    equal(yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.set('name', "Draaaaaahm Dale");
  yehuda.set('name', "Goy Katz");

  env.store.commit();

  // there is nothing to commit, so there won't be any records
  env.store.commit();
});

test("An adapter can notify the store that records were deleted by calling `didSaveRecords`.", function() {
  expect(3);

  var tom, yehuda, transaction;

  env.adapter.commit = function(store, commitDetails, relationships) {
    var deletedRecords = commitDetails.deleted;

    equal(get(deletedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecords([tom, yehuda]);

    ok(!get(tom, 'isDirty'), "Tom is no longer dirty");
    ok(!get(yehuda, 'isDirty'), "Yehuda is no longer dirty");
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.deleteRecord();
  yehuda.deleteRecord();

  env.store.commit();

  // there is nothing to commit, so there won't be any records
  env.store.commit();
});

test("An adapter can notify the store that a record was deleted by calling `didSaveRecord`.", function() {
  expect(3);

  var tom, yehuda, transaction;

  env.adapter.commit = function(store, commitDetails, relationships) {
    var deletedRecords = commitDetails.deleted;

    equal(get(deletedRecords.toArray(), 'length'), 2, "precond - two updated records are passed to `commit`");

    store.didSaveRecord(tom);
    store.didSaveRecord(yehuda);

    ok(!get(tom, 'isDirty'), "Tom is no longer dirty");
    ok(!get(yehuda, 'isDirty'), "Yehuda is no longer dirty");
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.deleteRecord();
  yehuda.deleteRecord();

  env.store.commit();

  // there is nothing to commit, so there won't be any records
  env.store.commit();
});

test("An error is raised when attempting to set a property while a record is being saved", function() {
  expect(3);

  var tom;

  env.adapter.commit = function(store, commitDetails, relationships) {
  };

  var finishSaving = function() {
    env.store.didSaveRecord(tom);
  };

  env.store.push(Person, { id: 1 });
  tom = env.store.find(Person, 1);
  tom.set('name', "Tom Dale");
  env.store.commit();
  ok(tom.get('isDirty'), "tom is dirty");
  try {
    tom.set('name', "Tommy Bahama");
  } catch(e) {
    var expectedMessage = "Attempted to handle event `willSetProperty` on <Person:" + Ember.guidFor(tom) + ":1> ";
    expectedMessage +=    "while in state root.loaded.updated.inFlight. Called with ";
    expectedMessage +=    "{reference: [object Object], store: <DS.Store:" + Ember.guidFor(env.store) + ">, name: name}.";
    equal(e.message, expectedMessage);
  }
  finishSaving();
  ok(!tom.get('isDirty'), "tom is not dirty");
});
