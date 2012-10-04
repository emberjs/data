var Adapter, adapter, store, serializer, Person;

module("Record Attribute Transforms", {
  setup: function() {
    Adapter = DS.Adapter.extend();

    Adapter.registerTransform('unobtainium', {
      toJSON: function(value) {
        return 'toJSON';
      },

      fromJSON: function(value) {
        return 'fromJSON';
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
  equal(person.get('name'), 'fromJSON', "value of attribute on the record should be transformed");

  var json = adapter.toJSON(person);
  equal(json.name, "toJSON", "value of attribute in the JSON hash should be transformed");
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
});

test("a DS.Model can use a Rails-like datestamp", function() {
  var dateString = "2012-04-18";
  var dateObject = new Date("Thur, Apr 12 2012 00:00:00 GMT");
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    updatedAt: DS.attr('date');
  });

  store.load(Person, { id: 1, updatedAt: dateString });
  var record = store.find(Person, 1);
  dateFromRecord = record.get("updatedAt");

  deepEqual(dateFromRecord,dateObject, "loading a rails datestamp yields an equivalent javascript date object");
});
