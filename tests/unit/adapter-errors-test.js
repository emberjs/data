import Ember from 'ember';

import { isEnabled } from 'ember-data/-private';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

module('unit/adapter-errors - DS.AdapterError');

test('DS.AdapterError', function(assert) {
  let error = new DS.AdapterError();

  assert.ok(error instanceof Error);
  assert.ok(error instanceof Ember.Error);
  assert.ok(error.isAdapterError);
  assert.equal(error.message, 'Adapter operation failed');
});

test('DS.InvalidError', function(assert) {
  let error = new DS.InvalidError();

  assert.ok(error instanceof Error);
  assert.ok(error instanceof DS.AdapterError);
  assert.ok(error.isAdapterError);
  assert.equal(error.message, 'The adapter rejected the commit because it was invalid');
});

test('DS.TimeoutError', function(assert) {
  let error = new DS.TimeoutError();

  assert.ok(error instanceof Error);
  assert.ok(error instanceof DS.AdapterError);
  assert.ok(error.isAdapterError);
  assert.equal(error.message, 'The adapter operation timed out');
});

test('DS.AbortError', function(assert) {
  let error = new DS.AbortError();

  assert.ok(error instanceof Error);
  assert.ok(error instanceof DS.AdapterError);
  assert.ok(error.isAdapterError);
  assert.equal(error.message, 'The adapter operation was aborted');
});

if (isEnabled('ds-extended-errors')) {
  test('DS.UnauthorizedError', function(assert) {
    let error = new DS.UnauthorizedError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter operation is unauthorized');
  });

  test('DS.ForbiddenError', function(assert) {
    let error = new DS.ForbiddenError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter operation is forbidden');
  });

  test('DS.NotFoundError', function(assert) {
    let error = new DS.NotFoundError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter could not find the resource');
  });

  test('DS.ConflictError', function(assert) {
    let error = new DS.ConflictError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter operation failed due to a conflict');
  });

  test('DS.ServerError', function(assert) {
    let error = new DS.ServerError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'The adapter operation failed due to a server error');
  });

  test('CustomAdapterError', function(assert) {
    let CustomAdapterError = DS.AdapterError.extend();
    let error = new CustomAdapterError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof DS.AdapterError);
    assert.ok(error.isAdapterError);
    assert.equal(error.message, 'Adapter operation failed');
  });

  test('CustomAdapterError with default message', function(assert) {
    let CustomAdapterError = DS.AdapterError.extend({ message: 'custom error!' });
    let error = new CustomAdapterError();

    assert.equal(error.message, 'custom error!');
  });
}

const errorsHash = {
  name: ['is invalid', 'must be a string'],
  age: ['must be a number']
};

const errorsArray = [
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

const errorsPrimaryHash = {
  base: ['is invalid', 'error message']
};

const errorsPrimaryArray = [
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

test('errorsHashToArray', function(assert) {
  let result = DS.errorsHashToArray(errorsHash);
  assert.deepEqual(result, errorsArray);
});

test('errorsHashToArray for primary data object', function(assert) {
  let result = DS.errorsHashToArray(errorsPrimaryHash);
  assert.deepEqual(result, errorsPrimaryArray);
});

test('errorsArrayToHash', function(assert) {
  let result = DS.errorsArrayToHash(errorsArray);
  assert.deepEqual(result, errorsHash);
});

test('errorsArrayToHash without trailing slash', function(assert) {
  let result = DS.errorsArrayToHash([
    {
      detail: 'error message',
      source: { pointer: 'data/attributes/name' }
    }
  ]);
  assert.deepEqual(result, { name: ['error message'] });
});

test('errorsArrayToHash for primary data object', function(assert) {
  let result = DS.errorsArrayToHash(errorsPrimaryArray);
  assert.deepEqual(result, errorsPrimaryHash);
});

testInDebug('DS.InvalidError will normalize errors hash will assert', function(assert) {
  assert.expectAssertion(function() {
    new DS.InvalidError({ name: ['is invalid'] });
  }, /expects json-api formatted errors/);
});
