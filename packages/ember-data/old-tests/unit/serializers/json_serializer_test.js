var map = Ember.EnumerableUtils.map;

var MockModel = Ember.Object.extend({
  init: function() {
    this.materializedAttributes = {};
    this.hasMany = {};
    this.belongsTo = {};
  },

  eachAttribute: function(callback, binding) {
    var attributes = this.constructor.attributes || {};

    for (var prop in attributes) {
      if (!attributes.hasOwnProperty(prop)) { continue; }
      callback.call(binding, prop, { type: attributes[prop] });
    }
  },

  eachRelationship: function(callback, binding) {
    var relationships = this.constructor.relationships;

    for (var prop in relationships) {
      if (!relationships.hasOwnProperty(prop)) { continue; }
      callback.call(binding, prop, relationships[prop]);
    }
  },

  materializeId: function(id) {
    this.materializedId = id;
  },

  materializeAttribute: function(name, value) {
    this.materializedAttributes[name] = value;
  },

  materializeHasMany: function(name, ids) {
    this.hasMany[name] = ids;
  },

  materializeBelongsTo: function(name, id) {
    this.belongsTo[name] = id;
  }
});

var serializer, Person, Animal, Cat;

module("DS.JSONSerializer - Mapping API", {
  setup: function() {
    serializer = DS.JSONSerializer.create();
    Person = MockModel.extend();
    window.Address = MockModel.extend();
  },

  teardown: function() {
    serializer.destroy();
    window.Address = null;
  }
});

test("Mapped attributes should be used when serializing a record to JSON.", function() {
  Person.attributes = { firstName: 'string' };
  window.Address.attributes = { firstName: 'string' };

  serializer.map(Person, {
    firstName: { key: 'FIRST_NAME' }
  });

  serializer.map('Address', {
    firstName: { key: 'first_name' }
  });

  var person = Person.create({
    firstName: "Tom"
  });

  var address = window.Address.create({
    firstName: "Spruce"
  });

  deepEqual(serializer.serialize(person), {
    FIRST_NAME: "Tom"
  });

  deepEqual(serializer.serialize(address), {
    first_name: "Spruce"
  });
});

test("Mapped attributes should be used when materializing a record from JSON.", function() {
  Person.attributes = { firstName: 'string' };
  window.Address.attributes = { firstName: 'string' };

  serializer.map(Person, {
    firstName: { key: 'FIRST_NAME' }
  });

  serializer.map('Address', {
    firstName: { key: 'first_name' }
  });

  var person = Person.create();
  var address = window.Address.create();

  serializer.materialize(person, { FIRST_NAME: "Tom" });
  serializer.materialize(address, { first_name: "Spruce" });

  deepEqual(person.get('materializedAttributes'), { firstName: "Tom" });
  deepEqual(address.get('materializedAttributes'), { firstName: "Spruce" });
});

test("Mapped relationships should be used when serializing a record to JSON.", function() {
  expect(8);

  Person.relationships = { addresses: { key: 'addresses', kind: 'hasMany', type: window.Address }};
  window.Address.relationships = { person: { key: 'person', kind: 'belongsTo', type: Person }};

  serializer.map(Person, {
    addresses: { key: 'ADDRESSES!' }
  });

  serializer.map('Address', {
    person: { key: 'MY_PEEP' }
  });

  var person = Person.create();
  var address = window.Address.create();

  serializer.addHasMany = function(hash, record, key, relationship) {
    ok(typeof hash === 'object', "a hash to build is passed");
    equal(record, person, "the record to serialize should be passed");
    equal(key, 'ADDRESSES!', "the key to add to the hash respects the mapping");

    // The mocked record uses a simplified relationship description
    deepEqual(relationship, {
      kind: 'hasMany',
      key: 'addresses',
      type: window.Address
    });
  };

  serializer.addBelongsTo = function(hash, record, key, relationship) {
    ok(typeof hash === 'object', "a hash to build is passed");
    equal(record, address, "the record to serialize should be passed");
    equal(key, 'MY_PEEP', "the key to add to the hash respects the mapping");

    // The mocked record uses a simplified relationship description
    deepEqual(relationship, {
      kind: 'belongsTo',
      key: 'person',
      type: Person
    });
  };

  serializer.serialize(person);
  serializer.serialize(address);
});

