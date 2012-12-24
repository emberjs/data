var MockModel = Ember.Object.extend({
  init: function() {
    this.materializedAttributes = {};
    this.hasMany = {};
    this.belongsTo = {};
    this.hasOne = {};
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
  },

  materializeHasOne: function(name, id) {
    this.hasOne[name] = id;
  }
});

var serializer, Person;

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
  expect(12);

  Person.associations = { addresses: 'hasMany', heart: 'hasOne' };
  window.Address.associations = { person: 'belongsTo' };

  serializer.map(Person, {
    addresses: { key: 'ADDRESSES!' },
    heart: { key: '<3' }
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

  serializer.addHasOne = function(hash, record, key, relationship) {
    ok(typeof hash === 'object', "a hash to build is passed");
    equal(record, person, "the record to serialize should be passed");
    equal(key, '<3', "the key to add to the hash respects the mapping");

    // The mocked record uses a simplified relationship description
    deepEqual(relationship, {
      kind: 'hasOne',
      key: 'heart'
    });
  };

  serializer.serialize(person);
  serializer.serialize(address);
});

test("mapped relationships are respected when materializing a record from JSON", function() {
  Person.associations = { addresses: 'hasMany', heart: 'hasOne' };
  window.Address.associations = { person: 'belongsTo' };

  serializer.map(Person, {
    addresses: { key: 'ADDRESSES!' },
    heart: { key: '<3' }
  });

  serializer.map('Address', {
    person: { key: 'MY_PEEP' }
  });

  var person = Person.create();
  var address = window.Address.create();

  serializer.materialize(person, {
    'ADDRESSES!': [ 1, 2, 3 ],
    '<3': 1
  });

  serializer.materialize(address, {
    'MY_PEEP': 1
  });

  deepEqual(person.hasMany, {
    addresses: [ 1, 2, 3 ]
  });

  deepEqual(person.hasOne, {
    heart: 1
  });

  deepEqual(address.belongsTo, {
    person: 1
  });
});

test("mapped primary keys are respected when serializing a record to JSON", function() {
  serializer.map(Person, {
    primaryKey: '__id__'
  });

  serializer.map('Address', {
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
  serializer.map(Person, {
    primaryKey: '__id__'
  });

  serializer.map('Address', {
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

  raises(function() {
    serializer.deserializeValue('unknown', 'obtainium');
  });

  raises(function() {
    serializer.serializeValue('unknown', 'obtainium');
  });
});
