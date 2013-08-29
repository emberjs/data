var Person;

module("unit/model/merge - Making changes while a record is in flight", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr(),
      city: DS.attr()
    });
  },

  teardown: function() {

  }
});

test("When a record is in flight, changes can be made", function() {
  var adapter = DS.Adapter.create({
    createRecord: function(store, type, record) {
      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
    }
  });

  var store = DS.Store.create({ adapter: adapter });

  var person = store.createRecord(Person, { name: "Tom Dale" });

  // Make sure saving isn't resolved synchronously
  Ember.run(function() {
    var promise = person.save();

    equal(person.get('name'), "Tom Dale");

    person.set('name', "Thomas Dale");

    promise.then(function(person) {
      equal(person.get('isDirty'), true, "The person is still dirty");
      equal(person.get('name'), "Thomas Dale", "The changes made still apply");
    });
  });
});

test("When a record is in flight, pushes are applied underneath the in flight changes", function() {
  var adapter = DS.Adapter.create({
    updateRecord: function(store, type, record) {
      return Ember.RSVP.resolve({ id: 1, name: "Senor Thomas Dale, Esq.", city: "Portland" });
    }
  });

  var store = DS.Store.create({ adapter: adapter });

  var person = store.push(Person, { id: 1, name: "Tom" });
  person.set('name', "Thomas Dale");

  // Make sure saving isn't resolved synchronously
  Ember.run(function() {
    var promise = person.save();

    equal(person.get('name'), "Thomas Dale");

    person.set('name', "Tomasz Dale");

    store.push(Person, { id: 1, name: "Tommy Dale", city: "PDX" });

    equal(person.get('name'), "Tomasz Dale", "the local changes applied on top");
    equal(person.get('city'), "PDX", "the pushed change is available");

    promise.then(function(person) {
      equal(person.get('isDirty'), true, "The person is still dirty");
      equal(person.get('name'), "Tomasz Dale", "The local changes apply");
      equal(person.get('city'), "Portland", "The updates from the server apply on top of the previous pushes");
    });
  });
});

test("When a record is dirty, pushes are overridden by local changes", function() {
  var store = DS.Store.create({ adapter: DS.Adapter });

  var person = store.push(Person, { id: 1, name: "Tom Dale", city: "San Francisco" });

  person.set('name', "Tomasz Dale");

  equal(person.get('isDirty'), true, "the person is currently dirty");
  equal(person.get('name'), "Tomasz Dale", "the update was effective");
  equal(person.get('city'), "San Francisco", "the original data applies");

  store.push(Person, { id: 1, name: "Thomas Dale", city: "Portland" });

  equal(person.get('isDirty'), true, "the local changes are reapplied");
  equal(person.get('name'), "Tomasz Dale", "the local changes are reapplied");
  equal(person.get('city'), "Portland", "if there are no local changes, the new data applied");
});
