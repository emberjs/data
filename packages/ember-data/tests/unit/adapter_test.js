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

  adapter.createRecords = function(store, type, set) {
    equal(type, Person, "the passed type is Person");
    equal(get(set.toArray(), 'length'), 2, 'the array is has two items');
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

  adapter.updateRecords = function(store, type, set) {
    equal(type, Person, "the type is Person");
    equal(get(set.toArray(), 'length'), 2, "the array has two items");
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

  adapter.deleteRecords = function(store, type, set) {
    equal(type, Person, "the type is Person");
    equal(get(set.toArray(), 'length'), 2, "the array has two items");
  };

  var tom = Person.create({ name: "Tom Dale", updatedAt: null });
  var yehuda = Person.create({ name: "Yehuda Katz" });

  adapter.commit(storeStub, {
    updated: [],
    deleted: [tom, yehuda],
    created: []
  });
});

var serializerMock, transformsPassed;

module("DS.Adapter - Transformations", {
  setup: function() {
    transformsPassed = {};

    serializerMock = Ember.Object.create({
      registerTransform: function(type, transforms) {
        transformsPassed[type] = transforms;
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

  var parentUnobtainium = {
    serialize: function(value) {
      return 'serialize';
    },

    fromData: function(value) {
      return 'fromData';
    }
  };

  Adapter.registerTransform('unobtainium', parentUnobtainium);

  var ChildAdapter = Adapter.extend();

  var childAdamantium = {
    serialize: function(value) {
      return 'adamantium serialize';
    },

    fromData: function(value) {
      return 'adamantium fromData';
    }
  };

  ChildAdapter.registerTransform('adamantium', childAdamantium);

  var parentOtherType = {
    serialize: function(value) {
      return 'otherType serialize';
    },

    fromData: function(value) {
      return 'otherType fromData';
    }
  };

  Adapter.registerTransform('otherType', parentOtherType);

  ChildAdapter.create({
    serializer: serializerMock
  });

  deepEqual(transformsPassed, {
    unobtainium: parentUnobtainium,
    adamantium: childAdamantium,
    otherType: parentOtherType
  });
});

test("Transforms registered subclasses take precedence over super classes.", function() {
  var ParentAdapter = DS.Adapter.extend();
  var ChildAdapter = ParentAdapter.extend();

  var childUnobtainium = {
    serialize: Ember.K,
    fromData: Ember.K
  };

  var parentUnobtainium = {
    serialize: Ember.K,
    fromData: Ember.K
  };

  ChildAdapter.registerTransform('unobtainium', childUnobtainium);
  ParentAdapter.registerTransform('unobtainium', parentUnobtainium);

  ChildAdapter.create({
    serializer: serializerMock
  });

  deepEqual(transformsPassed, {
    unobtainium: childUnobtainium
  });
});

var mappingsPassed;

module("DS.Adapter - Mapping", {
  setup: function() {
    mappingsPassed = {};

    serializerMock = Ember.Object.create({
      map: function(type, mappings) {
        var mappingsForType = mappingsPassed[type] = mappingsPassed[type] || {};

        for (var prop in mappings) {
          if (!mappings.hasOwnProperty(prop)) { continue; }

          mappingsForType[prop] = mappings[prop];
        }
      }
    });
  },

  teardown: function() {
    serializerMock.destroy();
  }
});

test("Mappings registered on an adapter class should be set on the adapter's serializer at initialization time.", function() {
  var Adapter = DS.Adapter.extend();
  var oldLookup = Ember.lookup;
  Ember.lookup = {
    App: {}
  };

  Ember.lookup.App.Person = Ember.Object.extend();

  Adapter.map('App.Person', {
    firstName: { key: 'FIRST_NAME' }
  });

  var ChildAdapter = Adapter.extend();

  ChildAdapter.map('App.Person', {
    lastName: { key: 'LAST_NAME' }
  });

  Adapter.map('App.Person', {
    middleName: { key: 'MIDDLE_NAME' },
    lastName: { key: 'SHOULD_NOT_WORK' }
  });

  ChildAdapter.create({
    serializer: serializerMock
  });

  deepEqual(mappingsPassed, {
    'App.Person': {
      firstName: { key: 'FIRST_NAME' },
      lastName: { key: 'LAST_NAME' },
      middleName: { key: 'MIDDLE_NAME' }
    }
  });

  Ember.lookup = oldLookup;
});
