var env, store, Person;

module("unit/model/rollback - model.rollback()", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr()
    });

    env = setupStore({ person: Person });
    store = env.store;
  }
});

test("changes to attributes can be rolled back", function() {
  var person = store.push('person', { id: 1, firstName: "Tom", lastName: "Dale" });

  person.set('firstName', "Thomas");

  equal(person.get('firstName'), "Thomas");

  person.rollback();

  equal(person.get('firstName'), "Tom");
  equal(person.get('isDirty'), false);
});

test("changes to attributes made after a record is in-flight only rolls back the local changes", function() {
  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  var person = store.push('person', { id: 1, firstName: "Tom", lastName: "Dale" });

  person.set('firstName', "Thomas");

  // Make sure the save is async
  Ember.run(function() {
    var saving = person.save();

    equal(person.get('firstName'), "Thomas");

    person.set('lastName', "Dolly");

    equal(person.get('lastName'), "Dolly");

    person.rollback();

    equal(person.get('firstName'), "Thomas");
    equal(person.get('lastName'), "Dale");
    equal(person.get('isSaving'), true);

    saving.then(async(function() {
      equal(person.get('isDirty'), false, "The person is now clean");
    }));
  });
});
