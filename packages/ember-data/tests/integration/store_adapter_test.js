/**
 This is an integration test that tests the communication between a store
 and its adapter.

 Typically, when a method is invoked on the store, it calls a related
 method on its adapter. The adapter notifies the store that it has
 completed the assigned task, either synchronously or asynchronously,
 by calling a method on the store.

 These tests ensure that the proper methods get called, and, if applicable,
 the given record orrecord arrayay changes state appropriately.
*/

var get = Ember.get, set = Ember.set;
var Person, store, adapter;

module("DS.Store and DS.Adapter integration test", {
  setup: function() {
    var App = Ember.Namespace.create({ name: "App" });

    App.Person = Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    adapter = DS.Adapter.create();
    store = DS.Store.create({ adapter: adapter });
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
  }
});


asyncTest("Records loaded multiple times and retrieved in recordArray are ready to send state events", function() {

  adapter.findQuery = function(store, type, query, recordArray) {
    var self = this;

    setTimeout(function() {
      Ember.run(function() {
        
        // use different recordArray based on the call
        var recordArray = (!!people2) ? people2 : people;

        self.didFindQuery(store, type, {
          persons: [{
            id: 1,
            name: "Mickael Ramírez"
          }, {
            id: 2,
            name: "Johny Fontana"
          }]
        }, recordArray);

      });

    });
  };

  var people, people2;
  people = store.findQuery(Person, {q: 'bla'});
  people.one('didLoad', function() {

    people2 = store.findQuery(Person, {q: 'bla2'});
    people2.one('didLoad', function() {

      start();
      expect(3);

      equal( people2.get('length'), 2, 'return the elements' );
      ok( people2.get('isLoaded'), 'array is loaded' );

      var person = people.objectAt(0);
      ok( person.get('isLoaded'), 'record is loaded' );
      // delete record will not throw exception
      person.deleteRecord();


    });
  });

});

