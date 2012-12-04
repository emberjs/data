var get = Ember.get, set = Ember.set;
var Person;

module("DS.RecordArray");

var array;

module("DS.Store", {
  setup: function() {
    array = [{ id: '1', name: "Scumbag Dale" }, { id: '2', name: "Scumbag Katz" }, { id: '3', name: "Scumbag Bryn" }];
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

  var recordArray = store.findMany(Person, [1,2,3]);

  for (var i=0, l=get(array, 'length'); i<l; i++) {
    deepEqual(recordArray.objectAt(i).getProperties('id', 'name'), array[i], "a record array materializes objects on demand");
  }
});

test("a loaded record is removed from a record array when it is deleted", function() {
  var store = DS.Store.create();

  var Tag = DS.Model.extend({
    people: DS.hasMany(Person)
  });

  Person.reopen({
    tag: DS.belongsTo(Tag)
  });

  store.loadMany(Person, [1,2,3], array);
  store.load(Tag, { id: 1 });

  var scumbag = store.find(Person, 1);
  var tag = store.find(Tag, 1);

  tag.get('people').addObject(scumbag);
  equal(get(scumbag, 'tag'), tag, "precond - the scumbag's tag has been set");

  var recordArray = tag.get('people');

  equal(get(recordArray, 'length'), 1, "precond - record array has one item");
  equal(get(recordArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is record with id 1");

  scumbag.deleteRecord();

  equal(get(recordArray, 'length'), 0, "record is removed from the record array");
});

// GitHub Issue #168
test("a newly created record is removed from a record array when it is deleted", function() {
  var store = DS.Store.create(),
      recordArray;

  recordArray = store.all(Person);

  var scumbag = store.createRecord(Person, {
    name: "Scumbag Dale"
  });

  equal(get(recordArray, 'length'), 1, "precond - record array already has the first created item");

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

  var recordArray = store.all(Person);

  strictEqual(recordArray.objectAt(20), undefined, "objects outside of the range just return undefined");
});

test("if an association record is deleted, it is removed from the association", function() {
  var store = DS.Store.create();

  var Tag = DS.Model.extend({
    people: DS.hasMany(Person)
  });

  Person.reopen({
    tag: DS.belongsTo(Tag)
  });

  store.load(Person, {id: '1'} );
  store.load(Tag, { id: '1', people: ['1'] });

  var tag = store.find(Tag, 1);
  var people = get(tag, 'people');
  var person1 = store.find(Person, 1);

  equal( get(people,'length'), 1, "the record exists in the association");

  person1.deleteRecord();

  equal( get(people,'length'), 0, "the record is removed from the association");
});

test("if an association record is created and then deleted, it is removed from the association", function() {
  var store = DS.Store.create();

  var Tag = DS.Model.extend({
    people: DS.hasMany(Person)
  });

  Person.reopen({
    tag: DS.belongsTo(Tag)
  });

  store.load(Tag, { id: '1', people: [] });

  var tag = store.find(Tag, 1);
  var people = get(tag, 'people');
  var person = store.createRecord(Person, {});

  equal( get(people,'length'), 0, "there are no associations");

  people.pushObject(person);

  equal( get(people,'length'), 1, "the record exists in the association");

  person.deleteRecord();

  equal( get(people,'length'), 0, "the record is removed from the association");
});


// This tests for a bug in the recordCache, where the records were being cached in the incorrect order.
test("a record array should be able to be enumerated in any order", function() {
  var store = DS.Store.create();
  store.loadMany(Person, [1,2,3], array);

  var recordArray = store.all(Person);

  equal(get(recordArray.objectAt(2), 'id'), 3, "should retrieve correct record at index 2");
  equal(get(recordArray.objectAt(1), 'id'), 2, "should retrieve correct record at index 1");
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
    content: store.all(Person)
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
