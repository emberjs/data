var get = Ember.get, set = Ember.set;

var Person, store, array;

var testSerializer = DS.JSONSerializer.create({
  primaryKey: function() {
    return 'id';
  }
});

var TestAdapter = DS.Adapter.extend({
  serializer: testSerializer
});

module("DS.Model", {
  setup: function() {
    store = DS.Store.create({
      adapter: TestAdapter.create()
    });

    Person = DS.Model.extend({
      name: DS.attr('string'),
      isDrugAddict: DS.attr('boolean')
    });
  },

  teardown: function() {
    Person = null;
    store = null;
  }
});

test("can have a property set on it", function() {
  var record = store.createRecord(Person);
  set(record, 'name', 'bar');

  equal(get(record, 'name'), 'bar', "property was set on the record");
});

test("setting a property on a record that has not changed does not cause it to become dirty", function() {
  store.load(Person, { id: 1, name: "Peter", isDrugAddict: true });
  var person = store.find(Person, 1);

  equal(person.get('isDirty'), false, "precond - person record should not be dirty");
  person.set('name', "Peter");
  person.set('isDrugAddict', true);
  equal(person.get('isDirty'), false, "record does not become dirty after setting property to old value");
});

test("a record reports its unique id via the `id` property", function() {
  store.load(Person, { id: 1 });

  var record = store.find(Person, 1);
  equal(get(record, 'id'), 1, "reports id as id by default");
});

test("a record's id is included in its toString represenation", function() {
  store.load(Person, { id: 1 });

  var record = store.find(Person, 1);
  equal(record.toString(), '<(subclass of DS.Model):'+Ember.guidFor(record)+':1>', "reports id in toString");
});

test("trying to set an `id` attribute should raise", function() {
  Person = DS.Model.extend({
    id: DS.attr('number'),
    name: "Scumdale"
  });

  raises(function() {
    store.load(Person, { id: 1, name: "Scumdale" });
    var person = store.find(Person, 1);
    person.get('name');
  }, /You may not set `id`/);
});

test("it should cache attributes", function() {
  var store = DS.Store.create();

  var Post = DS.Model.extend({
    updatedAt: DS.attr('string')
  });

  var dateString = "Sat, 31 Dec 2011 00:08:16 GMT";
  var date = new Date(dateString);

  store.load(Post, { id: 1 });

  var record = store.find(Post, 1);

  record.set('updatedAt', date);
  deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
  strictEqual(get(record, 'updatedAt'), get(record, 'updatedAt'), "second get still returns the same object");
});

module("DS.Model updating", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });
    store = DS.Store.create();
    store.loadMany(Person, array);
  },
  teardown: function() {
    Person = null;
    store = null;
    array = null;
  }
});

test("a DS.Model can update its attributes", function() {
  var person = store.find(Person, 2);

  set(person, 'name', "Brohuda Katz");
  equal(get(person, 'name'), "Brohuda Katz", "setting took hold");
});

test("a DS.Model can have a defaultValue", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string', { defaultValue: "unknown" })
  });

  var tag = Tag.createRecord();

  equal(get(tag, 'name'), "unknown", "the default value is found");

  set(tag, 'name', null);

  equal(get(tag, 'name'), null, "null doesn't shadow defaultValue");
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  var people = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the RecordArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  set(person, 'name', "Yehuda Katz");

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  set(person, 'name', "Yehuda Katz-Foo");

  equal(get(people, 'length'), 0, "there are now no items");
});

module("with a simple Person model", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({
      name: DS.attr('string')
    });
    store = DS.Store.create();
    store.loadMany(Person, array);
  },
  teardown: function() {
    Person = null;
    store = null;
    array = null;
  }
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  var people = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the RecordArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  set(person, 'name', "Yehuda Katz");

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  set(person, 'name', "Yehuda Katz-Foo");

  equal(get(people, 'length'), 0, "there are now no items");
});

test("can ask if record with a given id is loaded", function() {
  equal(store.recordIsLoaded(Person, 1), true, 'should have person with id 1');
  equal(store.recordIsLoaded(Person, 4), false, 'should not have person with id 2');
});

test("a listener can be added to a record", function() {
  var count = 0;
  var F = function() { count++; };
  var record = store.createRecord(Person);

  record.on('event!', F);
  record.trigger('event!');

  equal(count, 1, "the event was triggered");

  record.trigger('event!');

  equal(count, 2, "the event was triggered");
});

test("when an event is triggered on a record the method with the same name is invoked with arguments", function(){
  var count = 0;
  var F = function() { count++; };
  var record = store.createRecord(Person);

  record.eventNamedMethod = F;

  record.trigger('eventNamedMethod');

  equal(count, 1, "the corresponding method was called");
});

test("when a method is invoked from an event with the same name the arguments are passed through", function(){
  var eventMethodArgs = null;
  var F = function() { eventMethodArgs = arguments; };
  var record = store.createRecord(Person);

  record.eventThatTriggersMethod = F;

  record.trigger('eventThatTriggersMethod', 1, 2);

  equal( eventMethodArgs[0], 1);
  equal( eventMethodArgs[1], 2);
});

var converts = function(type, provided, expected) {
  var testStore = DS.Store.create();

  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  testStore.load(Model, { id: 1, name: provided });
  testStore.load(Model, { id: 2 });

  var record = testStore.find(Model, 1);
  deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);

  // See: Github issue #421
  // record = testStore.find(Model, 2);
  // set(record, 'name', provided);
  // deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsFromServer = function(type, provided, expected) {
  var testStore = DS.Store.create();

  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  testStore.load(Model, { id: 1, name: provided });
  var record = testStore.find(Model, 1);

  deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsWhenSet = function(type, provided, expected) {
  var testStore = DS.Store.create();

  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  testStore.load(Model, { id: 2 });
  var record = testStore.find(Model, 2);

  set(record, 'name', provided);
  deepEqual(record.serialize().name, expected, type + " saves " + provided + " as " + expected);
};

test("a DS.Model can describe String attributes", function() {
  converts('string', "Scumbag Tom", "Scumbag Tom");
  converts('string', 1, "1");
  converts('string', null, null);
  converts('string', undefined, null);
  convertsFromServer('string', undefined, null);
});

test("a DS.Model can describe Number attributes", function() {
  converts('number', "1", 1);
  converts('number', "0", 0);
  converts('number', 1, 1);
  converts('number', 0, 0);
  converts('number', null, null);
  converts('number', undefined, null);
  converts('number', true, 1);
  converts('number', false, 0);
});

test("a DS.Model can describe Boolean attributes", function() {
  converts('boolean', "1", true);
  converts('boolean', "", false);
  converts('boolean', 1, true);
  converts('boolean', 0, false);
  converts('boolean', null, false);
  converts('boolean', true, true);
  converts('boolean', false, false);
});

test("a DS.Model can describe Date attributes", function() {
  converts('date', null, null);
  converts('date', undefined, undefined);

  var dateString = "Sat, 31 Dec 2011 00:08:16 GMT";
  var date = new Date(dateString);

  var store = DS.Store.create();

  var Person = DS.Model.extend({
    updatedAt: DS.attr('date')
  });

  store.load(Person, { id: 1 });
  var record = store.find(Person, 1);

  record.set('updatedAt', date);
  deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
  convertsFromServer('date', dateString, date);
  convertsWhenSet('date', date, dateString);
});

test("don't allow setting", function(){
  var store = DS.Store.create();

  var Person = DS.Model.extend();
  var record = store.createRecord(Person);

  raises(function(){
    record.set('isLoaded', true);
  }, "raised error when trying to set an unsettable record");
});
