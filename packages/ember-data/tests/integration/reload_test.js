var get = Ember.get, set = Ember.set;
var attr = DS.attr;
var Person, env;

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
    env.container.destroy();
  }
});

asyncTest("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  expect(5);

  var count = 0;

  env.adapter.find = function(store, type, id) {
    if (count === 0) {
      setTimeout(function() {
        env.adapter.didFindRecord(store, type, { person: { id: id, name: "Tom Dale" } });
        firstFound();
      });
      count++;
    } else if (count === 1) {
      setTimeout(function() {
        env.adapter.didFindRecord(store, type, { person: { id: id, name: "Braaaahm Dale" } });
        secondFound();
      });
      count++;
    } else {
      ok(false, "Should not get here");
    }
  };

  var person = env.store.find('person', 1);

  var waitingFor = 2;

  function done() {
    if (--waitingFor === 0) { start(); }
  }

  function firstFound() {
    equal(get(person, 'name'), "Tom Dale", "The person is loaded with the right name");
    equal(get(person, 'isLoaded'), true, "The person is now loaded");
    person.one('didReload', done);
    person.reload();
    equal(get(person, 'isReloading'), true, "The person is now reloading");
  }

  function secondFound() {
    done();
    equal(get(person, 'isReloading'), false, "The person is no longer reloading");
    equal(get(person, 'name'), "Braaaahm Dale", "The person is now updated with the right name");
  }
});

asyncTest("If a record is modified, it cannot be reloaded", function() {
  var count = 0;

  env.adapter.find = function(store, type, id) {
    if (count === 0) {
      setTimeout(function() {
        env.adapter.didFindRecord(store, type, { person: { id: id, name: "Tom Dale" } });
        found();
      });
      count++;
    } else {
      ok(false, "Should not get here");
    }
  };

  var person = env.store.find('person', 1);

  function found() {
    start();
    set(person, 'name', "Braaaaahm Dale");

    raises(function() {
      person.reload();
    }, /uncommitted/);
  }
});


asyncTest("When a record is loaded a second time, isLoaded stays true", function() {
  env.store.push('person', { id: 1, name: "Tom Dale" });

  var person = env.store.find('person', 1);

  equal(get(person, 'isLoaded'), true, "The person is loaded");

  function isLoadedDidChange() {
    // This shouldn't be hit
    equal(get(person, 'isLoaded'), true, "The person is still loaded after change");
  }
  person.addObserver('isLoaded', isLoadedDidChange);

  // Reload the record
  env.store.push('person', { id: 1, name: "Tom Dale" });
  equal(get(person, 'isLoaded'), true, "The person is still loaded after load");

  person.removeObserver('isLoaded', isLoadedDidChange);

  start();
});
