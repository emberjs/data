import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var Person, env;
var attr = DS.attr;
var resolve = Ember.RSVP.resolve;
var run = Ember.run;

module("integration/lifecycle_hooks - Lifecycle Hooks", {
  beforeEach: function() {
    Person = DS.Model.extend({
      name: attr('string')
    });

    env = setupStore({
      person: Person
    });
  },

  afterEach: function() {
    run(env.container, 'destroy');
  }
});

test("When the adapter acknowledges that a record has been created, a `didCreate` event is triggered.", function(assert) {
  let done = assert.async();
  assert.expect(3);

  env.adapter.createRecord = function(store, type, snapshot) {
    return resolve({ id: 99, name: "Yehuda Katz" });
  };
  var person;

  run(function() {
    person = env.store.createRecord('person', { name: "Yehuda Katz" });
  });

  person.on('didCreate', function() {
    assert.equal(this, person, "this is bound to the record");
    assert.equal(this.get('id'), "99", "the ID has been assigned");
    assert.equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
    done();
  });

  run(person, 'save');
});

test("When the adapter acknowledges that a record has been created without a new data payload, a `didCreate` event is triggered.", function(assert) {
  assert.expect(3);

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve();
  };
  var person;

  run(function() {
    person = env.store.createRecord('person', { id: 99, name: "Yehuda Katz" });
  });

  person.on('didCreate', function() {
    assert.equal(this, person, "this is bound to the record");
    assert.equal(this.get('id'), "99", "the ID has been assigned");
    assert.equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
  });

  run(person, 'save');
});
