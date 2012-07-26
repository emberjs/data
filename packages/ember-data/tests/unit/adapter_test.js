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

test("by default, commit calls updateRecords once per type", function() {
  expect(9);

  adapter.updateRecords = function(store, type, array) {
    equal(type, Person, "the type is correct");
    equal(get(array, 'length'), 2, "the array is the right length");

    array.forEach(function(item) {
      equal(get(item, 'isSaving'), true, "the item is saving");
    });

    store.didUpdateRecords(array);

    array.forEach(function(item) {
      equal(get(item, 'isSaving'), false, "the item is no longer saving");
      equal(get(item, 'isLoaded'), true, "the item is loaded");
    });
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  set(tom, "name", "Tom Dale");
  set(yehuda, "name", "Yehuda Katz");

  store.commit();

  equal(get(store.find(Person, 2), "name"), "Yehuda Katz", "record was updated");

  // there is nothing to commit, so there won't be any records
  store.commit();
});
