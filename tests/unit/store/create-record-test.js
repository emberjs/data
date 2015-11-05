import {createStore} from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import {module, test} from 'qunit';
import DS from 'ember-data';

var store, container, Record, Storage;
var run = Ember.run;

module("unit/store/createRecord - Store creating records", {
  beforeEach: function() {
    Record = DS.Model.extend({
      title: DS.attr('string')
    });

    Storage = DS.Model.extend({
      name: DS.attr('name'),
      records: DS.hasMany('record', { async: false })
    });

    store = createStore({
      adapter: DS.Adapter.extend(),
      record: Record,
      storage: Storage
    });
  }
});

test("doesn't modify passed in properties hash", function(assert) {
  var attributes = { foo: 'bar' };
  run(function() {
    store.createRecord('record', attributes);
    store.createRecord('record', attributes);
  });

  assert.deepEqual(attributes, { foo: 'bar' }, "The properties hash is not modified");
});

test("allow passing relationships as well as attributes", function(assert) {
  var records, storage;
  run(function() {
    store.push({
      data: [{
        type: 'record',
        id: '1',
        attributes: {
          title: "it's a beautiful day"
        }
      }, {
        type: 'record',
        id: '2',
        attributes: {
          title: "it's a beautiful day"
        }
      }]
    });
    records = store.peekAll('record');
    storage = store.createRecord('storage', { name: 'Great store', records: records });
  });

  assert.equal(storage.get('name'), 'Great store', "The attribute is well defined");
  assert.equal(storage.get('records').findBy('id', '1'), Ember.A(records).findBy('id', '1'), "Defined relationships are allowed in createRecord");
  assert.equal(storage.get('records').findBy('id', '2'), Ember.A(records).findBy('id', '2'), "Defined relationships are allowed in createRecord");
});

module("unit/store/createRecord - Store with models by dash", {
  beforeEach: function() {
    var env = setupStore({
      someThing: DS.Model.extend({ foo: DS.attr('string') })
    });
    store = env.store;
    container = env.container;
  }
});

test("creating a record by camel-case string finds the model", function(assert) {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('some-thing', attributes);
  });

  assert.equal(record.get('foo'), attributes.foo, "The record is created");
  assert.equal(store.modelFor('someThing').modelName, 'some-thing');
});

test("creating a record by dasherize string finds the model", function(assert) {
  var attributes = { foo: 'bar' };
  var record;

  run(function() {
    record = store.createRecord('some-thing', attributes);
  });

  assert.equal(record.get('foo'), attributes.foo, "The record is created");
  assert.equal(store.modelFor('some-thing').modelName, 'some-thing');
});
