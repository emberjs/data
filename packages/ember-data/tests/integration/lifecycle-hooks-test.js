var Person, env;
var attr = DS.attr;
var resolve = Ember.RSVP.resolve;
var run = Ember.run;

module("integration/lifecycle_hooks - Lifecycle Hooks", {
  setup: function() {
    Person = DS.Model.extend({
      name: attr('string')
    });

    env = setupStore({
      person: Person
    });
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

asyncTest("When the adapter acknowledges that a record has been created, a `didCreate` event is triggered.", function() {
  expect(3);

  env.adapter.createRecord = function(store, type, snapshot) {
    return resolve({ id: 99, name: "Yehuda Katz" });
  };
  var person;

  run(function() {
    person = env.store.createRecord(Person, { name: "Yehuda Katz" });
  });

  person.on('didCreate', function() {
    equal(this, person, "this is bound to the record");
    equal(this.get('id'), "99", "the ID has been assigned");
    equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
    start();
  });

  run(person, 'save');
});

test("When the adapter acknowledges that a record has been created without a new data payload, a `didCreate` event is triggered.", function() {
  expect(3);

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve();
  };
  var person;

  run(function() {
    person = env.store.createRecord(Person, { id: 99, name: "Yehuda Katz" });
  });

  person.on('didCreate', function() {
    equal(this, person, "this is bound to the record");
    equal(this.get('id'), "99", "the ID has been assigned");
    equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
  });

  run(person, 'save');
});
