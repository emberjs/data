var get = Ember.get, set = Ember.set, getPath = Ember.getPath;
var Person;

module("DS.RecordArray");

var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

module("DS.Store", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr('string')
    });
  },

  teardown: function() {
    Person = null;
    set(DS, 'defaultStore', null);
  }
});

test("a record array is backed by records", function() {
  var store = DS.Store.create();
  store.loadMany(Person, [1,2,3], array);

  var recordArray = store.find(Person, [1,2,3]);

  for (var i=0, l=get(array, 'length'); i<l; i++) {
    deepEqual(recordArray.objectAt(i).getProperties('id', 'name'), array[i], "a record array materializes objects on demand");
  }
});

test("a loaded record is removed from a record array when it is deleted", function() {
  var store = DS.Store.create();
  store.loadMany(Person, [1,2,3], array);

  var scumbag = store.find(Person, 1);

  var recordArray = store.find(Person, [1, 2, 3]);
  equal(get(recordArray, 'length'), 3, "precond - record array has three items");
  equal(get(recordArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is record with id 1");

  scumbag.deleteRecord();

  equal(get(recordArray, 'length'), 2, "record is removed from the record array");
  ok(get(recordArray.objectAt(0), 'name') !== "Scumbag Dale", "item was removed");
});

// GitHub Issue #168
test("a newly created record is removed from a record array when it is deleted", function() {
  var store = DS.Store.create(),
      recordArray;

  recordArray = store.findAll(Person);

  var scumbag = store.createRecord(Person, {
    name: "Scumbag Dale"
  });

  // guarantee coalescence
  Ember.run(function() {
    store.createRecord(Person, { name: 'p1'});
    store.createRecord(Person, { name: 'p2'});
    store.createRecord(Person, { name: 'p3'});
  });

  equal(get(recordArray, 'length'), 4, "precond - record array has the created item");
  equal(get(recordArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is record with id 1");

  scumbag.deleteRecord();

  equal(get(recordArray, 'length'), 3, "record is removed from the record array");
});

test("a record array returns undefined when asking for a member outside of its content Array's range", function() {
  var store = DS.Store.create();

  store.loadMany(Person, array);

  var recordArray = store.find(Person);

  strictEqual(recordArray.objectAt(20), undefined, "objects outside of the range just return undefined");
});

// This tests for a bug in the recordCache, where the records were being cached in the incorrect order.
test("a record array should be able to be enumerated in any order", function() {
  var store = DS.Store.create();
  store.loadMany(Person, [1,2,3], array);

  var recordArray = store.find(Person);

  equal(get(recordArray.objectAt(2), 'id'), 3, "should retrieve correct record at index 3");
  equal(get(recordArray.objectAt(0), 'id'), 1, "should retrieve correct record at index 0");
  equal(get(recordArray.objectAt(0), 'id'), 1, "should retrieve correct record at index 0");
});

var shouldContain = function(array, item) {
  ok(array.indexOf(item) !== -1, "array should contain "+item.get('name'));
};

var shouldNotContain = function(array, item) {
  ok(array.indexOf(item) === -1, "array should not contain "+item.get('name'));
};

test("an AdapterPopulatedRecordArray knows if it's loaded or not", function() {
  expect(2);

  var store = DS.Store.create({
    adapter: {
      findQuery: function(store, type, query, recordArray) {
        stop();

        setTimeout(function() {
          recordArray.load(array);
          equal(get(array, 'isLoaded'), true, "The array is now loaded");
          start();
        }, 100);
      }
    }
  });

  var array = store.find(Person, { page: 1 });

  equal(get(array, 'isLoaded'), false, "The array is not yet loaded");
});

test("a record array that backs a collection view functions properly", function() {

  var store = DS.Store.create();

  store.load(Person, 5, { name: "Other Katz" });

  var container = Ember.CollectionView.create({
    content: store.findAll(Person)
  });

  container.appendTo('#qunit-fixture');

  function compareArrays() {
    var recordArray = container.content;
    var recordCache = store.get('recordCache');
    var content = recordArray.get('content');
    for(var i = 0; i < content.length; i++) {
      var clientId = content.objectAt(i);
      var record = recordCache[clientId];
      equal(record && record.clientId, clientId, "The entries in the record cache should have matching client ids.");
    }
  }

  compareArrays();

  store.load(Person, 6, { name: "Scumbag Demon" });

  compareArrays();

  store.load(Person, 7, { name: "Lord British" });

  compareArrays();

  container.destroy();

});

