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

  eachAssociation: function(callback, binding) {
    var associations = this.constructor.associations;

    for (var prop in associations) {
      if (!associations.hasOwnProperty(prop)) { continue; }
      callback.call(binding, prop, { key: prop, kind: associations[prop] });
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

var serializer, Person, Address;

module("DS.Serializer - Mapping API", {
  setup: function() {
    serializer = DS.Serializer.create();
    Person = MockModel.extend();
    Address = MockModel.extend();
  },

  teardown: function() {
    serializer.destroy();
  }
});

test("mapped attributes are respected when serializing a record to JSON", function() {
  Person.attributes = { firstName: 'string' };
  Address.attributes = { firstName: 'string' };

  serializer.map(Person, {
    firstName: { key: 'FIRST_NAME' }
  });

  serializer.map(Address, {
    firstName: { key: 'first_name' }
  });

  var person = Person.create({
    firstName: "Tom"
  });

  var address = Address.create({
    firstName: "Spruce"
  });

  deepEqual(serializer.toJSON(person), {
    FIRST_NAME: "Tom"
  });

  deepEqual(serializer.toJSON(address), {
    first_name: "Spruce"
  });
});

test("mapped attributes are respected when materializing a record from JSON", function() {
  Person.attributes = { firstName: 'string' };
  Address.attributes = { firstName: 'string' };

  serializer.map(Person, {
    firstName: { key: 'FIRST_NAME' }
  });

  serializer.map(Address, {
    firstName: { key: 'first_name' }
  });

  var person = Person.create();
  var address = Address.create();

  serializer.materializeFromJSON(person, { FIRST_NAME: "Tom" });
  serializer.materializeFromJSON(address, { first_name: "Spruce" });

  deepEqual(person.get('materializedAttributes'), { firstName: "Tom" });
  deepEqual(address.get('materializedAttributes'), { firstName: "Spruce" });
});

test("mapped relationships are respected when serializing a record to JSON", function() {
  expect(8);

  Person.associations = { addresses: 'hasMany' };
  Address.associations = { person: 'belongsTo' };

  serializer.map(Person, {
    addresses: { key: 'ADDRESSES!' }
  });

  serializer.map(Address, {
    person: { key: 'MY_PEEP' }
  });

  var person = Person.create();
  var address = Address.create();

  serializer.addHasMany = function(hash, record, key, relationship) {
    ok(typeof hash === 'object', "a hash to build is passed");
    equal(record, person, "the record to serialize should be passed");
    equal(key, 'ADDRESSES!', "the key to add to the hash respects the mapping");

    // The mocked record uses a simplified relationship description
    deepEqual(relationship, {
      kind: 'hasMany',
      key: 'addresses'
    });
  };

  serializer.addBelongsTo = function(hash, record, key, relationship) {
    ok(typeof hash === 'object', "a hash to build is passed");
    equal(record, address, "the record to serialize should be passed");
    equal(key, 'MY_PEEP', "the key to add to the hash respects the mapping");

    // The mocked record uses a simplified relationship description
    deepEqual(relationship, {
      kind: 'belongsTo',
      key: 'person'
    });
  };

  serializer.toJSON(person);
  serializer.toJSON(address);
});

test("mapped relationships are respected when materializing a record from JSON", function() {
  Person.associations = { addresses: 'hasMany' };
  Address.associations = { person: 'belongsTo' };

  serializer.map(Person, {
    addresses: { key: 'ADDRESSES!' }
  });

  serializer.map(Address, {
    person: { key: 'MY_PEEP' }
  });

  var person = Person.create();
  var address = Address.create();

  serializer.materializeFromJSON(person, {
    'ADDRESSES!': [ 1, 2, 3 ]
  });

  serializer.materializeFromJSON(address, {
    'MY_PEEP': 1
  });

  deepEqual(person.hasMany, {
    addresses: [ 1, 2, 3 ]
  });

  deepEqual(address.belongsTo, {
    person: 1
  });
});

test("mapped primary keys are respected when serializing a record to JSON", function() {
  serializer.map(Person, {
    primaryKey: '__id__'
  });

  serializer.map(Address, {
    primaryKey: 'ID'
  });

  var person = Person.create({ id: 1 });
  var address = Address.create({ id: 2 });

  var personJSON = serializer.toJSON(person, { includeId: true });
  var addressJSON = serializer.toJSON(address, { includeId: true });

  deepEqual(personJSON, { __id__: 1 });
  deepEqual(addressJSON, { ID: 2 });
});

test("mapped primary keys are respected when materializing a record from JSON", function() {
  serializer.map(Person, {
    primaryKey: '__id__'
  });

  serializer.map(Address, {
    primaryKey: 'ID'
  });

  var person = Person.create();
  var address = Address.create();

  serializer.materializeFromJSON(person, { __id__: 1 });
  serializer.materializeFromJSON(address, { ID: 2 });

  equal(person.materializedId, 1);
  equal(address.materializedId, 2);
});
