var Person;
var run = Ember.run;

module("unit/model/merge - Merging", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr(),
      city: DS.attr()
    });
  }
});

test("When a record is in flight, changes can be made", function() {
  expect(3);

  var adapter = DS.Adapter.extend({
    createRecord: function(store, type, snapshot) {
      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
    }
  });
  var person;
  var store = createStore({
    adapter: adapter,
    person: Person
  });

  run(function() {
    person = store.createRecord('person', { name: "Tom Dale" });
  });

  // Make sure saving isn't resolved synchronously
  run(function() {
    var promise = person.save();

    equal(person.get('name'), "Tom Dale");

    person.set('name', "Thomas Dale");

    promise.then(function(person) {
      equal(person.get('hasDirtyAttributes'), true, "The person is still dirty");
      equal(person.get('name'), "Thomas Dale", "The changes made still apply");
    });
  });
});

test("Make sure snapshot is created at save time not at flush time", function() {
  expect(5);

  var adapter = DS.Adapter.extend({
    updateRecord: function(store, type, snapshot) {
      equal(snapshot.attr('name'), 'Thomas Dale');

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({ adapter: adapter, person: Person });
  var person;

  run(function() {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom"
        }
      }
    });
    person.set('name', "Thomas Dale");
  });

  run(function() {
    var promise = person.save();

    equal(person.get('name'), "Thomas Dale");

    person.set('name', "Tomasz Dale");

    equal(person.get('name'), "Tomasz Dale", "the local changes applied on top");

    promise.then(async(function(person) {
      equal(person.get('hasDirtyAttributes'), true, "The person is still dirty");
      equal(person.get('name'), "Tomasz Dale", "The local changes apply");
    }));
  });
});

test("When a record is in flight, pushes are applied underneath the in flight changes", function() {
  expect(6);

  var adapter = DS.Adapter.extend({
    updateRecord: function(store, type, snapshot) {
      // Make sure saving isn't resolved synchronously
      return new Ember.RSVP.Promise(function(resolve, reject) {
        run.next(null, resolve, { id: 1, name: "Senor Thomas Dale, Esq.", city: "Portland" });
      });
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });
  var person;

  run(function() {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom"
        }
      }
    });
    person.set('name', "Thomas Dale");
  });

  run(function() {
    var promise = person.save();

    equal(person.get('name'), "Thomas Dale");

    person.set('name', "Tomasz Dale");

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tommy Dale",
          city: "PDX"
        }
      }
    });

    equal(person.get('name'), "Tomasz Dale", "the local changes applied on top");
    equal(person.get('city'), "PDX", "the pushed change is available");

    promise.then(async(function(person) {
      equal(person.get('hasDirtyAttributes'), true, "The person is still dirty");
      equal(person.get('name'), "Tomasz Dale", "The local changes apply");
      equal(person.get('city'), "Portland", "The updates from the server apply on top of the previous pushes");
    }));
  });
});

test("When a record is dirty, pushes are overridden by local changes", function() {
  var store = createStore({
    adapter: DS.Adapter,
    person: Person
  });
  var person;

  run(function() {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom Dale",
          city: "San Francisco"
        }
      }
    });
    person.set('name', "Tomasz Dale");
  });

  equal(person.get('hasDirtyAttributes'), true, "the person is currently dirty");
  equal(person.get('name'), "Tomasz Dale", "the update was effective");
  equal(person.get('city'), "San Francisco", "the original data applies");

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Thomas Dale",
          city: "Portland"
        }
      }
    });
  });

  equal(person.get('hasDirtyAttributes'), true, "the local changes are reapplied");
  equal(person.get('name'), "Tomasz Dale", "the local changes are reapplied");
  equal(person.get('city'), "Portland", "if there are no local changes, the new data applied");
});

test("When a record is invalid, pushes are overridden by local changes", function() {
  var store = createStore({
    adapter: DS.Adapter,
    person: Person
  });
  var person;

  run(function() {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Brendan McLoughlin",
          city: "Boston"
        }
      }
    });
    person.set('name', "Brondan McLoughlin");
    person.send('becameInvalid');
  });

  equal(person.get('hasDirtyAttributes'), true, "the person is currently dirty");
  equal(person.get('isValid'), false, "the person is currently invalid");
  equal(person.get('name'), "Brondan McLoughlin", "the update was effective");
  equal(person.get('city'), "Boston", "the original data applies");

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "bmac",
          city: "Prague"
        }
      }
    });
  });

  equal(person.get('hasDirtyAttributes'), true, "the local changes are reapplied");
  equal(person.get('isValid'), false, "record is still invalid");
  equal(person.get('name'), "Brondan McLoughlin", "the local changes are reapplied");
  equal(person.get('city'), "Prague", "if there are no local changes, the new data applied");
});

test("A record with no changes can still be saved", function() {
  expect(1);

  var adapter = DS.Adapter.extend({
    updateRecord: function(store, type, snapshot) {
      return Ember.RSVP.resolve({ id: 1, name: "Thomas Dale" });
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });
  var person;

  run(function() {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributeS: {
          name: "Tom Dale"
        }
      }
    });
  });

  run(function() {
    person.save().then(function() {
      equal(person.get('name'), "Thomas Dale", "the updates occurred");
    });
  });
});

test("A dirty record can be reloaded", function() {
  expect(3);

  var adapter = DS.Adapter.extend({
    findRecord: function(store, type, id, snapshot) {
      return Ember.RSVP.resolve({ id: 1, name: "Thomas Dale", city: "Portland" });
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });
  var person;

  run(function() {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom Dale"
        }
      }
    });
    person.set('name', "Tomasz Dale");
  });

  run(function() {
    person.reload().then(function() {
      equal(person.get('hasDirtyAttributes'), true, "the person is dirty");
      equal(person.get('name'), "Tomasz Dale", "the local changes remain");
      equal(person.get('city'), "Portland", "the new changes apply");
    });
  });
});
