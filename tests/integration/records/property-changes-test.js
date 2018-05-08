import Ember from 'ember';
import { resolve } from 'rsvp';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

var env, store, Person;
var attr = DS.attr;

module('integration/records/property-changes - Property changes', {
  beforeEach() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      emails: attr({ deepCompare: true }),
      nicknames: attr()
    });

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  afterEach() {
    run(function() {
      env.container.destroy();
    });
  }
});

test('Calling push with partial records trigger observers for just those attributes that changed', function(assert) {
  assert.expect(1);
  var person;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        }
      }
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('firstName', function() {
    assert.ok(false, 'firstName observer should not be triggered');
  });

  person.addObserver('lastName', function() {
    assert.ok(true, 'lastName observer should be triggered');
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz!'
        }
      }
    });
  });
});

test('Calling push does not trigger observers for locally changed attributes with the same value', function(assert) {
  assert.expect(0);
  var person;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        }
      }
    });
    person = store.peekRecord('person', 'wat');
    person.set('lastName', 'Katz!');
  });

  person.addObserver('firstName', function() {
    assert.ok(false, 'firstName observer should not be triggered');
  });

  person.addObserver('lastName', function() {
    assert.ok(false, 'lastName observer should not be triggered');
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz!'
        }
      }
    });
  });
});

test('Saving a record trigger observers for locally changed attributes with the same canonical value', function(assert) {
  assert.expect(1);
  var person;

  env.adapter.updateRecord = function(store, type, snapshot) {
    return resolve({ data: { id: 'wat', type: 'person', attributes: { 'last-name': 'Katz' } } });
  };

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        }
      }
    });
    person = store.peekRecord('person', 'wat');
    person.set('lastName', 'Katz!');
  });

  person.addObserver('firstName', function() {
    assert.ok(false, 'firstName observer should not be triggered');
  });

  person.addObserver('lastName', function() {
    assert.ok(true, 'lastName observer should be triggered');
  });

  run(function() {
    person.save();
  });
});

test('Saving a unchanged record should not trigger observers for properties with deepCompare option set to true', function(assert) {
  assert.expect(0);
  var person;

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ data: { id: 'wat', type: 'person', attributes: { 'emails': ['email@email.com'] } } });
  };

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          emails: ['email@email.com']
        }
      }
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('emails.[]', function() {
    assert.ok(false, 'emails.[] observer should not be triggered');
  });

  person.addObserver('emails', function() {
    assert.ok(false, 'emails observer should not be triggered');
  });

  run(function() {
    person.save();
  });
});

test('Saving a changed record should trigger observers for properties with deepCompare option set to true', function(assert) {
  assert.expect(2);
  var person;

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ data: { id: 'wat', type: 'person', attributes: { 'emails': ['email1@email.com'] } } });
  };

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          emails: ['email@email.com']
        }
      }
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('emails.[]', function() {
    assert.ok(true, 'emails.[] observer should be triggered');
  });

  person.addObserver('emails', function() {
    assert.ok(true, 'emails observer should be triggered');
  });

  run(function() {
    person.save();
  });
});

test('Saving a unchanged record should trigger observers for properties without deepCompare option set to true', function(assert) {
  assert.expect(2);
  var person;

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ data: { id: 'wat', type: 'person', attributes: { 'nicknames': ['Batman'] } } });
  };

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          nicknames: ['Batman']
        }
      }
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('nicknames.[]', function() {
    assert.ok(true, 'nicknames.[] observer should be triggered');
  });

  person.addObserver('nicknames', function() {
    assert.ok(true, 'nicknames observer should be triggered');
  });

  run(function() {
    person.save();
  });
});

test('Saving a changed record should trigger observers for properties without deepCompare option set to true', function(assert) {
  assert.expect(2);
  var person;

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ data: { id: 'wat', type: 'person', attributes: { 'nicknames': ['Batman'] } } });
  };

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          nicknames: ['Robin']
        }
      }
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('nicknames.[]', function() {
    assert.ok(true, 'nicknames.[] observer should be triggered');
  });

  person.addObserver('nicknames', function() {
    assert.ok(true, 'nicknames observer should be triggered');
  });

  run(function() {
    person.save();
  });
});

test('store.push should not override a modified attribute', function(assert) {
  assert.expect(1);
  var person;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        }
      }
    });
    person = store.peekRecord('person', 'wat');
    person.set('lastName', 'Katz!');
  });

  person.addObserver('firstName', function() {
    assert.ok(true, 'firstName observer should be triggered');
  });

  person.addObserver('lastName', function() {
    assert.ok(false, 'lastName observer should not be triggered');
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        }
      }
    });
  });
});
