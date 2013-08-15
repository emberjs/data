var get = Ember.get, set = Ember.set, attr = DS.attr;
var Person, env;

function assertClean(promise) {
  return promise.then(async(function(record) {
    equal(record.get('isDirty'), false, "The record is now clean");
    return record;
  }));
}

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

  env.adapter.updateRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");
    equal(record, tom, "the record is correct");

    return Ember.RSVP.resolve();
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });

  var tom = env.store.find('person', 1);
  set(tom, "name", "Tom Dale");

  tom.save();
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been created.", function() {
  expect(2);

  env.adapter.createRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");
    equal(record, tom, "the record is correct");

    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
  };

  var tom = env.store.createRecord('person', { name: "Tom Dale" });
  tom.save();
});

test("After a created record has been assigned an ID, finding a record by that ID returns the original record.", function() {
  expect(1);

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
  };

  var tom = env.store.createRecord('person', { name: "Tom Dale" });
  tom.save();

  strictEqual(tom, env.store.find('person', 1), "the retrieved record is the same as the created record");
});

test("when a store is committed, the adapter's `commit` method should be called with records that have been deleted.", function() {
  expect(3);

  env.adapter.deleteRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");
    equal(record, tom, "the record is correct");

    return Ember.RSVP.resolve();
  };

  env.store.push('person', { id: 1, name: "Tom Dale" });
  var tom = env.store.find('person', 1);

  tom.deleteRecord();
  tom.save();

  equal(get(tom, 'isDeleted'), true, "record is marked as deleted");
});

test("An adapter can notify the store that records were updated by calling `didSaveRecords`.", function() {
  expect(6);

  var tom, yehuda;

  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  env.store.push('person', { id: 1 });
  env.store.push('person', { id: 2 });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.set('name', "Michael Phelps");
  yehuda.set('name', "Usain Bolt");

  ok(tom.get('isDirty'), "tom is dirty");
  ok(yehuda.get('isDirty'), "yehuda is dirty");

  assertClean(tom.save()).then(async(function(record) {
    equal(record, tom, "The record is correct");
  }));

  assertClean(yehuda.save()).then(async(function(record) {
    equal(record, yehuda, "The record is correct");
  }));
});

test("An adapter can notify the store that records were updated and provide new data by calling `didSaveRecords`.", function() {
  expect(4);

  var tom, yehuda, transaction;

  env.adapter.updateRecord = function(store, type, record) {
    if (record.get('id') === "1") {
      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", updatedAt: "now" });
    } else if (record.get('id') === "2") {
      return Ember.RSVP.resolve({ id: 2, name: "Yehuda Katz", updatedAt: "now!" });
    }

  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.set('name', "Draaaaaahm Dale");
  yehuda.set('name', "Goy Katz");

  tom.save().then(async(function(record) {
    equal(tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));

  yehuda.save().then(async(function(record) {
    equal(yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));
});

test("An adapter can notify the store that a record was updated by calling `didSaveRecord`.", function() {
  expect(4);

  var tom, yehuda;

  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  env.store.push('person', { id: 1 });
  env.store.push('person', { id: 2 });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.set('name', "Tom Dale");
  yehuda.set('name', "Yehuda Katz");

  ok(tom.get('isDirty'), "tom is dirty");
  ok(yehuda.get('isDirty'), "yehuda is dirty");

  assertClean(tom.save());
  assertClean(yehuda.save());
});

test("An adapter can notify the store that a record was updated and provide new data by calling `didSaveRecord`.", function() {
  expect(4);

  var tom, yehuda, transaction;

  env.adapter.updateRecord = function(store, type, record) {
    switch (record.get('id')) {
      case "1":
        return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", updatedAt: "now" });
      case "2":
        return Ember.RSVP.resolve({ id: 2, name: "Yehuda Katz", updatedAt: "now!" });
    }
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.set('name', "Draaaaaahm Dale");
  yehuda.set('name', "Goy Katz");

  tom.save().then(async(function(record) {
    equal(record.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(record.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));

  yehuda.save().then(async(function(record) {
    equal(record.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(record.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));
});

test("An adapter can notify the store that records were deleted by calling `didSaveRecords`.", function() {
  expect(2);

  var tom, yehuda, transaction;

  env.adapter.deleteRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.deleteRecord();
  yehuda.deleteRecord();

  assertClean(tom.save());
  assertClean(yehuda.save());
});

test("An adapter can notify the store that a record was deleted by calling `didSaveRecord`.", function() {
  var tom, yehuda, transaction;

  env.adapter.deleteRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  tom = env.store.find('person', 1);
  yehuda = env.store.find('person', 2);

  tom.deleteRecord();
  yehuda.deleteRecord();

  assertClean(tom.save());
  assertClean(yehuda.save());
});