test("the id of a belongsTo relationship is serialized by using #serializeId", function() {
  Person.relationships = { addresses: { key: 'addresses', kind: 'hasMany', type: window.Address }};
  window.Address.relationships = { person: { key: 'person', kind: 'belongsTo', type: Person }};

  var person = Person.create({ id: 1 });
  var address = window.Address.create();

  address.set('person', person);

  serializer.serializeId = function(id) {
    return 'serialized_' + id;
  };

  deepEqual(serializer.serialize(address), {
    'person': 'serialized_1'
  });
});

test("mapped relationships are respected when materializing a record from JSON", function() {
  Person.relationships = { addresses: { key: 'addresses', kind: 'hasMany', type: window.Address }};
  window.Address.relationships = { person: { key: 'person', kind: 'belongsTo', type: Person }};

  serializer.map(Person, {
    addresses: { key: 'ADDRESSES!' }
  });

  serializer.map('Address', {
    person: { key: 'MY_PEEP' }
  });

  var person = Person.create();
  var address = window.Address.create();

  serializer.materialize(person, {
    'ADDRESSES!': [ 1, 2, 3 ]
  });

  serializer.materialize(address, {
    'MY_PEEP': 1
  });

  deepEqual(person.hasMany, {
    addresses: map([ 1, 2, 3 ], function(id) { return {id: id, type: window.Address};})
  });

  deepEqual(address.belongsTo, {
    person: {id: 1, type: Person}
  });
});

test("mapped primary keys are respected when serializing a record to JSON", function() {
  serializer.configure(Person, {
    primaryKey: '__id__'
  });

  serializer.configure('Address', {
    primaryKey: 'ID'
  });

  var person = Person.create({ id: 1 });
  var address = window.Address.create({ id: 2 });

  var personJSON = serializer.serialize(person, { includeId: true });
  var addressJSON = serializer.serialize(address, { includeId: true });

  deepEqual(personJSON, { __id__: 1 });
  deepEqual(addressJSON, { ID: 2 });
});

test("mapped primary keys are respected when materializing a record from JSON", function() {
  serializer.configure(Person, {
    primaryKey: '__id__'
  });

  serializer.configure('Address', {
    primaryKey: 'ID'
  });

  var person = Person.create();
  var address = window.Address.create();

  serializer.materialize(person, { __id__: 1 });
  serializer.materialize(address, { ID: 2 });

  equal(person.materializedId, 1);
  equal(address.materializedId, 2);
});

module("DS.JSONSerializer - Transform API", {
  setup: function() {
    serializer = DS.JSONSerializer.create();

    serializer.registerTransform('unobtainium', {
      serialize: function(value) {
        return 'serialize';
      },

      deserialize: function(value) {
        return 'deserialize';
      }
    });
  },

  teardown: function() {
    serializer.destroy();
  }
});

test("registered transformations should be called when serializing and materializing records", function() {
  var value;

  value = serializer.deserializeValue('unknown', 'unobtainium');
  equal(value, 'deserialize', "the deserialize transform was called");

  value = serializer.serializeValue('unknown', 'unobtainium');
  equal(value, 'serialize', "the serialize transform was called");

  expectAssertion(function() {
    serializer.deserializeValue('unknown', 'obtainium');
  });

  expectAssertion(function() {
    serializer.serializeValue('unknown', 'obtainium');
  });
});

module("DS.JSONSerializer - Polymorphism API", {
  setup: function() {
    serializer = DS.JSONSerializer.create();
    serializer.keyForPolymorphicId = function(key) {
      equal(key, 'pet', 'keyForPolymorphicId was called');
      return 'pet_id';
    };

    serializer.keyForPolymorphicType = function(key) {
      equal(key, 'pet', 'keyForPolymorphicType was called');
      return 'pet_type';
    };

    Person = MockModel.extend();
    Animal = MockModel.extend();
    Cat = Animal.extend();
    Cat.reopenClass({
      toString: function() {
        return 'Cat';
      }
    });
  },

  teardown: function() {
    serializer.destroy();
  }
});

test("keyForPolymorphicId and keyForPolymorphicType should be called when serializing and materializing a polymorphic belongsTo relationship", function() {
  expect(7);
  var value, hash,
      person = Person.create();

  value = serializer.extractBelongsToPolymorphic(Animal, {pet_id: 2, pet_type: 'dog'}, 'pet');
  deepEqual(value, {id: 2, type: 'dog'}, 'The serializer can extract a polymorphic belongsTo');

  hash = {};
  serializer.addBelongsToPolymorphic(hash, 'pet', 3, Cat);
  equal(hash['pet_id'], 3, '');
  equal(hash['pet_type'], 'cat', '');
});
