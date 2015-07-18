var get = Ember.get;

var Person, array;
var run = Ember.run;

module("unit/record_array - DS.RecordArray", {
  setup: function() {
    array = [{ id: '1', name: "Scumbag Dale" }, { id: '2', name: "Scumbag Katz" }, { id: '3', name: "Scumbag Bryn" }];

    Person = DS.Model.extend({
      name: DS.attr('string')
    });
  }
});

test("a record array is backed by records", function() {
  expect(3);

  var store = createStore({
    person: Person
  });
  run(function() {
    store.pushMany('person', array);
  });

  run(function() {
    store.findByIds('person', [1,2,3]).then(function(records) {
      for (var i=0, l=get(array, 'length'); i<l; i++) {
        deepEqual(records[i].getProperties('id', 'name'), array[i], "a record array materializes objects on demand");
      }
    });
  });
});

test("acts as a live query", function() {

  var store = createStore({
    person: Person
  });
  var recordArray = store.peekAll('person');
  run(function() {
    store.push('person', { id: 1, name: 'wycats' });
  });
  equal(get(recordArray, 'lastObject.name'), 'wycats');

  run(function() {
    store.push('person', { id: 2, name: 'brohuda' });
  });
  equal(get(recordArray, 'lastObject.name'), 'brohuda');
});

test("stops updating when destroyed", function() {
  expect(3);

  var store = createStore({
    person: Person
  });
  // TODO remove once
  // https://github.com/emberjs/ember.js/commit/c3f13e85a62069295965dd49ca487fe6ddba1188
  // is on the release branch
  var emptyLength = Ember.meta(store).descs ? undefined : 0;

  var recordArray = store.peekAll('person');
  run(function() {
    store.push('person', { id: 1, name: 'wycats' });
  });

  run(function() {
    recordArray.destroy();
  });

  run(function() {
    equal(recordArray.get('length'), emptyLength, "Has no more records");
    store.push('person', { id: 2, name: 'brohuda' });
  });

  equal(recordArray.get('length'), emptyLength, "Has not been updated");
  equal(recordArray.get('content'), undefined, "Has not been updated");
});


