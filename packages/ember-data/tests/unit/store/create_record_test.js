var get = Ember.get, set = Ember.set;
var store, container, Record;

module("unit/store/createRecord - Store creating records", {
  setup: function() {
    store = createStore({ adapter: DS.Adapter.extend()});

    Record = DS.Model.extend({
      title: DS.attr('string')
    });
  }
});

test("doesn't modify passed in properties hash", function(){
  var attributes = { foo: 'bar' },
      record1 = store.createRecord(Record, attributes),
      record2 = store.createRecord(Record, attributes);

  deepEqual(attributes, { foo: 'bar' }, "The properties hash is not modified");
});

module("unit/store/createRecord - Store with models by dash", {
  setup: function() {
    var env = setupStore({
      'some-thing': DS.Model.extend({ foo: DS.attr('string') })
    });
    store = env.store;
    container = env.container;
    container.normalize = function(key){
      return Ember.String.dasherize(key);
    };
  }
});

test("creating a record by camel-case string finds the model", function(){
  var attributes = { foo: 'bar' },
      record = store.createRecord('someThing', attributes);

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('someThing').typeKey, 'someThing');
});

test("creating a record by dasherize string finds the model", function(){
  var attributes = { foo: 'bar' },
      record = store.createRecord('some-thing', attributes);

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('some-thing').typeKey, 'someThing');
});

module("unit/store/createRecord - Store with models by camelCase", {
  setup: function() {
    var env = setupStore({
      'someThing': DS.Model.extend({ foo: DS.attr('string') })
    });
    store = env.store;
    container = env.container;
    container.normalize = function(key){
      return Ember.String.camelize(key);
    };
  }
});

test("creating a record by camel-case string finds the model", function(){
  var attributes = { foo: 'bar' },
      record = store.createRecord('someThing', attributes);

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('someThing').typeKey, 'someThing');
});

test("creating a record by dasherize string finds the model", function(){
  var attributes = { foo: 'bar' },
      record = store.createRecord('some-thing', attributes);

  equal(record.get('foo'), attributes.foo, "The record is created");
  equal(store.modelFor('some-thing').typeKey, 'someThing');
});
