var store, container, Record;
var run = Ember.run;

module("unit/store/createRecord - Store creating records", {
  setup: function() {
    store = createStore({ adapter: DS.Adapter.extend() });

    Record = DS.Model.extend({
      title: DS.attr('string')
    });
  }
});

test("doesn't modify passed in properties hash", function() {
  var attributes = { foo: 'bar' };
  run(function() {
    store.createRecord(Record, attributes);
    store.createRecord(Record, attributes);
  });

  deepEqual(attributes, { foo: 'bar' }, "The properties hash is not modified");
});

module("unit/store/createRecord - Store with models by dash", {
  setup: function() {
    var env = setupStore({
      'some-thing': DS.Model.extend({ foo: DS.attr('string') })
    });
    store = env.store;
    container = env.container;
    env.replaceContainerNormalize(function(key) {
      return Ember.String.dasherize(key);
    });
  }
});
test("creating a record by camel-case string finds the model", function() {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('someThing', attributes);
  });

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('someThing').typeKey, 'some-thing');
});

test("creating a record by dasherize string finds the model", function() {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('some-thing', attributes);
  });

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('some-thing').typeKey, 'some-thing');
});

module("unit/store/createRecord - Store with models by camelCase", {
  setup: function() {
    var env = setupStore({
      someThing: DS.Model.extend({ foo: DS.attr('string') })
    });
    store = env.store;
    container = env.container;
    env.replaceContainerNormalize(Ember.String.camelize);
  }
});

test("creating a record by camel-case string finds the model", function() {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('someThing', attributes);
  });

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('someThing').typeKey, 'someThing');
});

test("creating a record by dasherize string finds the model", function() {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('some-thing', attributes);
  });

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('some-thing').typeKey, 'someThing');
});
