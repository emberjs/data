var store, container, Record;
var run = Ember.run;

module("unit/store/createRecord - Store creating records", {
  setup: function() {
    Record = DS.Model.extend({
      title: DS.attr('string')
    });

    store = createStore({
      adapter: DS.Adapter.extend(),
      record: Record
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
