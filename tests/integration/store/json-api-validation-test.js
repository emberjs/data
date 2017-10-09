import { resolve } from 'rsvp';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import QUnit, { module } from 'qunit';
import DS from 'ember-data';

var Person, store, env;

function payloadError(payload, expectedError) {
  env.registry.register('serializer:person', DS.Serializer.extend({
    normalizeResponse(store, type, pld) {
      return pld;
    }
  }));
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return resolve(payload);
    }
  }));
  this.throws(function () {
    run(function() {
      store.findRecord('person', 1);
    });
  }, expectedError, `Payload ${JSON.stringify(payload)} should throw error ${expectedError}`);
  env.registry.unregister('serializer:person');
  env.registry.unregister('adapter:person');
}

module("integration/store/json-validation", {
  beforeEach() {
    QUnit.assert.payloadError = payloadError;

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
    QUnit.assert.payloadError = null
    run(store, 'destroy');
  }
});

testInDebug("when normalizeResponse returns undefined (or doesn't return), throws an error", function(assert) {

  env.registry.register('serializer:person', DS.Serializer.extend({
    normalizeResponse() {}
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return resolve({ data: {} });
    }
  }));

  assert.throws(function () {
    run(function() {
      store.findRecord('person', 1);
    });
  }, /Top level of a JSON API document must be an object/);
});

testInDebug("when normalizeResponse returns null, throws an error", function(assert) {

  env.registry.register('serializer:person', DS.Serializer.extend({
    normalizeResponse() {return null;}
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return resolve({ data: {} });
    }
  }));

  assert.throws(function () {
    run(function() {
      store.findRecord('person', 1);
    });
  }, /Top level of a JSON API document must be an object/);
});


testInDebug("when normalizeResponse returns an empty object, throws an error", function(assert) {

  env.registry.register('serializer:person', DS.Serializer.extend({
    normalizeResponse() {return {};}
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return resolve({ data: {} });
    }
  }));

  assert.throws(function () {
    run(function() {
      store.findRecord('person', 1);
    });
  }, /One or more of the following keys must be present/);
});

testInDebug("when normalizeResponse returns a document with both data and errors, throws an error", function(assert) {

  env.registry.register('serializer:person', DS.Serializer.extend({
    normalizeResponse() {
      return {
        data: [],
        errors: []
      };
    }
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return resolve({ data: {} });
    }
  }));

  assert.throws(function () {
    run(function() {
      store.findRecord('person', 1);
    });
  }, /cannot both be present/);
});

testInDebug("normalizeResponse 'data' cannot be undefined, a number, a string or a boolean", function(assert) {

  assert.payloadError({ data: undefined }, /data must be/);
  assert.payloadError({ data: 1 }, /data must be/);
  assert.payloadError({ data: 'lollerskates' }, /data must be/);
  assert.payloadError({ data: true }, /data must be/);

});

testInDebug("normalizeResponse 'meta' cannot be an array, undefined, a number, a string or a boolean", function(assert) {

  assert.payloadError({ meta: undefined }, /meta must be an object/);
  assert.payloadError({ meta: [] }, /meta must be an object/);
  assert.payloadError({ meta: 1 }, /meta must be an object/);
  assert.payloadError({ meta: 'lollerskates' }, /meta must be an object/);
  assert.payloadError({ meta: true }, /meta must be an object/);

});

testInDebug("normalizeResponse 'links' cannot be an array, undefined, a number, a string or a boolean", function(assert) {

  assert.payloadError({ data: [], links: undefined }, /links must be an object/);
  assert.payloadError({ data: [], links: [] }, /links must be an object/);
  assert.payloadError({ data: [], links: 1 }, /links must be an object/);
  assert.payloadError({ data: [], links: 'lollerskates' }, /links must be an object/);
  assert.payloadError({ data: [], links: true }, /links must be an object/);

});

testInDebug("normalizeResponse 'jsonapi' cannot be an array, undefined, a number, a string or a boolean", function(assert) {

  assert.payloadError({ data: [], jsonapi: undefined }, /jsonapi must be an object/);
  assert.payloadError({ data: [], jsonapi: [] }, /jsonapi must be an object/);
  assert.payloadError({ data: [], jsonapi: 1 }, /jsonapi must be an object/);
  assert.payloadError({ data: [], jsonapi: 'lollerskates' }, /jsonapi must be an object/);
  assert.payloadError({ data: [], jsonapi: true }, /jsonapi must be an object/);

});

testInDebug("normalizeResponse 'included' cannot be an object, undefined, a number, a string or a boolean", function(assert) {

  assert.payloadError({ included: undefined }, /included must be an array/);
  assert.payloadError({ included: {} }, /included must be an array/);
  assert.payloadError({ included: 1 }, /included must be an array/);
  assert.payloadError({ included: 'lollerskates' }, /included must be an array/);
  assert.payloadError({ included: true }, /included must be an array/);

});

testInDebug("normalizeResponse 'errors' cannot be an object, undefined, a number, a string or a boolean", function(assert) {

  assert.payloadError({ errors: undefined }, /errors must be an array/);
  assert.payloadError({ errors: {} }, /errors must be an array/);
  assert.payloadError({ errors: 1 }, /errors must be an array/);
  assert.payloadError({ errors: 'lollerskates' }, /errors must be an array/);
  assert.payloadError({ errors: true }, /errors must be an array/);

});


