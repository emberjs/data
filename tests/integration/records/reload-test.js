import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var get = Ember.get;
var attr = DS.attr;
var Person, env;
var run = Ember.run;

module("integration/reload - Reloading Records", {
  beforeEach() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });

    env = setupStore({ person: Person });
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function(assert) {
  var count = 0;

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (count === 0) {
      count++;
      return Ember.RSVP.resolve({ data: { id: id, type: 'person', attributes: { name: "Tom Dale" } } });
    } else if (count === 1) {
      count++;
      return Ember.RSVP.resolve({ data: { id: id, type: 'person', attributes: { name: "Braaaahm Dale" } } });
    } else {
      assert.ok(false, "Should not get here");
    }
  };

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      assert.equal(get(person, 'name'), "Tom Dale", "The person is loaded with the right name");
      assert.equal(get(person, 'isLoaded'), true, "The person is now loaded");
      var promise = person.reload();
      assert.equal(get(person, 'isReloading'), true, "The person is now reloading");
      return promise;
    }).then(function(person) {
      assert.equal(get(person, 'isReloading'), false, "The person is no longer reloading");
      assert.equal(get(person, 'name'), "Braaaahm Dale", "The person is now updated with the right name");
    });
  });
});

test("When a record is reloaded and fails, it can try again", function(assert) {
  var tom;
  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        }
      }
    });
    tom = env.store.peekRecord('person', 1);
  });

  var count = 0;
  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(tom.get('isReloading'), true, "Tom is reloading");
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ data: { id: 1, type: 'person', attributes: { name: "Thomas Dale" } } });
    }
  };

  run(function() {
    tom.reload().then(null, function() {
      assert.equal(tom.get('isError'), true, "Tom is now errored");
      assert.equal(tom.get('isReloading'), false, "Tom is no longer reloading");
      return tom.reload();
    }).then(function(person) {
      assert.equal(person, tom, "The resolved value is the record");
      assert.equal(tom.get('isError'), false, "Tom is no longer errored");
      assert.equal(tom.get('isReloading'), false, "Tom is no longer reloading");
      assert.equal(tom.get('name'), "Thomas Dale", "the updates apply");
    });
  });
});

test("When a record is loaded a second time, isLoaded stays true", function(assert) {
  let record = {
    data: {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Tom Dale'
      }
    }
  };
  env.adapter.findRecord = function(store, type, id, snapshot) {
    return record;
  };
  run(function() {
    env.store.push(record);
  });

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      assert.equal(get(person, 'isLoaded'), true, "The person is loaded");
      person.addObserver('isLoaded', isLoadedDidChange);

      // Reload the record
      env.store.push(record);

      assert.equal(get(person, 'isLoaded'), true, "The person is still loaded after load");

      person.removeObserver('isLoaded', isLoadedDidChange);
    });
  });

  function isLoadedDidChange() {
    // This shouldn't be hit
    assert.equal(get(this, 'isLoaded'), true, "The person is still loaded after change");
  }
});

test("When a record is reloaded, its async hasMany relationships still work", function(assert) {
  env.registry.register('model:person', DS.Model.extend({
    name: DS.attr(),
    tags: DS.hasMany('tag', { async: true })
  }));

  env.registry.register('model:tag', DS.Model.extend({
    name: DS.attr()
  }));

  var tags = { 1: "hipster", 2: "hair" };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    switch (type.modelName) {
      case 'person':
        return Ember.RSVP.resolve({
          data: {
            id: 1,
            type: 'person',
            attributes: { name: "Tom" },
            relationships: {
              tags: {
                data: [
                  { id: 1, type: 'tag' },
                  { id: 2, type: 'tag' }
                ]
              }
            }
          }
        });
      case 'tag':
        return Ember.RSVP.resolve({ data: { id: id, type: 'tag', attributes: { name: tags[id] } } });
    }
  };

  var tom;

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      tom = person;
      assert.equal(person.get('name'), "Tom", "precond");

      return person.get('tags');
    }).then(function(tags) {
      assert.deepEqual(tags.mapBy('name'), ['hipster', 'hair']);

      return tom.reload();
    }).then(function(person) {
      assert.equal(person.get('name'), "Tom", "precond");

      return person.get('tags');
    }).then(function(tags) {
      assert.deepEqual(tags.mapBy('name'), ['hipster', 'hair'], "The tags are still there");
    });
  });
});
