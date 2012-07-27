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
var serializerMock, typesPassed, transformsPassed;

module("DS.Adapter - Transformations", {
  setup: function() {
    typesPassed = [];
    transformsPassed = [];

    serializerMock = DS.MockObject.create({
      registerTransform: function(type, transforms) {
        typesPassed.push(type);
        transformsPassed.push(transforms);
      }
    });
  },

  teardown: function() {
    serializerMock.destroy();
  }
});

var contains = function(array, item, message) {
  ok(Ember.ArrayPolyfills.indexOf.call(array, item) > -1, message);
};

test("Transformations registered on an adapter class should be set on the adapter's serializer at initialization time.", function() {
  // Make sure that transformations on parent adapter classes are included
  // if subclasses are created.

  var Adapter = DS.Adapter.extend();

  Adapter.registerTransform('unobtainium', {
    toJSON: function(value) {
      return 'toJSON';
    },

    fromJSON: function(value) {
      return 'fromJSON';
    }
  });

  var ChildAdapter = Adapter.extend();

  ChildAdapter.registerTransform('adamantium', {
    toJSON: function(value) {
      return 'adamantium toJSON';
    },

    fromJSON: function(value) {
      return 'adamantium fromJSON';
    }
  });

  ChildAdapter.create({
    serializer: serializerMock
  });

  equal(typesPassed.length, 2, "two types were registered");
  equal(transformsPassed.length, 2, "two transforms were registered");

  contains(typesPassed, 'unobtainium', "unobtainium is registered");
  contains(typesPassed, 'adamantium', "adamantium is registered");
});
