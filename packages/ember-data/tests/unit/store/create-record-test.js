var store, container, Record, Storage;
var run = Ember.run;

module("unit/store/createRecord - Store creating records", {
  setup: function() {
    Record = DS.Model.extend({
      title: DS.attr('string')
    });

    Storage = DS.Model.extend({
      name: DS.attr('name'),
      records: DS.hasMany('record')
    });

    store = createStore({
      adapter: DS.Adapter.extend(),
      record: Record,
      storage: Storage
    });
  }
});

test("doesn't modify passed in properties hash", function() {
  var attributes = { foo: 'bar' };
  run(function() {
    store.createRecord('record', attributes);
    store.createRecord('record', attributes);
  });

  deepEqual(attributes, { foo: 'bar' }, "The properties hash is not modified");
});

test("allow passing relationships as well as attributes", function() {
  var records, storage;
  run(function() {
    records = store.pushMany('record', [{ id: 1, title: "it's a beautiful day" }, { id: 2, title: "it's a beautiful day" }]);
    storage = store.createRecord('storage', { name: 'Great store', records: records });
  });

  equal(storage.get('name'), 'Great store', "The attribute is well defined");
  equal(storage.get('records').findBy('id', '1'), Ember.A(records).findBy('id', '1'), "Defined relationships are allowed in createRecord");
  equal(storage.get('records').findBy('id', '2'), Ember.A(records).findBy('id', '2'), "Defined relationships are allowed in createRecord");
});

module("unit/store/createRecord - Store with models by dash", {
  setup: function() {
    var env = setupStore({
      someThing: DS.Model.extend({ foo: DS.attr('string') })
    });
    store = env.store;
    container = env.container;
  }
});
test("creating a record by camel-case string finds the model", function() {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('some-thing', attributes);
  });

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('someThing').modelName, 'some-thing');
});

test("creating a record by dasherize string finds the model", function() {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('some-thing', attributes);
  });

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('some-thing').modelName, 'some-thing');
});

module("unit/store/createRecord - Store with models by camelCase", {
  setup: function() {
    var env = setupStore({
      someThing: DS.Model.extend({ foo: DS.attr('string') })
    });
    store = env.store;
    container = env.container;
  }
});

test("creating a record by camel-case string finds the model", function() {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('some-thing', attributes);
  });

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('someThing').modelName, 'some-thing');
});

test("creating a record by dasherize string finds the model", function() {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('some-thing', attributes);
  });

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('some-thing').modelName, 'some-thing');
});
