var Adapter, adapter, store, serializer, Person;

module("Record Attribute Transforms", {
  setup: function() {
    Adapter = DS.Adapter.extend();

    Adapter.registerTransform('unobtainium', {
      serialize: function(value) {
        return 'serialize';
      },

      deserialize: function(value) {
        return 'fromData';
      }
    });

    adapter = Adapter.create();
    store = DS.Store.create({
      adapter: adapter
    });
    serializer = adapter.get('serializer');
  },

  teardown: function() {
    serializer.destroy();
    adapter.destroy();
    store.destroy();
  }
});

test("transformed values should be materialized on the record", function() {
  var Person = DS.Model.extend({
    name: DS.attr('unobtainium')
  });

  store.load(Person, { id: 1, name: "James Cameron" });

  var person = store.find(Person, 1);
  equal(person.get('name'), 'fromData', "value of attribute on the record should be transformed");

  var json = adapter.serialize(person);
  equal(json.name, "serialize", "value of attribute in the JSON hash should be transformed");
});

module("Default DS.Transforms", {
  setup: function() {
    store = DS.Store.create();

    Person = DS.Model.extend({
      name: DS.attr('string'),
      born: DS.attr('date'),
      age: DS.attr('number'),
      isGood: DS.attr('boolean')
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("the default numeric transform", function() {
  store.load(Person, {id: 1, age: "51"});
  var person = store.find(Person, 1);

  var result = (typeof person.get('age') === "number"); 
  equal(result, true, "string is transformed into a number");
  equal(person.get('age'),51, "string value and transformed numeric value match");
});

test("the default boolean transform", function() {
  store.load(Person, {id: 1, isGood: "false"});
  store.load(Person, {id: 2, isGood: "f"});
  store.load(Person, {id: 3, isGood: 0});
  store.load(Person, {id: 4, isGood: false});

  var personOne = store.find(Person, 1);
  var personTwo = store.find(Person, 2);
  var personThree = store.find(Person, 3);
  var personFour = store.find(Person, 4);

  var result = (typeof personOne.get('isGood') === "boolean"); 
  equal(result, true, "string is transformed into a boolean");

  equal(personOne.get('isGood'), false, "string value and transformed boolean value match");
  equal(personTwo.get('isGood'), false, "short string value and transformed boolean value match");
  equal(personThree.get('isGood'), false, "numeric value and transformed boolean value match");
  equal(personFour.get('isGood'), false, "boolean value and transformed boolean value match");
});

test("the default string transform", function() {
  store.load(Person, {id: 1, name: 8675309});
  var person = store.find(Person, 1);

  var result = (typeof person.get('name') === "string"); 
  equal(result, true, "number is transformed into a string");
  equal(person.get('name'), "8675309", "numeric value and transformed string value match");
});

test("the default date transform", function() {
  var date = new Date();
  store.load(Person, {id: 1, born: date.toString()});
  var person = store.find(Person, 1);

  var result = (person.get('born') instanceof Date); 
  equal(result, true, "string is transformed into a date");
  equal(person.get('born').toString(), date.toString(), "date.toString and transformed date.toString values match");

  var timestamp = 293810400, // 1979-04-24 @ 08:00:00
      date2 = new Date(timestamp);

  store.load(Person, {id: 2, born: timestamp});
  var person2 = store.find(Person, 2);

  var result2 = (person.get('born') instanceof Date);
  equal(result2, true, "timestamp is transformed into a date");
  equal(person2.get('born').toString(), date2.toString(), "date.toString and transformed date.toString values match");
});


module("Enum Transforms", {
  setup: function() {
    adapter = DS.Adapter.create();
    adapter.registerEnumTransform('materials', ['unobtainium', 'kindaobtainium', 'veryobtainium']);
  
    store = DS.Store.create({
      adapter: adapter
    });
  
    serializer = adapter.get('serializer');
  
    Person = DS.Model.extend({
      material: DS.attr('materials')
    });
  },
  teardown: function() {
    serializer.destroy();
    adapter.destroy();
    store.destroy();
  }
});

test("correct transforms are applied", function() {
  var json, person;
  store.load(Person, {
    id: 1,
    material: 2
  });
  
  person = store.find(Person, 1);
  equal(person.get('material'), 'veryobtainium', 'value of the attribute on the record should be transformed');
  
  json = adapter.serialize(person);
  equal(json.material, 2, 'value of the attribute in the JSON hash should be transformed');
});
