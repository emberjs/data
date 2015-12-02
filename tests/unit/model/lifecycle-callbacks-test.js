import {createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var get = Ember.get;
var run = Ember.run;

module("unit/model/lifecycle_callbacks - Lifecycle Callbacks");

test("a record receives a didLoad callback when it has finished loading", function(assert) {
  assert.expect(3);

  var Person = DS.Model.extend({
    name: DS.attr(),
    didLoad() {
      assert.ok("The didLoad callback was called");
    }
  });

  var adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });

  run(function() {
    store.findRecord('person', 1).then(function(person) {
      assert.equal(person.get('id'), "1", "The person's ID is available");
      assert.equal(person.get('name'), "Foo", "The person's properties are available");
    });
  });
});

test("TEMPORARY: a record receives a didLoad callback once it materializes if it wasn't materialized when loaded", function(assert) {
  assert.expect(2);
  var didLoadCalled = 0;
  var Person = DS.Model.extend({
    name: DS.attr(),
    didLoad() {
      didLoadCalled++;
    }
  });

  var store = createStore({
    person: Person
  });

  run(function() {
    store._pushInternalModel({ id: 1, type: 'person' });
    assert.equal(didLoadCalled, 0, "didLoad was not called");
  });
  run(function() {
    store.peekRecord('person', 1);
  });
  run(function() {
    assert.equal(didLoadCalled, 1, "didLoad was called");
  });
});

test("a record receives a didUpdate callback when it has finished updating", function(assert) {
  assert.expect(5);

  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    didUpdate() {
      callCount++;
      assert.equal(get(this, 'isSaving'), false, "record should be saving");
      assert.equal(get(this, 'hasDirtyAttributes'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    },

    updateRecord(store, type, snapshot) {
      assert.equal(callCount, 0, "didUpdate callback was not called until didSaveRecord is called");

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });
  var asyncPerson;

  run(function() {
    asyncPerson = store.findRecord('person', 1);
  });
  assert.equal(callCount, 0, "precond - didUpdate callback was not called yet");

  run(function() {
    asyncPerson.then(function(person) {
      return run(function() {
        person.set('bar', "Bar");
        return person.save();
      });
    }).then(function() {
      assert.equal(callCount, 1, "didUpdate called after update");
    });
  });
});

test("a record receives a didCreate callback when it has finished updating", function(assert) {
  assert.expect(5);

  var callCount = 0;

  var Person = DS.Model.extend({
    didCreate() {
      callCount++;
      assert.equal(get(this, 'isSaving'), false, "record should not be saving");
      assert.equal(get(this, 'hasDirtyAttributes'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    createRecord(store, type, snapshot) {
      assert.equal(callCount, 0, "didCreate callback was not called until didSaveRecord is called");

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });

  assert.equal(callCount, 0, "precond - didCreate callback was not called yet");
  var person;

  run(function() {
    person = store.createRecord('person', { id: 69, name: "Newt Gingrich" });
  });


  run(function() {
    person.save().then(function() {
      assert.equal(callCount, 1, "didCreate called after commit");
    });
  });
});

test("a record receives a didDelete callback when it has finished deleting", function(assert) {
  assert.expect(5);

  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    didDelete() {
      callCount++;

      assert.equal(get(this, 'isSaving'), false, "record should not be saving");
      assert.equal(get(this, 'hasDirtyAttributes'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    },

    deleteRecord(store, type, snapshot) {
      assert.equal(callCount, 0, "didDelete callback was not called until didSaveRecord is called");

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });
  var asyncPerson;

  run(function() {
    asyncPerson = store.findRecord('person', 1);
  });

  assert.equal(callCount, 0, "precond - didDelete callback was not called yet");

  run(function() {
    asyncPerson.then(function(person) {
      return run(function() {
        person.deleteRecord();
        return person.save();
      });
    }).then(function() {
      assert.equal(callCount, 1, "didDelete called after delete");
    });
  });
});

test("an uncommited record also receives a didDelete callback when it is deleted", function(assert) {
  assert.expect(4);

  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    didDelete() {
      callCount++;
      assert.equal(get(this, 'isSaving'), false, "record should not be saving");
      assert.equal(get(this, 'hasDirtyAttributes'), false, "record should not be dirty");
    }
  });

  var store = createStore({
    adapter: DS.Adapter.extend(),
    person: Person
  });

  var person;
  run(function() {
    person = store.createRecord('person', { name: 'Tomster' });
  });

  assert.equal(callCount, 0, "precond - didDelete callback was not called yet");

  run(function() {
    person.deleteRecord();
  });

  assert.equal(callCount, 1, "didDelete called after delete");
});

test("a record receives a becameInvalid callback when it became invalid", function(assert) {
  assert.expect(5);

  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    becameInvalid() {
      callCount++;

      assert.equal(get(this, 'isSaving'), false, "record should not be saving");
      assert.equal(get(this, 'hasDirtyAttributes'), true, "record should be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    },

    updateRecord(store, type, snapshot) {
      assert.equal(callCount, 0, "becameInvalid callback was not called until recordWasInvalid is called");

      return Ember.RSVP.reject(new DS.InvalidError([
        {
          title: "Invalid Attribute",
          detail: "error",
          source: {
            pointer: "/data/attributes/bar"
          }
        }
      ]));
    }
  });

  var store = createStore({
    adapter: adapter,
    person: Person
  });
  var asyncPerson;

  run(function() {
    asyncPerson = store.findRecord('person', 1);
  });
  assert.equal(callCount, 0, "precond - becameInvalid callback was not called yet");

  // Make sure that the error handler has a chance to attach before
  // save fails.
  run(function() {
    asyncPerson.then(function(person) {
      return run(function() {
        person.set('bar', "Bar");
        return person.save();
      });
    }).then(null, function() {
      assert.equal(callCount, 1, "becameInvalid called after invalidating");
    });
  });
});

test("an ID of 0 is allowed", function(assert) {

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({
    person: Person
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '0',
        attributes: {
          name: "Tom Dale"
        }
      }
    });
  });

  assert.equal(store.peekAll('person').objectAt(0).get('name'), "Tom Dale", "found record with id 0");
});
