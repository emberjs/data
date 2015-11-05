import DS from 'ember-data';

var get = Ember.get;
var attr = DS.attr;
var Person, env;
var run = Ember.run;

module("integration/reload - Reloading Records", {
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
    run(env.container, 'destroy');
  }
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  var count = 0;

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (count === 0) {
      count++;
      return Ember.RSVP.resolve({ id: id, name: "Tom Dale" });
    } else if (count === 1) {
      count++;
      return Ember.RSVP.resolve({ id: id, name: "Braaaahm Dale" });
    } else {
      ok(false, "Should not get here");
    }
  };

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      equal(get(person, 'name'), "Tom Dale", "The person is loaded with the right name");
      equal(get(person, 'isLoaded'), true, "The person is now loaded");
      var promise = person.reload();
      equal(get(person, 'isReloading'), true, "The person is now reloading");
      return promise;
    }).then(function(person) {
      equal(get(person, 'isReloading'), false, "The person is no longer reloading");
      equal(get(person, 'name'), "Braaaahm Dale", "The person is now updated with the right name");
    });
  });
});

test("When a record is reloaded and fails, it can try again", function() {
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
    equal(tom.get('isReloading'), true, "Tom is reloading");
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ id: 1, name: "Thomas Dale" });
    }
  };

  run(function() {
    tom.reload().then(null, function() {
      equal(tom.get('isError'), true, "Tom is now errored");
      equal(tom.get('isReloading'), false, "Tom is no longer reloading");
      return tom.reload();
    }).then(function(person) {
      equal(person, tom, "The resolved value is the record");
      equal(tom.get('isError'), false, "Tom is no longer errored");
      equal(tom.get('isReloading'), false, "Tom is no longer reloading");
      equal(tom.get('name'), "Thomas Dale", "the updates apply");
    });
  });
});

test("When a record is loaded a second time, isLoaded stays true", function() {
  env.adapter.findRecord = function(store, type, id, snapshot) {
    return { id: 1, name: "Tom Dale" };
  };
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
  });

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      equal(get(person, 'isLoaded'), true, "The person is loaded");
      person.addObserver('isLoaded', isLoadedDidChange);

      // Reload the record
      env.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale'
          }
        }
      });

      equal(get(person, 'isLoaded'), true, "The person is still loaded after load");

      person.removeObserver('isLoaded', isLoadedDidChange);
    });
  });

  function isLoadedDidChange() {
    // This shouldn't be hit
    equal(get(this, 'isLoaded'), true, "The person is still loaded after change");
  }
});

test("When a record is reloaded, its async hasMany relationships still work", function() {
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
        return Ember.RSVP.resolve({ id: 1, name: "Tom", tags: [1, 2] });
      case 'tag':
        return Ember.RSVP.resolve({ id: id, name: tags[id] });
    }
  };

  var tom;

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      tom = person;
      equal(person.get('name'), "Tom", "precond");

      return person.get('tags');
    }).then(function(tags) {
      deepEqual(tags.mapBy('name'), ['hipster', 'hair']);

      return tom.reload();
    }).then(function(person) {
      equal(person.get('name'), "Tom", "precond");

      return person.get('tags');
    }).then(function(tags) {
      deepEqual(tags.mapBy('name'), ['hipster', 'hair'], "The tags are still there");
    });
  });
});