test("by default, createRecords calls createRecord once per record", function() {
  expect(8);
  var count = 1;

  adapter.createRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (count === 1) {
      equal(get(record, 'name'), "Tom Dale");
    } else if (count === 2) {
      equal(get(record, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not have invoked more than 2 times");
    }

    var hash = get(record, 'data');
    hash.id = count;
    hash.updatedAt = "now";

    store.didSaveRecord(record, hash);
    equal(get(record, 'updatedAt'), "now", "the record should receive the new information");

    count++;
  };

  var tom = store.createRecord(Person, { name: "Tom Dale" });
  var yehuda = store.createRecord(Person, { name: "Yehuda Katz" });

  store.commit();
  equal(tom, store.find(Person, 1), "Once an ID is in, find returns the same object");
  equal(yehuda, store.find(Person, 2), "Once an ID is in, find returns the same object");
  store.commit();
});

test("by default, updateRecords calls updateRecord once per record", function() {
  expect(10);

  var count = 0;

  adapter.updateRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(record, 'name'), "Tom Dale");
    } else if (count === 1) {
      equal(get(record, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    equal(record.get('isSaving'), true, "record is saving");

    store.didSaveRecord(record);

    equal(record.get('isSaving'), false, "record is no longer saving");
    equal(record.get('isLoaded'), true, "record is saving");
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Brohuda Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  set(tom, "name", "Tom Dale");
  set(yehuda, "name", "Yehuda Katz");

  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("calling store.didSaveRecord can provide an optional hash", function() {
  expect(8);

  var count = 0;

  adapter.updateRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(record, 'name'), "Tom Dale");
      store.didSaveRecord(record, { id: 1, name: "Tom Dale", updatedAt: "now" });
      equal(get(record, 'isDirty'), false, "the record should not be dirty");
      equal(get(record, 'updatedAt'), "now", "the hash was updated");
    } else if (count === 1) {
      equal(get(record, 'name'), "Yehuda Katz");
      store.didSaveRecord(record, { id: 2, name: "Yehuda Katz", updatedAt: "now!" });
      equal(record.get('isDirty'), false, "the record should not be dirty");
      equal(get(record, 'updatedAt'), "now!", "the hash was updated");
    } else {
      ok(false, "should not get here");
    }

    count++;
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Brohuda Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  set(tom, "name", "Tom Dale");
  set(yehuda, "name", "Yehuda Katz");

  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("by default, deleteRecords calls deleteRecord once per record", function() {
  expect(4);

  var count = 0;

  adapter.deleteRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(record, 'name'), "Tom Dale");
    } else if (count === 1) {
      equal(get(record, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    store.didSaveRecord(record);
  };

  store.load(Person, { id: 1, name: "Tom Dale" });
  store.load(Person, { id: 2, name: "Yehuda Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  tom.deleteRecord();
  yehuda.deleteRecord();
  store.commit();

  // there is nothing to commit, so there won't be any records
  store.commit();
});

test("if an existing model is edited then deleted, deleteRecord is called on the adapter", function() {
  expect(5);

  var count = 0;

  adapter.deleteRecord = function(store, type, record) {
    count++;
    equal(get(record, 'id'), 'deleted-record', "should pass correct record to deleteRecord");
    equal(count, 1, "should only call deleteRecord method of adapter once");

    store.didSaveRecord(record);
  };

  adapter.updateRecord = function() {
    ok(false, "should not have called updateRecord method of adapter");
  };

  // Load data for a record into the store.
  store.load(Person, { id: 'deleted-record', name: "Tom Dale" });

  // Retrieve that loaded record and edit it so it becomes dirty
  var tom = store.find(Person, 'deleted-record');
  tom.set('name', "Tom Mothereffin' Dale");

  equal(get(tom, 'isDirty'), true, "precond - record should be dirty after editing");

  tom.deleteRecord();
  store.commit();

  equal(get(tom, 'isDirty'), false, "record should not be dirty");
  equal(get(tom, 'isDeleted'), true, "record should be considered deleted");

  // should be a no-op since all records should be clean
  store.commit();
});

test("if a created record is marked as invalid by the server, it enters an error state", function() {
  adapter.createRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (get(record, 'name').indexOf('Bro') === -1) {
      store.recordWasInvalid(record, { name: ['common... name requires a "bro"'] });
    } else {
      store.didSaveRecord(record);
    }
  };

  var yehuda = store.createRecord(Person, { id: 1, name: "Yehuda Katz" });

  var hasNameError,
      observer = function() { hasNameError = yehuda.get('errors.name'); };

  Ember.addObserver(yehuda, 'errors.name', observer);

  store.commit();

  equal(get(yehuda, 'isValid'), false, "the record is invalid");
  ok(hasNameError, "should trigger errors.name observer on invalidation");

  set(yehuda, 'updatedAt', true);
  equal(get(yehuda, 'isValid'), false, "the record is still invalid");

  // This tests that we handle undefined values without blowing up
  var errors = get(yehuda, 'errors');
  set(errors, 'other_bound_property', undefined);
  set(yehuda, 'errors', errors);
  set(yehuda, 'name', "Brohuda Brokatz");

  equal(get(yehuda, 'isValid'), true, "the record is no longer invalid after changing");
  equal(get(yehuda, 'isDirty'), true, "the record has outstanding changes");
  ok(!hasNameError, "should trigger errors.name observer on validation");

  equal(get(yehuda, 'isNew'), true, "precond - record is still new");

  store.commit();
  equal(get(yehuda, 'isValid'), true, "record remains valid after committing");
  equal(get(yehuda, 'isNew'), false, "record is no longer new");

  Ember.removeObserver(yehuda, 'errors.name', observer);
});

test("if a created record is marked as erred by the server, it enters an error state", function() {
  adapter.createRecord = function(store, type, record) {
    store.recordWasError(record);
  };

  var person = store.createRecord(Person, { id: 1, name: "John Doe" });

  store.commit();

  ok(get(person, 'isError'), "the record is in the error state");
});

test("if an updated record is marked as invalid by the server, it enters an error state", function() {
  adapter.updateRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (get(record, 'name').indexOf('Bro') === -1) {
      store.recordWasInvalid(record, { name: ['common... name requires a "bro"'] });
    } else {
      store.didSaveRecord(record);
    }
  };

  store.load(Person, { id: 1, name: "Brohuda Brokatz" });
  var yehuda = store.find(Person, 1);

  equal(get(yehuda, 'isValid'), true, "precond - the record is valid");
  set(yehuda, 'name', "Yehuda Katz");
  equal(get(yehuda, 'isValid'), true, "precond - the record is still valid as far as we know");

  equal(get(yehuda, 'isDirty'), true, "the record is dirty");
  store.commit();
  equal(get(yehuda, 'isDirty'), true, "the record is still dirty");
  equal(get(yehuda, 'isValid'), false, "the record is invalid");

  set(yehuda, 'updatedAt', true);
  equal(get(yehuda, 'isValid'), false, "the record is still invalid");

  set(yehuda, 'name', "Brohuda Brokatz");
  equal(get(yehuda, 'isValid'), true, "the record is no longer invalid after changing");
  equal(get(yehuda, 'isDirty'), true, "the record has outstanding changes");

  store.commit();
  equal(get(yehuda, 'isValid'), true, "record remains valid after committing");
  equal(get(yehuda, 'isDirty'), false, "record is no longer new");

  // Test key mapping
});

test("if a created record is marked as erred by the server, it enters an error state", function() {
  adapter.updateRecord = function(store, type, record) {
    store.recordWasError(record);
  };

  store.load(Person, { id: 1, name: "John Doe" });
  var person = store.find(Person, 1);
  person.set('name', "Jonathan Doe");

  store.commit();

  ok(get(person, 'isError'), "the record is in the error state");
});

test("can be created after the DS.Store", function() {
  expect(1);
  store.set('adapter', 'App.adapter');
  adapter.find = function(store, type) {
    equal(type, Person, "the type is correct");
  };
  // Expose the adapter to global namespace
  window.App = {adapter: adapter};

  store.find(Person, 1);
});

test("the filter method can optionally take a server query as well", function() {
  adapter.findQuery = function(store, type, query, array) {
    this.didFindQuery(store, type, { persons: [
      { id: 1, name: "Yehuda Katz" },
      { id: 2, name: "Tom Dale" }
    ]}, array);
  };

  var filter = store.filter(Person, { page: 1 }, function(data) {
    return data.get('name') === "Tom Dale";
  });

  var tom = store.find(Person, 2);

  equal(get(filter, 'length'), 1, "The filter has an item in it");
  deepEqual(filter.toArray(), [ tom ], "The filter has a single entry in it");
});

test("can rollback after sucessives updates", function() {
  store.load(Person, 1, {name: "Paul Chavard"});
  store.set('adapter', 'App.adapter');
  adapter.updateRecord = function(store, type, record) {
    store.didSaveRecord(record);
  };
  // Expose the adapter to global namespace
  window.App = {adapter: adapter};

  var person = store.find(Person, 1);

  equal(person.get('name'), "Paul Chavard", "person has a name defined");

  person.set('name', 'Paul Bro');

  equal(person.get('name'), "Paul Bro", "person changed the name");

  person.get('transaction').rollback();

  equal(person.get('name'), "Paul Chavard", "person name is back to Paul Chavard");

  person.set('name', 'Paul Bro');
  equal(person.get('name'), "Paul Bro", "person changed the name");
  equal(person.get('isDirty'), true, "person is dirty");

  person.get('transaction').commit();

  equal(person.get('isDirty'), false, "person is not dirty");
  equal(person.get('name'), "Paul Bro", "person changed the name");

  person.set('name', 'Paul BroBro');
  equal(person.get('name'), "Paul BroBro", "person changed the name again");
  equal(person.get('isDirty'), true, "person is dirty");

  person.get('transaction').rollback();

  equal(person.get('isDirty'), false, "person is not dirty");
  equal(person.get('name'), "Paul Bro", "person changed the name back to Paul Bro");
});

test("mappings registered on an adapter class are applied to the serializer of adapter instances", function() {
  var MyAdapter = DS.Adapter.extend();

  MyAdapter.configure(Person, {
    primaryKey: 'id!'
  });

  MyAdapter.map(Person, {
    name: { key: 'name!' }
  });

  var adapter = MyAdapter.create();
  store.set('adapter', adapter);

  store.load(Person, {
    'id!': 1,
    'name!': "Tom Dale"
  });

  var person = store.find(Person, 1);

  equal(person.get('id'), 1);
  equal(person.get('name'), "Tom Dale");
});
