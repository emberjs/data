var get = Ember.get, set = Ember.set;
var adapter, storeStub, Person;

module("DS.Adapter", {
  setup: function() {
    adapter = DS.Adapter.create();
    Person = Ember.Object.extend();
    storeStub = Ember.Object.create();
  },

  teardown: function() {
    adapter.destroy();
  }
});

test("The `commit` method should call `createRecords` once per type.", function() {
  expect(2);

  adapter.createRecords = function(store, type, array) {
    equal(type, Person, "the passed type is Person");
    equal(get(array, 'length'), 2, 'the array is has two items');
  };

  var tom = Person.create({ name: "Tom Dale", updatedAt: null });
  var yehuda = Person.create({ name: "Yehuda Katz" });

  adapter.commit(storeStub, {
    updated: [],
    deleted: [],
    created: [tom, yehuda]
  });
});

test("The `commit` method should call `updateRecords` once per type.", function() {
  expect(2);

  adapter.updateRecords = function(store, type, array) {
    equal(type, Person, "the type is Person");
    equal(get(array, 'length'), 2, "the array has two items");
  };

  var tom = Person.create({ name: "Tom Dale", updatedAt: null });
  var yehuda = Person.create({ name: "Yehuda Katz" });

  adapter.commit(storeStub, {
    updated: [tom, yehuda],
    deleted: [],
    created: []
  });
});

test("The `commit` method should call `deleteRecords` once per type.", function() {
  expect(2);

  adapter.deleteRecords = function(store, type, array) {
    equal(type, Person, "the type is Person");
    equal(get(array, 'length'), 2, "the array has two items");
  };

  var tom = Person.create({ name: "Tom Dale", updatedAt: null });
  var yehuda = Person.create({ name: "Yehuda Katz" });

  adapter.commit(storeStub, {
    updated: [],
    deleted: [tom, yehuda],
    created: []
  });
});
