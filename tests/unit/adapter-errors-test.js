import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

module("unit/adapter-errors - DS.AdapterError");

test("DS.AdapterError", function(assert) {
  var error = new DS.AdapterError();
  assert.ok(error instanceof Error);
  assert.ok(error instanceof Ember.Error);
  assert.ok(error.isAdapterError);
});

test("DS.InvalidError", function(assert) {
  var error = new DS.InvalidError();
  assert.ok(error instanceof Error);
  assert.ok(error instanceof DS.AdapterError);
  assert.ok(error.isAdapterError);
});

test("DS.TimeoutError", function(assert) {
  var error = new DS.TimeoutError();
  assert.ok(error instanceof Error);
  assert.ok(error instanceof DS.AdapterError);
  assert.ok(error.isAdapterError);
});

test("DS.AbortError", function(assert) {
  var error = new DS.AbortError();
  assert.ok(error instanceof Error);
  assert.ok(error instanceof DS.AdapterError);
  assert.ok(error.isAdapterError);
});

var errorsHash = {
  name: ['is invalid', 'must be a string'],
  age: ['must be a number']
};

var errorsArray = [
  {
    title: 'Invalid Attribute',
    detail: 'is invalid',
    source: { pointer: '/data/attributes/name' }
  },
  {
    title: 'Invalid Attribute',
    detail: 'must be a string',
    source: { pointer: '/data/attributes/name' }
  },
  {
    title: 'Invalid Attribute',
    detail: 'must be a number',
    source: { pointer: '/data/attributes/age' }
  }
];

var errorsPrimaryHash = {
  base: ['is invalid', 'error message']
};

var errorsPrimaryArray = [
  {
    title: 'Invalid Document',
    detail: 'is invalid',
    source: { pointer: '/data' }
  },
  {
    title: 'Invalid Document',
    detail: 'error message',
    source: { pointer: '/data' }
  }
];

test("errorsHashToArray", function(assert) {
  var result = DS.errorsHashToArray(errorsHash);
  assert.deepEqual(result, errorsArray);
});

test("errorsHashToArray for primary data object", function(assert) {
  var result = DS.errorsHashToArray(errorsPrimaryHash);
  assert.deepEqual(result, errorsPrimaryArray);
});

test("errorsArrayToHash", function(assert) {
  var result = DS.errorsArrayToHash(errorsArray);
  assert.deepEqual(result, errorsHash);
});

test("errorsArrayToHash without trailing slash", function(assert) {
  var result = DS.errorsArrayToHash([
    {
      detail: 'error message',
      source: { pointer: 'data/attributes/name' }
    }
  ]);
  assert.deepEqual(result, { name: ['error message'] });
});

test("errorsArrayToHash for primary data object", function(assert) {
  var result = DS.errorsArrayToHash(errorsPrimaryArray);
  assert.deepEqual(result, errorsPrimaryHash);
});

testInDebug("DS.InvalidError will normalize errors hash will assert", function(assert) {
  var error;

  assert.expectAssertion(function() {
    error = new DS.InvalidError({ name: ['is invalid'] });
  }, /expects json-api formatted errors/);
});
