var Person, env;
var attr = DS.attr;

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
    env.container.destroy();
  }
});

test("When the adapter acknowledges that a record has been created, a `didCreate` event is triggered.", function() {
  expect(3);

  env.adapter.createRecord = function(store, type, record) {
    store.didSaveRecord(record, { id: 99, name: "Yehuda Katz" });
  };

  var person = env.store.createRecord(Person, { name: "Yehuda Katz" });

  person.on('didCreate', function() {
    equal(this, person, "this is bound to the record");
    equal(this.get('id'), "99", "the ID has been assigned");
    equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
  });

  env.store.commit();
});

test("When the adapter acknowledges that a record has been created without a new data payload, a `didCreate` event is triggered.", function() {
  expect(3);

  env.adapter.createRecord = function(store, type, record) {
    store.didSaveRecord(record);
  };

  var person = env.store.createRecord(Person, { id: 99, name: "Yehuda Katz" });

  person.on('didCreate', function() {
    equal(this, person, "this is bound to the record");
    equal(this.get('id'), "99", "the ID has been assigned");
    equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
  });

  env.store.commit();
});
