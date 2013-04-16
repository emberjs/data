var get = Ember.get, set = Ember.set;

var testSerializer = DS.JSONSerializer.create({
  primaryKey: function() { return 'id'; }
});

var TestAdapter = DS.Adapter.extend({
  serializer: testSerializer
});

module("DS.Store", {
  teardown: function() {
    set(DS, 'defaultStore', null);
  }
});

test("a store can be created", function() {
  var store = DS.Store.create();
  ok(store, 'a store exists');
});

test("the first store becomes the default store", function() {
  var store = DS.Store.create();
  equal(get(DS, 'defaultStore'), store, "the first store is the default");
});

test("a specific store can be supplied as the default store", function() {
  DS.Store.create();
  var store = DS.Store.create({ isDefaultStore: true });
  DS.Store.create();

  equal(get(DS, 'defaultStore'), store, "isDefaultStore overrides the default behavior");
});

test("when a store is destroyed, it removes itself as the default store", function() {
  var store = DS.Store.create({ isDefaultStore: true });

  equal(get(DS, 'defaultStore'), store, "precond - store creates itself as default store");
  store.destroy();

  equal(get(DS, 'defaultStore'), null, "default store is set to null after previous default was destroyed");
});

var stateManager, stateName;

module("DS.StateManager", {
  setup: function() {
    stateManager = DS.StateManager.create();
  }
});

var isTrue = function(flag) {
  var state = stateName.split('.').join('.states.');
  equal(get(stateManager, 'states.rootState.states.'+ state + "." + flag), true, stateName + "." + flag + " should be true");
};

var isFalse = function(flag) {
  var state = stateName.split('.').join('.states.');
  equal(get(stateManager, 'states.rootState.states.'+ state + "." + flag), false, stateName + "." + flag + " should be false");
};

test("the empty state", function() {
  stateName = "empty";
  isFalse("isLoading");
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the loading state", function() {
  stateName = "loading";
  isTrue("isLoading");
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the loaded state", function() {
  stateName = "loaded";
  isFalse("isLoading");
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the updated state", function() {
  stateName = "loaded.updated";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the saving state", function() {
  stateName = "loaded.updated.inFlight";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the deleted state", function() {
  stateName = "deleted";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
  isFalse("isError");
});

test("the deleted.saving state", function() {
  stateName = "deleted.inFlight";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isTrue("isDeleted");
  isFalse("isError");
});

test("the deleted.saved state", function() {
  stateName = "deleted.saved";
  isFalse("isLoading");
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
  isFalse("isError");
});


test("the error state", function() {
  stateName = "error";
  isFalse("isLoading");
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isTrue("isError");
});

module("DS.Store working with a DS.Adapter");

test("RESTAdapter is default adapter for DS.Store", function () {
  var currentStore = DS.Store.create();
  ok(DS.RESTAdapter.detectInstance(currentStore.get('_adapter')), "Store's adapter is instance of RESTAdapter");
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
      store.load(type, id, { id: 1, name: "Scumbag Dale" });
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
      store.load(type, id, { id: 1, name: "Scumbag Sylvain" });
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  var object = currentStore.find(currentType, 1);
  equal(typeof object.get('id'), 'string', "id was coerced to a string");

  currentStore.load(currentType, { id: 2, name: "Scumbag Sam Saffron" });
  object = currentStore.find(currentType, 2);
  ok(object, "object was found");
  equal(typeof object.get('id'), 'string', "id is a string despite being supplied and searched for as a number");
});


var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

