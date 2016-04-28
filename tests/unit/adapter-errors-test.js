import Ember from 'ember';

import isEnabled from "ember-data/-private/features";
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

module("unit/adapter-errors - DS.AdapterError");

test("DS.AdapterError", function(assert) {
  var error = new DS.AdapterError();
  assert.ok(error instanceof Error);
  assert.ok(error instanceof Ember.Error);
  assert.ok(error.isAdapterError);
  assert.equal(error.message, 'Adapter operation failed');
});

test("DS.InvalidError", function(assert) {
  var error = new DS.InvalidError();
  assert.ok(error instanceof Error);
  assert.ok(error instanceof DS.AdapterError);
  assert.ok(error.isAdapterError);
  assert.equal(error.message, 'The adapter rejected the commit because it was invalid');
});

test("DS.TimeoutError", function(assert) {
  var error = new DS.TimeoutError();
  assert.ok(error instanceof Error);
  assert.ok(error instanceof DS.AdapterError);
  assert.ok(error.isAdapterError);
  assert.equal(error.message, 'The adapter operation timed out');
});

test("DS.AbortError", function(assert) {
  var error = new DS.AbortError();
  assert.ok(error instanceof Error);
  assert.ok(error instanceof DS.AdapterError);
  assert.ok(error.isAdapterError);
  assert.equal(error.message, 'The adapter operation was aborted');
});

if (isEnabled('ds-extended-errors')) {
  test("DS.UnauthorizedError", function(assert) {
    var error = new DS.UnauthorizedError();
    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter operation is unauthorized');
  });

  test("DS.ForbiddenError", function(assert) {
    var error = new DS.ForbiddenError();
    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter operation is forbidden');
  });

  test("DS.NotFoundError", function(assert) {
    var error = new DS.NotFoundError();
    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter could not find the resource');
  });

  test("DS.ConflictError", function(assert) {
    var error = new DS.ConflictError();
    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter operation failed due to a conflict');
  });

  test("DS.ServerError", function(assert) {
    var error = new DS.ServerError();
    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter operation failed due to a server error');
  });

  test("CustomAdapterError", function(assert) {
    var CustomAdapterError = DS.AdapterError.extend();
    var error = new CustomAdapterError();
    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'Adapter operation failed');
  });

  test("CustomAdapterError with default message", function(assert) {
    var CustomAdapterError = DS.AdapterError.extend({ message: 'custom error!' });
    var error = new CustomAdapterError();
    assert.equal(error.message, 'custom error!');
  });
}

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
  assert.expectAssertion(function() {
    new DS.InvalidError({ name: ['is invalid'] });
  }, /expects json-api formatted errors/);
});
