var get = Ember.get, set = Ember.set;
var Person, store, adapter;

module("Reloading Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    Person.toString = function() { return "Person"; };

    adapter = DS.Adapter.create();
    store = DS.Store.create({ adapter: adapter });
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
  }
});

asyncTest("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  expect(5);

  var count = 0;

  adapter.find = function(store, type, id) {
    if (count === 0) {
      setTimeout(function() {
        adapter.didFindRecord(store, type, { person: { name: "Tom Dale" } }, id);
        firstFound();
      });
      count++;
    } else if (count === 1) {
      setTimeout(function() {
        adapter.didFindRecord(store, type, { person: { name: "Braaaahm Dale" } }, id);
        secondFound();
      });
      count++;
    } else {
      ok(false, "Should not get here");
    }
  };

  var person = store.find(Person, 1);

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

  adapter.find = function(store, type, id) {
    if (count === 0) {
      setTimeout(function() {
        adapter.didFindRecord(store, type, { person: { name: "Tom Dale" } }, id);
        found();
      });
      count++;
    } else {
      ok(false, "Should not get here");
    }
  };

  var person = store.find(Person, 1);

  function found() {
    start();
    set(person, 'name', "Braaaaahm Dale");

    raises(function() {
      person.reload();
    }, /uncommitted/);
  }
});