test("a loaded record is removed from a record array when it is deleted", function() {
  expect(5);

  var Tag = DS.Model.extend({
    people: DS.hasMany('person', { async: false })
  });

  Person.reopen({
    tag: DS.belongsTo('tag', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person,
    adapter: DS.Adapter.extend({
      deleteRecord: () => Ember.RSVP.resolve()
    })
  });
  var store = env.store;

  run(function() {
    store.pushMany('person', array);
    store.push('tag', { id: 1 });
  });

  run(function() {
    var asyncRecords = Ember.RSVP.hash({
      scumbag: store.findRecord('person', 1),
      tag: store.findRecord('tag', 1)
    });

    asyncRecords.then(function(records) {
      var scumbag = records.scumbag;
      var tag = records.tag;

      run(function() {
        tag.get('people').addObject(scumbag);
      });
      equal(get(scumbag, 'tag'), tag, "precond - the scumbag's tag has been set");

      var recordArray = tag.get('people');

      equal(get(recordArray, 'length'), 1, "precond - record array has one item");
      equal(get(recordArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is record with id 1");

      scumbag.deleteRecord();

      equal(get(recordArray, 'length'), 1, "record is still in the record array until it is saved");

      Ember.run(scumbag, 'save');

      equal(get(recordArray, 'length'), 0, "record is removed from the array when it is saved");
    });
  });
});

test("a loaded record is not removed from a record array when it is deleted even if the belongsTo side isn't defined", function() {
  var Tag = DS.Model.extend({
    people: DS.hasMany('person', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person,
    adapter: DS.Adapter.extend({
      deleteRecord: () => Ember.RSVP.resolve()
    })
  });
  var store = env.store;
  var scumbag, tag;

  run(function() {
    scumbag = store.push('person', { id: 1, name: 'Scumbag Tom' });
    tag = store.push('tag', { id: 1, people: [1] });
    scumbag.deleteRecord();
  });

  equal(tag.get('people.length'), 1, 'record is not removed from the record array');
  equal(tag.get('people').objectAt(0), scumbag, 'tag still has the scumbag');
});

test("a loaded record is not removed from both the record array and from the belongs to, even if the belongsTo side isn't defined", function() {
  var Tag = DS.Model.extend({
    people: DS.hasMany('person', { async: false })
  });

  var Tool = DS.Model.extend({
    person: DS.belongsTo('person', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person,
    tool: Tool,
    adapter: DS.Adapter.extend({
      deleteRecord: () => Ember.RSVP.resolve()
    })
  });
  var store = env.store;
  var scumbag, tag, tool;

  run(function() {
    scumbag = store.push('person', { id: 1, name: 'Scumbag Tom' });
    tag = store.push('tag', { id: 1, people: [1] });
    tool = store.push('tool', { id:  1, person: 1 });
  });

  equal(tag.get('people.length'), 1, "record is in the record array");
  equal(tool.get('person'), scumbag, "the tool belongs to the record");

  run(function() {
    scumbag.deleteRecord();
  });

  equal(tag.get('people.length'), 1, "record is stil in the record array");
  equal(tool.get('person'), scumbag, "the tool still belongs to the record");
});

// GitHub Issue #168
test("a newly created record is removed from a record array when it is deleted", function() {
  var store = createStore({
    person: Person
  });
  var recordArray = store.peekAll('person');
  var scumbag;

  run(function() {
    scumbag = store.createRecord('person', {
      name: "Scumbag Dale"
    });
  });

  equal(get(recordArray, 'length'), 1, "precond - record array already has the first created item");

  // guarantee coalescence
  Ember.run(function() {
    store.createRecord('person', { name: 'p1' });
    store.createRecord('person', { name: 'p2' });
    store.createRecord('person', { name: 'p3' });
  });

  equal(get(recordArray, 'length'), 4, "precond - record array has the created item");
  equal(recordArray.objectAt(0), scumbag, "item at index 0 is record with id 1");

  run(function() {
    scumbag.deleteRecord();
  });

  equal(get(recordArray, 'length'), 3, "record array still has the created item");
});

test("a record array returns undefined when asking for a member outside of its content Array's range", function() {
  var store = createStore({
    person: Person
  });

  run(function() {
    store.pushMany('person', array);
  });

  var recordArray = store.peekAll('person');

  strictEqual(recordArray.objectAt(20), undefined, "objects outside of the range just return undefined");
});

// This tests for a bug in the recordCache, where the records were being cached in the incorrect order.
test("a record array should be able to be enumerated in any order", function() {
  var store = createStore({
    person: Person
  });
  run(function() {
    store.pushMany('person', array);
  });

  var recordArray = store.peekAll('person');

  equal(get(recordArray.objectAt(2), 'id'), 3, "should retrieve correct record at index 2");
  equal(get(recordArray.objectAt(1), 'id'), 2, "should retrieve correct record at index 1");
  equal(get(recordArray.objectAt(0), 'id'), 1, "should retrieve correct record at index 0");
});

test("an AdapterPopulatedRecordArray knows if it's loaded or not", function() {
  expect(1);

  var env = setupStore({ person: Person });
  var store = env.store;

  env.adapter.query = function(store, type, query, recordArray) {
    return Ember.RSVP.resolve(array);
  };

  run(function() {
    store.query('person', { query: { page: 1 } }).then(function(people) {
      equal(get(people, 'isLoaded'), true, "The array is now loaded");
    });
  });
});

test("a record array should return a promise when updating", function() {
  var recordArray, promise;
  var env = setupStore({ person: Person });
  var store = env.store;

  env.adapter.findAll = function(store, type, query, recordArray) {
    return Ember.RSVP.resolve(array);
  };

  recordArray = store.peekAll('person');
  run(function() {
    promise = recordArray.update();
  });
  ok(promise.then && typeof promise.then === "function", "#update returns a promise");
});
