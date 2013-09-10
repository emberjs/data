var get = Ember.get, set = Ember.set;
var attr = DS.attr;
var Person, env;

module("integration/unload - Unloading Records", {
  setup: function() {
    Person = DS.Model.extend({
      name: attr('string'),
    });

    Person.toString = function() { return "Person"; };

    env = setupStore({ person: Person });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("can unload a single record", function () {
  var adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});

  adam.unloadRecord();

  equal(env.store.all('person').get('length'), 0);
});

test("can unload all records for a given type", function () {
  var adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});
  var bob = env.store.push('person', {id: 2, name: "Bob Bobson"});

  env.store.unloadAll('person');

  equal(env.store.all('person').get('length'), 0);
});
