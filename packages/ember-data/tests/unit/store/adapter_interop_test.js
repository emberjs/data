var get = Ember.get, set = Ember.set;
var TestAdapter;

module("unit/store/adapter_interop - DS.Store working with a DS.Adapter", {
  setup: function() {
    TestAdapter = DS.Adapter.extend();
  }
});

test("RESTAdapter is default adapter for DS.Store", function () {
  var currentStore = DS.Store.create();
  ok(currentStore.get('_adapter') instanceof DS.RESTAdapter, "Store's adapter is instance of RESTAdapter");
});

test("Calling Store#find invokes its adapter#find", function() {
  expect(4);

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      ok(true, "Adapter#find was called");
      equal(store, currentStore, "Adapter#find was called with the right store");
      equal(type,  currentType,  "Adapter#find was called with the type passed into Store#find");
      equal(id,    1,            "Adapter#find was called with the id passed into Store#find");
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend();

  currentStore.find(currentType, 1);
});

test("DS.Store has a load method to load in a new record", function() {
  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.push(type, { id: 1, name: "Scumbag Dale" });
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  var object = currentStore.find(currentType, 1);

  equal(adapter.serialize(object).name, "Scumbag Dale", "the data hash was inserted");
});

test("IDs provided as numbers are coerced to strings", function() {
  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      equal(typeof id, 'string', "id has been normalized to a string");
      store.push(type, { id: 1, name: "Scumbag Sylvain" });
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  var object = currentStore.find(currentType, 1);
  equal(typeof object.get('id'), 'string', "id was coerced to a string");

  currentStore.push(currentType, { id: 2, name: "Scumbag Sam Saffron" });
  object = currentStore.find(currentType, 2);
  ok(object, "object was found");
  equal(typeof object.get('id'), 'string', "id is a string despite being supplied and searched for as a number");
});


var array = [{ id: "1", name: "Scumbag Dale" }, { id: "2", name: "Scumbag Katz" }, { id: "3", name: "Scumbag Bryn" }];

