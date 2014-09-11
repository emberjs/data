var get = Ember.get, set = Ember.set;
var indexOf = Ember.EnumerableUtils.indexOf;

var Person, array;

module("unit/record_array - DS.RecordArray", {
  setup: function() {
    array = [{ id: '1', name: "Scumbag Dale" }, { id: '2', name: "Scumbag Katz" }, { id: '3', name: "Scumbag Bryn" }];

    Person = DS.Model.extend({
      name: DS.attr('string')
    });
  }
});

test("a record array is backed by records", function() {
  var store = createStore();
  store.pushMany(Person, array);

  store.findByIds(Person, [1,2,3]).then(async(function(records) {
    for (var i=0, l=get(array, 'length'); i<l; i++) {
      deepEqual(records[i].getProperties('id', 'name'), array[i], "a record array materializes objects on demand");
    }
  }));
});

test("acts as a live query", function() {
  var store = createStore();

  var recordArray = store.all(Person);
  store.push(Person, { id: 1, name: 'wycats' });
  equal(get(recordArray, 'lastObject.name'), 'wycats');

  store.push(Person, { id: 2, name: 'brohuda' });
  equal(get(recordArray, 'lastObject.name'), 'brohuda');
});

test("a loaded record is removed from a record array when it is deleted", function() {
  var Tag = DS.Model.extend({
    people: DS.hasMany('person')
  });

  Person.reopen({
    tag: DS.belongsTo('tag')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.pushMany('person', array);
  store.push('tag', { id: 1 });

  var asyncRecords = Ember.RSVP.hash({
    scumbag: store.find('person', 1),
    tag: store.find('tag', 1)
  });

  asyncRecords.then(async(function(records) {
    var scumbag = records.scumbag, tag = records.tag;

    tag.get('people').addObject(scumbag);
    equal(get(scumbag, 'tag'), tag, "precond - the scumbag's tag has been set");

    var recordArray = tag.get('people');

    equal(get(recordArray, 'length'), 1, "precond - record array has one item");
    equal(get(recordArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is record with id 1");

    scumbag.deleteRecord();

    equal(get(recordArray, 'length'), 0, "record is removed from the record array");
  }));
});

test("a loaded record is removed from a record array when it is deleted even if the belongsTo side isn't defined", function() {
  var Tag = DS.Model.extend({
    people: DS.hasMany('person')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  var scumbag = store.push('person', {id:1, name: 'Scumbag Tom'});
  var tag = store.push('tag', { id: 1, people:[1] });

  scumbag.deleteRecord();

  equal(tag.get('people.length'), 0, "record is removed from the record array");
});

// GitHub Issue #168
test("a newly created record is removed from a record array when it is deleted", function() {
  var store = createStore(),
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

  recordArray.objectAt(0).set('name', 'toto');

  equal(get(recordArray, 'length'), 3, "record is still removed from the record array");
});

test("a record array returns undefined when asking for a member outside of its content Array's range", function() {
  var store = createStore();

  store.pushMany(Person, array);

  var recordArray = store.all(Person);

  strictEqual(recordArray.objectAt(20), undefined, "objects outside of the range just return undefined");
});

// This tests for a bug in the recordCache, where the records were being cached in the incorrect order.
test("a record array should be able to be enumerated in any order", function() {
  var store = createStore();
  store.pushMany(Person, array);

  var recordArray = store.all(Person);

  equal(get(recordArray.objectAt(2), 'id'), 3, "should retrieve correct record at index 2");
  equal(get(recordArray.objectAt(1), 'id'), 2, "should retrieve correct record at index 1");
  equal(get(recordArray.objectAt(0), 'id'), 1, "should retrieve correct record at index 0");
});

var shouldContain = function(array, item) {
  ok(indexOf(array, item) !== -1, "array should contain "+item.get('name'));
};

var shouldNotContain = function(array, item) {
  ok(indexOf(array, item) === -1, "array should not contain "+item.get('name'));
};

test("an AdapterPopulatedRecordArray knows if it's loaded or not", function() {
  var env = setupStore({ person: Person }),
      store = env.store;

  env.adapter.findQuery = function(store, type, query, recordArray) {
    return Ember.RSVP.resolve(array);
  };

  store.find('person', { page: 1 }).then(async(function(people) {
    equal(get(people, 'isLoaded'), true, "The array is now loaded");
  }));
});

test("a record array should return a promise when updating", function() {
  var env = setupStore({ person: Person }),
      store = env.store, recordArray, promise;

  env.adapter.findAll = function(store, type, query, recordArray) {
    return Ember.RSVP.resolve(array);
  };

  recordArray = store.all(Person);
  promise = recordArray.update();
  ok((promise.then && typeof promise.then === "function"), "#update returns a promise");
});
