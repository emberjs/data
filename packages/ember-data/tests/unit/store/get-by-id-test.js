var env, store, Person;
var run = Ember.run;

module("unit/store/getById - Store getById", {
  setup: function() {

    Person = DS.Model.extend();
    Person.toString = function() {
      return 'Person';
    };

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  teardown: function() {
    Ember.run(store, 'destroy');
  }
});

test("getById should return the record if it is in the store ", function() {

  run(function() {
    var person = store.push({
      data: {
        type: 'person',
        id: 1
      }
    });
    equal(person, store.getById('person', 1), 'getById only return the corresponding record in the store');
  });
});

test("getById should return null if the record is not in the store ", function() {
  run(function() {
    equal(null, store.getById('person', 1), 'getById returns null if the corresponding record is not in the store');
  });
});