test("DS.Store has a load method to load in an Array of records", function() {
  var adapter = TestAdapter.create({
    findMany: function(store, type, ids) {
      store.pushMany(type, array);
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  var records = [
    currentStore.getById(currentType, 1),
    currentStore.getById(currentType, 2),
    currentStore.getById(currentType, 3)
  ];

  var objects = currentStore.findMany(currentType, records);

  for (var i=0, l=get(objects, 'length'); i<l; i++) {
    var object = objects.objectAt(i), hash = array[i];

    deepEqual(adapter.serialize(object, { includeId: true }), hash);
  }
});

test("DS.Store loads individual records without explicit IDs", function() {
  var store = DS.Store.create({ adapter: DS.Adapter });
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.push(Person, { id: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1);
  equal(get(tom, 'name'), "Tom Dale", "the person was successfully loaded for the given ID");
});

test("can load data for the same record if it is not dirty", function() {
  var store = DS.Store.create({ adapter: DS.Adapter });
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.push(Person, { id: 1, name: "Tom Dale" });
  var tom = store.find(Person, 1);

  equal(get(tom, 'isDirty'), false, "precond - record is not dirty");
  equal(get(tom, 'name'), "Tom Dale", "returns the correct name");

  store.push(Person, { id: 1, name: "Captain Underpants" });
  equal(get(tom, 'name'), "Captain Underpants", "updated record with new date");
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

test("DS.Store passes only needed guids to findMany", function() {
  expect(13);

  var adapter = TestAdapter.create({
    findMany: function(store, type, ids) {
      deepEqual(ids, ['4','5','6'], "only needed ids are passed");
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  currentStore.pushMany(currentType, array);

  var objects = currentStore.findByIds(currentType, [1,2,3,4,5,6]);

  equal(get(objects, 'length'), 6, "the RecordArray returned from findMany has all the objects");
  equal(get(objects, 'isLoaded'), false, "the RecordArrays' isLoaded flag is false");

  objects.then(function(resolvedObjects) {
    strictEqual(resolvedObjects, objects, "The promise is resolved with the RecordArray");
    equal(get(objects, 'isLoaded'), true, "The objects are loaded");
  });

  var i, object, hash;
  for (i=0; i<3; i++) {
    object = objects.objectAt(i);
    hash = array[i];

    deepEqual(adapter.serialize(object, { includeId: true }), hash);
  }

  for (i=3; i<6; i++) {
    object = objects.objectAt(i);
    ok(currentType.detectInstance(object), "objects are instances of the RecordArray's type");
  }

  currentStore.pushMany(currentType, [{ id: 4 }, { id: 5 }, { id: 6 }]);

  equal(objects.everyProperty('isLoaded'), true, "every objects' isLoaded is true");
  equal(get(objects, 'isLoaded'), true, "after all objects are loaded, the RecordArrays' isLoaded flag is true");
});

test("a findManys' isLoaded is true when all objects are loaded", function() {
  expect(4);

  var adapter = TestAdapter.create({
    findMany: function(store, type, ids) {
      ok(false, "findMany should not have been called");
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  currentStore.pushMany(currentType, array);

  var objects = currentStore.findByIds(currentType, [1,2,3]);

  objects.then(function(resolvedObjects) {
    strictEqual(resolvedObjects, objects, "The resolved RecordArray is correct");
    equal(get(objects, 'isLoaded'), true, "The RecordArray is loaded by the time the promise is resolved");
  });

  equal(get(objects, 'length'), 3, "the RecordArray returned from findMany has all the objects");
  equal(get(objects, 'isLoaded'), true, "the RecordArrays' isLoaded flag is true");
});

test("loadMany extracts ids from an Array of hashes if no ids are specified", function() {
  var store = DS.Store.create({ adapter: DS.Adapter });

  var Person = DS.Model.extend({ name: DS.attr('string') });

  store.pushMany(Person, array);
  equal(get(store.find(Person, 1), 'name'), "Scumbag Dale", "correctly extracted id for loaded data");
});

test("loadMany takes an optional Object and passes it on to the Adapter", function() {
  var passedQuery = { page: 1 };

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var adapter = TestAdapter.create({
    findQuery: function(store, type, query) {
      equal(type, Person, "The type was Person");
      equal(query, passedQuery, "The query was passed in");
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  store.find(Person, passedQuery);
});

test("all(type) returns a record array of all records of a specific type", function() {
  var store = DS.Store.create({ adapter: DS.Adapter });
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
  expect(6);
  var store = DS.Store.create({ adapter: DS.Adapter });
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person);

  person.then(function(resolvedPerson) {
    strictEqual(resolvedPerson, person, "The promise is resolved with the record");
    equal(get(person, 'isLoaded'), true, "The record is loaded");
  });

  equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  equal(get(person, 'isNew'), true, "A newly created record is new");
  equal(get(person, 'isDirty'), true, "A newly created record is dirty");

  set(person, 'name', "Braaahm Dale");

  equal(get(person, 'name'), "Braaahm Dale", "Even if no hash is supplied, `set` still worked");
});

test("a new record with a specific id can't be created if this id is already used in the store", function() {
  var store = DS.Store.create({ adapter: DS.Adapter });
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
  expect(6);
  var store = DS.Store.create({ adapter: DS.Adapter });
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person, { name: "Brohuda Katz" });

  person.then(function(resolvedPerson) {
    strictEqual(resolvedPerson, person, "The promise is resolved with the record");
    equal(get(person, 'isLoaded'), true, "The record is loaded");
  });

  equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  equal(get(person, 'isNew'), true, "A newly created record is new");
  equal(get(person, 'isDirty'), true, "A newly created record is dirty");

  equal(get(person, 'name'), "Brohuda Katz", "The initial data hash is provided");
});

test("if an id is supplied in the initial data hash, it can be looked up using `store.find`", function() {
  var store = DS.Store.create({ adapter: DS.Adapter });
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person, { id: 1, name: "Brohuda Katz" });

  var again = store.find(Person, 1);

  strictEqual(person, again, "the store returns the loaded object");
});

test("records inside a collection view should have their ids updated", function() {
  var Person = DS.Model.extend();

  var idCounter = 1;
  var adapter = TestAdapter.create({
    createRecord: function(store, type, record) {
      store.didSaveRecord(record, {name: record.get('name'), id: idCounter++});
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var container = Ember.CollectionView.create({
    content: store.all(Person)
  });

  container.appendTo('#qunit-fixture');

  store.createRecord(Person, {name: 'Tom Dale'});
  store.createRecord(Person, {name: 'Yehuda Katz'});

  store.commit();

  container.content.forEach(function(person, index) {
    equal(person.get('id'), index + 1, "The record's id should be correct.");
  });

  Ember.run(function() {
    container.destroy();
  });
});

var stubAdapter, store;

module("DS.Store - Adapter Callbacks", {
  setup: function() {
    stubAdapter = Ember.Object.create({
      extractId: function(type, hash) {
        return hash.id;
      },

      materialize: function(record, hash) {
        record.materializedData = hash;
      }
    });

    store = DS.Store.create({ adapter: stubAdapter });
  },

  teardown: function() {
    stubAdapter.destroy();
    store.destroy();
  }
});