test("DS.Store has a load method to load in an Array of records", function() {
  var adapter = TestAdapter.create({

    findMany: function(store, type, ids) {
      store.loadMany(type, ids, array);
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  var objects = currentStore.findMany(currentType, [1,2,3]);

  for (var i=0, l=get(objects, 'length'); i<l; i++) {
    var object = objects.objectAt(i), hash = array[i];

    deepEqual(adapter.serialize(object, { includeId: true }), hash);
  }
});

test("DS.Store loads individual records without explicit IDs", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.load(Person, { id: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1);
  equal(get(tom, 'name'), "Tom Dale", "the person was successfully loaded for the given ID");
});

test("can load data for the same record if it is not dirty", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.load(Person, { id: 1, name: "Tom Dale" });
  var tom = store.find(Person, 1);

  equal(get(tom, 'isDirty'), false, "precond - record is not dirty");
  equal(get(tom, 'name'), "Tom Dale", "returns the correct name");

  store.load(Person, { id: 1, name: "Captain Underpants" });
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

  currentStore.loadMany(currentType, [1,2,3], array);

  var objects = currentStore.findMany(currentType, [1,2,3,4,5,6]);

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

  currentStore.loadMany(currentType, [4,5,6], [{ id: 4 }, { id: 5 }, { id: 6 }]);

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

  currentStore.loadMany(currentType, [1,2,3], array);

  var objects = currentStore.findMany(currentType, [1,2,3]);

  objects.then(function(resolvedObjects) {
    strictEqual(resolvedObjects, objects, "The resolved RecordArray is correct");
    equal(get(objects, 'isLoaded'), true, "The RecordArray is loaded by the time the promise is resolved");
  });

  equal(get(objects, 'length'), 3, "the RecordArray returned from findMany has all the objects");
  equal(get(objects, 'isLoaded'), true, "the RecordArrays' isLoaded flag is true");
});

test("loadMany extracts ids from an Array of hashes if no ids are specified", function() {
  var store = DS.Store.create();

  var Person = DS.Model.extend({ name: DS.attr('string') });

  store.loadMany(Person, array);
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
  var store = DS.Store.create({ adapter: DS.Adapter.create() });
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.load(Person, 1, { id: 1, name: "Tom Dale" });

  var results = store.all(Person);
  equal(get(results, 'length'), 1, "record array should have the original object");
  equal(get(results.objectAt(0), 'name'), "Tom Dale", "record has the correct information");

  store.load(Person, 2, { id: 2, name: "Yehuda Katz" });
  equal(get(results, 'length'), 2, "record array should have the new object");
  equal(get(results.objectAt(1), 'name'), "Yehuda Katz", "record has the correct information");

  strictEqual(results, store.all(Person), "subsequent calls to all return the same recordArray)");
});

test("a new record of a particular type is created via store.createRecord(type)", function() {
  expect(6);
  var store = DS.Store.create();
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
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    name: DS.attr('string'),
  });
  Person.reopenClass({
    toString: function() {
      return 'Person';
    }
  });
  store.createRecord(Person, {id: 5});

  raises(
    function() { store.createRecord(Person, {id: 5}); },
    /The id 5 has already been used with another record of type Person/,
    "Creating a record with an if an id already in used in the store is disallowed"
  );
});

test("an initial data hash can be provided via store.createRecord(type, hash)", function() {
  expect(6);
  var store = DS.Store.create();
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
  var store = DS.Store.create();
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

module("DS.State - Lifecycle Callbacks");

asyncTest("a record receives a didLoad callback when it has finished loading", function() {
  var Person = DS.Model.extend({
    didLoad: function() {
      ok("The didLoad callback was called");
    }
  });

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" });
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });
  var person = store.find(Person, 1);

  person.then(function(resolvedPerson) {
    equal(resolvedPerson, person, "The resolved value is correct");
    start();
  });
});

test("a record receives a didUpdate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    didUpdate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "didUpdate callback was not called until didSaveRecord is called");

      store.didSaveRecord(record);
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - didUpdate callback was not called yet");

  person.set('bar', "Bar");
  store.commit();

  equal(callCount, 1, "didUpdate called after update");
});

