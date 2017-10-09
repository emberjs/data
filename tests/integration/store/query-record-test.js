import { resolve, reject } from 'rsvp';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';

import DS from 'ember-data';

var Person, store, env;

module("integration/store/query-record - Query one record with a query hash", {
  beforeEach() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  afterEach() {
    run(store, 'destroy');
  }
});

testInDebug("It raises an assertion when no type is passed", function(assert) {
  assert.expectAssertion(function() {
    store.queryRecord();
  }, "You need to pass a model name to the store's queryRecord method");
});

testInDebug("It raises an assertion when no query hash is passed", function(assert) {
  assert.expectAssertion(function() {
    store.queryRecord('person');
  }, "You need to pass a query hash to the store's queryRecord method");
});

test("When a record is requested, the adapter's queryRecord method should be called.", function(assert) {
  assert.expect(1);

  env.registry.register('adapter:person', DS.Adapter.extend({
    queryRecord(store, type, query) {
      assert.equal(type, Person, "the query method is called with the correct type");
      return resolve({ data: { id: 1, type: 'person', attributes: { name: "Peter Wagenet" } } });
    }
  }));

  run(function() {
    store.queryRecord('person', { related: 'posts' });
  });
});

test("When a record is requested, and the promise is rejected, .queryRecord() is rejected.", function(assert) {
  env.registry.register('adapter:person', DS.Adapter.extend({
    queryRecord(store, type, query) {
      return reject();
    }
  }));

  run(function() {
    store.queryRecord('person', {}).catch(function(reason) {
      assert.ok(true, "The rejection handler was called");
    });
  });
});

test("When a record is requested, the serializer's normalizeQueryRecordResponse method should be called.", function(assert) {
  assert.expect(1);

  env.registry.register('serializer:person', DS.JSONAPISerializer.extend({
    normalizeQueryRecordResponse(store, primaryModelClass, payload, id, requestType) {
      assert.equal(payload.data.id , '1', "the normalizeQueryRecordResponse method was called with the right payload");
      return this._super(...arguments);
    }
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    queryRecord(store, type, query) {
      return resolve({
        data: {
          id: '1',
          type: 'person',
          attributes: {
            name: "Peter Wagenet"
          }
        }
      });
    }
  }));

  run(function() {
    store.queryRecord('person', { related: 'posts' });
  });
});
