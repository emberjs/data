import {createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var Person;
var run = Ember.run;

module("unit/model/merge - Merging", {
  beforeEach() {
    Person = DS.Model.extend({
      name: DS.attr(),
      city: DS.attr()
    });
  }
});

test("When a record is in flight, changes can be made", function(assert) {
  assert.expect(3);

  var adapter = DS.Adapter.extend({
    createRecord(store, type, snapshot) {
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

    assert.equal(person.get('name'), "Tom Dale");

    person.set('name', "Thomas Dale");

    promise.then(function(person) {
      assert.equal(person.get('hasDirtyAttributes'), true, "The person is still dirty");
      assert.equal(person.get('name'), "Thomas Dale", "The changes made still apply");
    });
  });
});

test("Make sure snapshot is created at save time not at flush time", function(assert) {
  assert.expect(5);

  var adapter = DS.Adapter.extend({
    updateRecord(store, type, snapshot) {
      assert.equal(snapshot.attr('name'), 'Thomas Dale');

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

    assert.equal(person.get('name'), "Thomas Dale");

    person.set('name', "Tomasz Dale");

    assert.equal(person.get('name'), "Tomasz Dale", "the local changes applied on top");

    promise.then(assert.wait(function(person) {
      assert.equal(person.get('hasDirtyAttributes'), true, "The person is still dirty");
      assert.equal(person.get('name'), "Tomasz Dale", "The local changes apply");
    }));
  });
});

test("When a record is in flight, pushes are applied underneath the in flight changes", function(assert) {
  assert.expect(6);

  var adapter = DS.Adapter.extend({
    updateRecord(store, type, snapshot) {
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

    assert.equal(person.get('name'), "Thomas Dale");

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

    assert.equal(person.get('name'), "Tomasz Dale", "the local changes applied on top");
    assert.equal(person.get('city'), "PDX", "the pushed change is available");

    promise.then(assert.wait(function(person) {
      assert.equal(person.get('hasDirtyAttributes'), true, "The person is still dirty");
      assert.equal(person.get('name'), "Tomasz Dale", "The local changes apply");
      assert.equal(person.get('city'), "Portland", "The updates from the server apply on top of the previous pushes");
    }));
  });
});

test("When a record is dirty, pushes are overridden by local changes", function(assert) {
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

  assert.equal(person.get('hasDirtyAttributes'), true, "the person is currently dirty");
  assert.equal(person.get('name'), "Tomasz Dale", "the update was effective");
  assert.equal(person.get('city'), "San Francisco", "the original data applies");

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

  assert.equal(person.get('hasDirtyAttributes'), true, "the local changes are reapplied");
  assert.equal(person.get('name'), "Tomasz Dale", "the local changes are reapplied");
  assert.equal(person.get('city'), "Portland", "if there are no local changes, the new data applied");
});

test("When a record is invalid, pushes are overridden by local changes", function(assert) {
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

  assert.equal(person.get('hasDirtyAttributes'), true, "the person is currently dirty");
  assert.equal(person.get('isValid'), false, "the person is currently invalid");
  assert.equal(person.get('name'), "Brondan McLoughlin", "the update was effective");
  assert.equal(person.get('city'), "Boston", "the original data applies");

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

  assert.equal(person.get('hasDirtyAttributes'), true, "the local changes are reapplied");
  assert.equal(person.get('isValid'), false, "record is still invalid");
  assert.equal(person.get('name'), "Brondan McLoughlin", "the local changes are reapplied");
  assert.equal(person.get('city'), "Prague", "if there are no local changes, the new data applied");
});

test("A record with no changes can still be saved", function(assert) {
  assert.expect(1);

  var adapter = DS.Adapter.extend({
    updateRecord(store, type, snapshot) {
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
      assert.equal(person.get('name'), "Thomas Dale", "the updates occurred");
    });
  });
});

test("A dirty record can be reloaded", function(assert) {
  assert.expect(3);

  var adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
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
      assert.equal(person.get('hasDirtyAttributes'), true, "the person is dirty");
      assert.equal(person.get('name'), "Tomasz Dale", "the local changes remain");
      assert.equal(person.get('city'), "Portland", "the new changes apply");
    });
  });
});
