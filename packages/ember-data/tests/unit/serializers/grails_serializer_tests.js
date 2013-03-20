var get = Ember.get, set = Ember.set;

var serializer;

module("DS.RESTSerializer", {
  setup: function() {
    serializer = DS.GrailsSerializer.create();
  },
  teardown: function() {
    serializer.destroy();
  }
});

test("keyForAttributeName returns plain property name", function() {
  equal(serializer.keyForAttributeName(DS.Model, 'myName'), 'myName');
  equal(serializer.keyForAttributeName(DS.Model, 'my_name'), 'my_name');
});

test("keyForBelongsTo returns the plain property name", function() {
  equal(serializer.keyForBelongsTo(DS.Model, 'person'), 'person');
  equal(serializer.keyForBelongsTo(DS.Model, 'town'), 'town');
  equal(serializer.keyForBelongsTo(DS.Model, 'homeTown'), 'homeTown');
});

test("keyForHasMany returns the plain property name", function() {
  equal(serializer.keyForHasMany(DS.Model, 'people'), 'people');
  equal(serializer.keyForHasMany(DS.Model, 'towns'), 'towns');
  equal(serializer.keyForHasMany(DS.Model, 'homeTowns'), 'homeTowns');
});

test("belongTo is properly serialized into a hash, and deserialized from a hash", function() {
  var App = Ember.Namespace.create({
    toString: function() { return "App"; }
  });
  App.Person = DS.Model.extend({
    name: DS.attr('string')
  });
  App.Address = DS.Model.extend({
    street: DS.attr('string'),
    person: DS.belongsTo(App.Person)
  });

  var person   = App.Person.createRecord({id: 1, name: 'Zach'});
  var home     = App.Address.createRecord({street: 'Main', person: person, id: 1});
  var jsonHome = {street: 'Main', person: {id: 1}};

  var serializedHome = serializer.serialize(home);
  deepEqual(serializedHome, jsonHome);


  var person2   = App.Person.createRecord({id: 2, name: 'Bob'});
  var home2     = App.Address.createRecord();
  var jsonHome2 = {street: 'First', person: {id: 2, class: 'com.foo.bar'}};

  serializer.materialize(home2, jsonHome2, null);
  equal(home2.get('person').get('name'), 'Bob', "Should be able to re-serialize records");
});