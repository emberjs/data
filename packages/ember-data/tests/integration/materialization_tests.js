var Person;
var store;
var adapter;
var serializer;

module("Record Materialization", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    serializer = DS.JSONSerializer.create();
    adapter = DS.Adapter.create({
      serializer: serializer
    });
    store = DS.Store.create({ adapter: adapter });
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
  }
});

test("the adapter's materialize method should provide attributes to a record", function() {
  store.load(Person, { id: 1, FIRST_NAME: "Yehuda", lAsTnAmE: "Katz" });

  adapter.materialize = function(record, hash) {
    record.materializeAttributes({
      firstName: hash.FIRST_NAME,
      lastName: hash.lAsTnAmE
    });
  };

  var person = store.find(Person, 1);

  equal(person.get('firstName'), "Yehuda");
  equal(person.get('lastName'), "Katz");
});

test("when materializing a record, the serializer's materializeAttributes method should be invoked", function() {
  expect(1);

  store.load(Person, { id: 1, FIRST_NAME: "Yehuda", lAsTnAmE: "Katz" });

  serializer.materializeAttributes = function(record, hash) {
    deepEqual(hash, {
      id: 1,
      FIRST_NAME: "Yehuda",
      lAsTnAmE: "Katz"
    });
  };

  var person = store.find(Person, 1);
});

test("when materializing a record, the serializer's materializeAttribute method should be invoked for each attribute", function() {
  expect(8);

  store.load(Person, { id: 1, FIRST_NAME: "Yehuda", lAsTnAmE: "Katz" });

  var attributes = {
    firstName: 'string',
    lastName: 'string',
    updatedAt: 'string',
    name: 'string'
  };

  serializer.materializeAttribute = function(record, hash, attributeName, attributeType) {
    deepEqual(hash, {
      id: 1,
      FIRST_NAME: "Yehuda",
      lAsTnAmE: "Katz"
    });

    var expectedType = attributes[attributeName];
    equal(expectedType, attributeType, "The attribute type should be correct");
    delete attributes[attributeName];
  };

  var person = store.find(Person, 1);
});

test("extractId is called when loading a record but not when materializing it afterwards", function() {
  expect(2);

  serializer.extractId = function(type, hash) {
    equal(type, Person, "extractId is passed the correct type");
    deepEqual(hash, { id: 1, name: "Yehuda Katz" }, "the opaque hash should be passed");

    return 1;
  };

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  // Find record to ensure it gets materialized
  var person = store.find(Person, 1);
});

test("when materializing a record, the serializer's extractAttribute is called for each attribute defined on the model", function() {
  expect(9);

  var DrugDealer = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    yearsIncarcerated: DS.attr('number')
  });

  // Keep a hash of which attribute names extractAttribute
  // has been called with, and `tick` them off as we go along.
  var attributes = {
    firstName: true,
    lastName: true,
    yearsIncarcerated: true
  };

  store.load(DrugDealer, { id: 1, firstName: "Patrick", lastName: "Gibson", yearsIncarcerated: 42 });

  serializer.extractAttribute = function(type, hash, attributeName) {
    deepEqual(hash, { id: 1, firstName: "Patrick", lastName: "Gibson", yearsIncarcerated: 42 }, "opaque hash should be passed to extractAttribute");
    equal(type, DrugDealer, "model type is passed to extractAttribute");

    ok(attributes.hasOwnProperty(attributeName), "the attribute name is present");
    delete attributes[attributeName];
  };

  store.find(DrugDealer, 1);
});

test("when materializing a record, the serializer's extractHasMany method should be invoked", function() {
  expect(3);

  Person.reopen({
    children: DS.hasMany(Person)
  });

  store.load(Person, { id: 1, children: [ 1, 2, 3 ] });

  serializer.extractHasMany = function(type, hash, name) {
    equal(type, Person);
    deepEqual(hash, {
      id: 1,
      children: [ 1, 2, 3 ]
    });
    equal(name, 'children');
  };

  var person = store.find(Person, 1);
});

test("when materializing a record, the serializer's extractBelongsTo method should be invoked", function() {
  expect(3);

  Person.reopen({
    father: DS.belongsTo(Person)
  });

  store.load(Person, { id: 1, father: 2 });

  serializer.extractBelongsTo = function(type, hash, name) {
    equal(type, Person);
    deepEqual(hash, {
      id: 1,
      father: 2
    });
    equal(name, 'father');
  };

  var person = store.find(Person, 1);
});

test("when materializing a record, deserializeValue is called to convert the value from data into a JavaScript value", function() {
  expect(2);

  var Bowler = DS.Model.extend({
    favoriteDrink: DS.attr('string'),
    hasSpecialLadyFriend: DS.attr('boolean')
  });

  var typeToValueMap = {
    "string": "white russian",
    "boolean": "FALSE"
  };

  store.load(Bowler, { id: 'dude', favoriteDrink: "white russian", hasSpecialLadyFriend: "FALSE" });
  serializer.deserializeValue = function(value, attributeType) {
    strictEqual(typeToValueMap[attributeType], value, "correct value and type pair should be passed");
    delete typeToValueMap[attributeType];

    return value;
  };

  store.find(Bowler, 'dude');
});
