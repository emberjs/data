var env, store, Person;
var run = Ember.run;

module("unit/store/peekRecord - Store peekRecord", {
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

test("peekRecord should return the record if it is in the store ", function() {
  run(function() {
    var person = store.push('person', { id: 1 });
    equal(person, store.peekRecord('person', 1), 'peekRecord only return the corresponding record in the store');
  });
});

test("peekRecord should return null if the record is not in the store ", function() {
  run(function() {
    equal(null, store.peekRecord('person', 1), 'peekRecord returns null if the corresponding record is not in the store');
  });
});

test("getById is deprecated", function() {
  expectDeprecation(
    function() {
      run(function() {
        store.push('person', { id: 1 });
        store.getById('person', 1);
      });
    },
    'Using store.getById() has been deprecated. Use store.peekRecord to get a record by a given type and ID without triggering a fetch.'
  );
});
