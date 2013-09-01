var get = Ember.get, set = Ember.set;
var resolve = Ember.RSVP.resolve;
var TestAdapter, store;

module("unit/store/adapter_interop - DS.Store working with a DS.Adapter", {
  setup: function() {
    TestAdapter = DS.Adapter.extend();
  },
  teardown: function() {
    if (store) { store.destroy(); }
  }
});

test("Adapter can be set as a factory", function() {
  store = createStore({adapter: TestAdapter});

  ok(store.get('defaultAdapter') instanceof TestAdapter);
});

test('Adapter can be set as a name', function() {
  store = createStore({adapter: '_rest'});

  ok(store.get('defaultAdapter') instanceof DS.RESTAdapter);
});

test('Adapter can not be set as an instance', function() {
  store = DS.Store.create({
    adapter: DS.Adapter.create()
  });
  var assert = Ember.assert;
  Ember.assert = function() { ok(true, "raises an error when passing in an instance"); };
  store.get('defaultAdapter');
  Ember.assert = assert;
});

test("Calling Store#find invokes its adapter#find", function() {
  expect(4);

  var adapter = TestAdapter.extend({
    find: function(store, type, id) {
      ok(true, "Adapter#find was called");
      equal(store, currentStore, "Adapter#find was called with the right store");
      equal(type,  currentType,  "Adapter#find was called with the type passed into Store#find");
      equal(id,    1,            "Adapter#find was called with the id passed into Store#find");

      return Ember.RSVP.resolve({ id: 1 });
    }
  });

  var currentStore = createStore({ adapter: adapter });
  var currentType = DS.Model.extend();

  currentStore.find(currentType, 1);
});

test("Returning a promise from `find` asynchronously loads data", function() {
  var adapter = TestAdapter.extend({
    find: function(store, type, id) {
      return resolve({ id: 1, name: "Scumbag Dale" });
    }
  });

  var currentStore = createStore({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  currentStore.find(currentType, 1).then(async(function(object) {
    strictEqual(get(object, 'name'), "Scumbag Dale", "the data was pushed");
  }));
});

test("IDs provided as numbers are coerced to strings", function() {
  var adapter = TestAdapter.extend({
    find: function(store, type, id) {
      equal(typeof id, 'string', "id has been normalized to a string");
      return resolve({ id: 1, name: "Scumbag Sylvain" });
    }
  });

  var currentStore = createStore({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  currentStore.find(currentType, 1).then(async(function(object) {
    equal(typeof object.get('id'), 'string', "id was coerced to a string");
    currentStore.push(currentType, { id: 2, name: "Scumbag Sam Saffron" });
    return currentStore.find(currentType, 2);
  })).then(async(function(object) {
    ok(object, "object was found");
    equal(typeof object.get('id'), 'string', "id is a string despite being supplied and searched for as a number");
  }));
});


var array = [{ id: "1", name: "Scumbag Dale" }, { id: "2", name: "Scumbag Katz" }, { id: "3", name: "Scumbag Bryn" }];

test("can load data for the same record if it is not dirty", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.push(Person, { id: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1).then(async(function(tom) {
    equal(get(tom, 'isDirty'), false, "precond - record is not dirty");
    equal(get(tom, 'name'), "Tom Dale", "returns the correct name");

    store.push(Person, { id: 1, name: "Captain Underpants" });
    equal(get(tom, 'name'), "Captain Underpants", "updated record with new date");
  }));

});

/*
test("DS.Store loads individual records without explicit IDs with a custom primaryKey", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({ name: DS.attr('string'), primaryKey: 'key' });

  store.load(Person, { key: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1);
  equal(get(tom, 'name'), "Tom Dale", "the person was successfully loaded for the given ID");
});
*/

test("pushMany extracts ids from an Array of hashes if no ids are specified", function() {
  var store = createStore();

  var Person = DS.Model.extend({ name: DS.attr('string') });

  store.pushMany(Person, array);
  store.find(Person, 1).then(async(function(person) {
    equal(get(person, 'name'), "Scumbag Dale", "correctly extracted id for loaded data");
  }));
});

test("loadMany takes an optional Object and passes it on to the Adapter", function() {
  var passedQuery = { page: 1 };

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var adapter = TestAdapter.extend({
    findQuery: function(store, type, query) {
      equal(type, Person, "The type was Person");
      equal(query, passedQuery, "The query was passed in");
      return Ember.RSVP.resolve([]);
    }
  });

  var store = createStore({
    adapter: adapter
  });

  store.find(Person, passedQuery);
});

test("all(type) returns a record array of all records of a specific type", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.push(Person, { id: 1, name: "Tom Dale" });

  var results = store.all(Person);
  equal(get(results, 'length'), 1, "record array should have the original object");
  equal(get(results.objectAt(0), 'name'), "Tom Dale", "record has the correct information");

  store.push(Person, { id: 2, name: "Yehuda Katz" });
  equal(get(results, 'length'), 2, "record array should have the new object");
  equal(get(results.objectAt(1), 'name'), "Yehuda Katz", "record has the correct information");

  strictEqual(results, store.all(Person), "subsequent calls to all return the same recordArray)");
});

test("a new record of a particular type is created via store.createRecord(type)", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person);

  equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  equal(get(person, 'isNew'), true, "A newly created record is new");
  equal(get(person, 'isDirty'), true, "A newly created record is dirty");

  set(person, 'name', "Braaahm Dale");

  equal(get(person, 'name'), "Braaahm Dale", "Even if no hash is supplied, `set` still worked");
});

test("a new record with a specific id can't be created if this id is already used in the store", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string'),
  });

  Person.reopenClass({
    toString: function() {
      return 'Person';
    }
  });

  store.createRecord(Person, {id: 5});

  expectAssertion(function() {
    store.createRecord(Person, {id: 5});
  }, /The id 5 has already been used with another record of type Person/);
});

test("an initial data hash can be provided via store.createRecord(type, hash)", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person, { name: "Brohuda Katz" });

  equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  equal(get(person, 'isNew'), true, "A newly created record is new");
  equal(get(person, 'isDirty'), true, "A newly created record is dirty");

  equal(get(person, 'name'), "Brohuda Katz", "The initial data hash is provided");
});

test("if an id is supplied in the initial data hash, it can be looked up using `store.find`", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person, { id: 1, name: "Brohuda Katz" });

  store.find(Person, 1).then(async(function(again) {
    strictEqual(person, again, "the store returns the loaded object");
  }));
});

test("records inside a collection view should have their ids updated", function() {
  var Person = DS.Model.extend();

  var idCounter = 1;
  var adapter = TestAdapter.extend({
    createRecord: function(store, type, record) {
      return Ember.RSVP.resolve({name: record.get('name'), id: idCounter++});
    }
  });

  var store = createStore({
    adapter: adapter
  });

  var container = Ember.CollectionView.create({
    content: store.all(Person)
  });

  container.appendTo('#qunit-fixture');

  var tom = store.createRecord(Person, {name: 'Tom Dale'});
  var yehuda = store.createRecord(Person, {name: 'Yehuda Katz'});

  Ember.RSVP.all([ tom.save(), yehuda.save() ]).then(async(function() {
    container.content.forEach(function(person, index) {
      equal(person.get('id'), index + 1, "The record's id should be correct.");
    });

    container.destroy();
  }));
});
