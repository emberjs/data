var store, adapter, Person, person;

module("Lifecycle Hooks", {
  setup: function() {
    adapter = DS.Adapter.create();
    store = DS.Store.create({
      adapter: adapter
    });

    var attr = DS.attr;
    Person = DS.Model.extend({
      name: attr('string'),
      nickname: attr('string')
    });

    Person.toString = function() {
      return 'Person';
    };
  },

  teardown: function() {
    Ember.run(function() {
      person.destroy();
      store.destroy();
    });
  }
});

test("When the adapter acknowledges that a record has been created, a `didCreate` event is triggered.", function() {
  expect(4);

  adapter.createRecord = function(store, type, record) {
    adapter.didCreateRecord(store, type, record, { person: { id: 99, name: "Yehuda Katz" }});
  };

  person = store.createRecord(Person, { name: "Yehuda Katz", nickname: 'wycats' });

  person.one('didCreate', function() {
    equal(this, person, "this is bound to the record");
    equal(this.get('id'), "99", "the ID has been assigned");
    equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
    equal(this.get('nickname'), "wycats", "the attribute from server has been assigned");
  });

  store.commit();
});

test("When the adapter acknowledges that a record has been created without a new data payload, a `didCreate` event is triggered.", function() {
  expect(3);

  adapter.createRecord = function(store, type, record) {
    adapter.didCreateRecord(store, type, record);
  };

  person = store.createRecord(Person, { id: 99, name: "Yehuda Katz" });

  person.one('didCreate', function() {
    equal(this, person, "this is bound to the record");
    equal(this.get('id'), "99", "the ID has been assigned");
    equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
  });

  store.commit();
});
