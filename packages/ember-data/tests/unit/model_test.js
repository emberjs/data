var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

var Person, store, array;

var testSerializer = DS.Serializer.create({
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

