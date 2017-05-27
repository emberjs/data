/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|dave|cersei)" }]*/

import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var attr = DS.attr;
var Person, env;
var run = Ember.run;
var get = Ember.get;

module("integration/deletedRecord - Deleting Records", {
  beforeEach() {
    Person = DS.Model.extend({
      name: attr('string')
    });
    Person.toString = () => { return 'Person'; };

    env = setupStore({
      person: Person
    });
  },

  afterEach() {
    Ember.run(function() {
      env.container.destroy();
    });
  }
});

test("records should not be removed from record arrays just after deleting, but only after committing them", function(assert) {
  var adam, dave;

  env.adapter.deleteRecord = function() {
    return Ember.RSVP.Promise.resolve();
  };

  var all;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Dave Sunderland'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    dave = env.store.peekRecord('person', 2);
    all  = env.store.peekAll('person');
  });


  // pre-condition
  assert.equal(all.get('length'), 2, 'pre-condition: 2 records in array');

  Ember.run(adam, 'deleteRecord');

  assert.equal(all.get('length'), 2, '2 records in array after deleteRecord');

  Ember.run(adam, 'save');

  assert.equal(all.get('length'), 1, '1 record in array after deleteRecord and save');
});

test('deleting a record that is part of a hasMany removes it from the hasMany recordArray', function(assert) {
  let group;
  let person;
  const Group = DS.Model.extend({
    people: DS.hasMany('person', { inverse: null, async: false })
  });
  Group.toString = () => { return 'Group'; }

  env.adapter.deleteRecord = function() {
    return Ember.RSVP.Promise.resolve();
  };

  env.registry.register('model:group', Group);

  run(function() {
    env.store.push({
      data: {
        type: 'group',
        id: '1',
        relationships: {
          people: {
            data: [
              { type: 'person', id: '1' },
              { type: 'person', id: '2' }
            ]
          }
        }
      },
      included: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland'
          }
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Dave Sunderland'
          }
        }
      ]
    });

    group = env.store.peekRecord('group', '1');
    person = env.store.peekRecord('person', '1');
  });

  // Sanity Check we are in the correct state.
  assert.equal(group.get('people.length'), 2, 'expected 2 related records before delete');
  assert.equal(person.get('name'), 'Adam Sunderland', 'expected related records to be loaded');

  run(function() {
    person.destroyRecord();
  });

  assert.equal(group.get('people.length'), 1, 'expected 1 related records after delete');
});

test("records can be deleted during record array enumeration", function(assert) {
  var adam, dave;

  env.adapter.deleteRecord = function() {
    return Ember.RSVP.Promise.resolve();
  };

  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Dave Sunderland'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    dave = env.store.peekRecord('person', 2);
  });
  var all = env.store.peekAll('person');

  // pre-condition
  assert.equal(all.get('length'), 2, 'expected 2 records');

  Ember.run(function() {
    all.forEach(function(record) {
      record.destroyRecord();
    });
  });

  assert.equal(all.get('length'), 0, 'expected 0 records');
  assert.equal(all.objectAt(0), null, "can't get any records");
});

test("when deleted records are rolled back, they are still in their previous record arrays", function(assert) {
  var jaime, cersei;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Jaime Lannister'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Cersei Lannister'
        }
      }]
    });
    jaime = env.store.peekRecord('person', 1);
    cersei = env.store.peekRecord('person', 2);
  });
  var all = env.store.peekAll('person');
  var filtered;
  run(function() {
    filtered = env.store.filter('person', function () {
      return true;
    });
  });

  assert.equal(all.get('length'), 2, 'precond - we start with two people');
  assert.equal(filtered.get('length'), 2, 'precond - we start with two people');

  run(function() {
    jaime.deleteRecord();
    jaime.rollbackAttributes();
  });
  assert.equal(all.get('length'), 2, 'record was not removed');
  assert.equal(filtered.get('length'), 2, 'record was not removed');
});

test("Deleting an invalid newly created record should remove it from the store", function(assert) {
  var record;
  var store = env.store;

  env.adapter.createRecord = function() {
    return Ember.RSVP.Promise.reject(new DS.InvalidError([
      {
        title: 'Invalid Attribute',
        detail: 'name is invalid',
        source: {
          pointer: '/data/attributes/name'
        }
      }
    ]));
  };

  run(function() {
    record = store.createRecord('person', { name: 'pablobm' });
    // Invalidate the record to put it in the `root.loaded.created.invalid` state
    record.save().catch(() => {});
  });

  // Preconditions
  assert.equal(get(record, 'currentState.stateName'), 'root.loaded.created.invalid',
               'records should start in the created.invalid state');
  assert.equal(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

  run(function() {
    record.deleteRecord();
  });

  assert.equal(get(record, 'currentState.stateName'), 'root.deleted.saved');
  assert.equal(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
});


test("Destroying an invalid newly created record should remove it from the store", function(assert) {
  var record;
  var store = env.store;

  env.adapter.deleteRecord = function() {
    assert.fail('The adapter\'s deletedRecord method should not be called when the record was created locally.');
  };

  env.adapter.createRecord = function() {
    return Ember.RSVP.Promise.reject(new DS.InvalidError([
      {
        title: 'Invalid Attribute',
        detail: 'name is invalid',
        source: {
          pointer: '/data/attributes/name'
        }
      }
    ]));
  };

  run(function() {
    record = store.createRecord('person', { name: 'pablobm' });
    // Invalidate the record to put it in the `root.loaded.created.invalid` state
    record.save().catch(() => {});
  });

  // Preconditions
  assert.equal(get(record, 'currentState.stateName'), 'root.loaded.created.invalid',
               'records should start in the created.invalid state');
  assert.equal(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

  run(function() {
    record.destroyRecord();
  });

  assert.equal(get(record, 'currentState.stateName'), 'root.deleted.saved');
  assert.equal(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
});

test("Will resolve destroy and save in same loop", function(assert) {
  let adam, dave;
  let promises;

  assert.expect(1);

  env.adapter.createRecord = function() {
    assert.ok(true, 'save operation resolves');
    return Ember.RSVP.Promise.resolve({ id: 123 });
  };

  run(function() {
    adam = env.store.createRecord('person', { name: 'Adam Sunderland' });
    dave = env.store.createRecord('person', { name: 'Dave Sunderland' });
  });

  run(function() {
    promises = [
      adam.destroyRecord(),
      dave.save()
    ];
  });

  return Ember.RSVP.all(promises);
});