test("a record receives a didCreate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    didCreate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = TestAdapter.create({
    createRecord: function(store, type, record) {
      equal(callCount, 0, "didCreate callback was not called until didSaveRecord is called");

      store.didSaveRecord(record);
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  equal(callCount, 0, "precond - didCreate callback was not called yet");

  store.createRecord(Person, { id: 69, name: "Newt Gingrich" });
  store.commit();

  equal(callCount, 1, "didCreate called after commit");
});

test("a record receives a didDelete callback when it has finished deleting", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    didDelete: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" });
    },

    deleteRecord: function(store, type, record) {
      equal(callCount, 0, "didDelete callback was not called until didSaveRecord is called");

      store.didSaveRecord(record);
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - didDelete callback was not called yet");

  person.deleteRecord();
  store.commit();

  equal(callCount, 1, "didDelete called after delete");
});

test("a record receives a becameInvalid callback when it became invalid", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    becameInvalid: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), true, "record should be dirty");
    }
  });

  var adapter = TestAdapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "becameInvalid callback was not called untill recordWasInvalid is called");

      store.recordWasInvalid(record, {bar: 'error'});
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - becameInvalid callback was not called yet");

  person.set('bar', "Bar");
  store.commit();

  equal(callCount, 1, "becameInvalid called after invalidating");
});

test("an ID of 0 is allowed", function() {
  var store = DS.Store.create();

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.load(Person, { id: 0, name: "Tom Dale" });
  equal(store.all(Person).objectAt(0).get('name'), "Tom Dale", "found record with id 0");
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

var tryToFind, Record;

module("DS.Store - unload record", {
  setup: function() {
    store = DS.Store.create({
      adapter: DS.Adapter.create({
        find: function() {
          tryToFind = true;
        }
      })
    });

    Record = DS.Model.extend({
      title: DS.attr('string')
    });
  },
  teardown: function() {
    store.destroy();
  }
});

test("unload a dirty record", function() {
  store.load(Record, {id: 1, title: 'toto'});

  var record = store.find(Record, 1);
  record.set('title', 'toto2');

  equal(get(record, 'isDirty'), true, "record is dirty");
  raises(function() {
    record.unloadRecord();
  }, "You can only unload a loaded non dirty record.", "can not unload dirty record");
});

test("unload a record", function() {
  store.load(Record, {id: 1, title: 'toto'});

  var record = store.find(Record, 1);
  equal(get(record, 'id'), 1, "found record with id 1");
  equal(get(record, 'isDirty'), false, "record is not dirty");

  store.unloadRecord(record);

  equal(get(record, 'isDirty'), false, "record is not dirty");
  equal(get(record, 'isDeleted'), true, "record is deleted");

  tryToFind = false;
  store.find(Record, 1);
  equal(tryToFind, true, "not found record with id 1");

});

module("DS.Store - unload record with relationships");

test("can commit store after unload record with relationships", function() {

  var store = DS.Store.create({
    adapter: TestAdapter.create({

      find: function() {
        tryToFind = true;
      },
      createRecord: function(store, type, record) {
        this.didCreateRecord(store, type, record);
      }
    })
  });
  var like, product, brand;

  var Brand = DS.Model.extend({
    name: DS.attr('string')
  });
  var Product = DS.Model.extend({
    description: DS.attr('string'),
    brand: DS.belongsTo(Brand)
  });
  var Like = DS.Model.extend({
    product: DS.belongsTo(Product)
  });

  store.load(Brand, { id: 1, name: 'EmberJS' });
  brand = store.find(Brand, 1);

  store.load(Product, { id: 1, description: 'toto', brand: 1 });
  product = store.find(Product, 1);

  like = store.createRecord(Like, { id: 1, product: product });
  store.commit();

  store.unloadRecord(product);
  // can commit because `product` is not in transactionBucketTypes
  store.commit();

  tryToFind = false;
  product = store.find(Product, 1);
  ok(tryToFind, "not found record with id 1");

  store.destroy();

});
