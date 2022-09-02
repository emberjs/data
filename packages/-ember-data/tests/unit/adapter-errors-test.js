import EmberError from '@ember/error';

import { module, test } from 'qunit';

import AdapterError, {
  AbortError,
  ConflictError,
  errorsArrayToHash,
  errorsHashToArray,
  ForbiddenError,
  InvalidError,
  NotFoundError,
  ServerError,
  TimeoutError,
  UnauthorizedError,
} from '@ember-data/adapter/error';
import { DEPRECATE_HELPERS } from '@ember-data/private-build-infra/deprecations';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/adapter-errors - AdapterError', function () {
  test('AdapterError', function (assert) {
    let error = new AdapterError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof EmberError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'Adapter operation failed');
  });

  test('InvalidError', function (assert) {
    let error = new InvalidError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof AdapterError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'The adapter rejected the commit because it was invalid');
  });

  test('TimeoutError', function (assert) {
    let error = new TimeoutError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof AdapterError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'The adapter operation timed out');
  });

  test('AbortError', function (assert) {
    let error = new AbortError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof AdapterError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'The adapter operation was aborted');
  });

  test('UnauthorizedError', function (assert) {
    let error = new UnauthorizedError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof AdapterError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'The adapter operation is unauthorized');
  });

  test('ForbiddenError', function (assert) {
    let error = new ForbiddenError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof AdapterError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'The adapter operation is forbidden');
  });

  test('NotFoundError', function (assert) {
    let error = new NotFoundError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof AdapterError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'The adapter could not find the resource');
  });

  test('ConflictError', function (assert) {
    let error = new ConflictError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof AdapterError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'The adapter operation failed due to a conflict');
  });

  test('ServerError', function (assert) {
    let error = new ServerError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof AdapterError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'The adapter operation failed due to a server error');
  });

  test('CustomAdapterError', function (assert) {
    let CustomAdapterError = AdapterError.extend();
    let error = new CustomAdapterError();

    assert.ok(error instanceof Error);
    assert.ok(error instanceof AdapterError);
    assert.ok(error.isAdapterError);
    assert.strictEqual(error.message, 'Adapter operation failed');
  });

  test('CustomAdapterError with default message', function (assert) {
    let CustomAdapterError = AdapterError.extend({ message: 'custom error!' });
    let error = new CustomAdapterError();

    assert.strictEqual(error.message, 'custom error!');
  });

  if (DEPRECATE_HELPERS) {
    const errorsHash = {
      name: ['is invalid', 'must be a string'],
      age: ['must be a number'],
    };

    const errorsArray = [
      {
        title: 'Invalid Attribute',
        detail: 'is invalid',
        source: { pointer: '/data/attributes/name' },
      },
      {
        title: 'Invalid Attribute',
        detail: 'must be a string',
        source: { pointer: '/data/attributes/name' },
      },
      {
        title: 'Invalid Attribute',
        detail: 'must be a number',
        source: { pointer: '/data/attributes/age' },
      },
    ];

    const errorsPrimaryHash = {
      base: ['is invalid', 'error message'],
    };

    const errorsPrimaryArray = [
      {
        title: 'Invalid Document',
        detail: 'is invalid',
        source: { pointer: '/data' },
      },
      {
        title: 'Invalid Document',
        detail: 'error message',
        source: { pointer: '/data' },
      },
    ];

    test('errorsHashToArray', function (assert) {
      let result = errorsHashToArray(errorsHash);
      assert.deepEqual(result, errorsArray);
      assert.expectDeprecation({ id: 'ember-data:deprecate-errors-hash-to-array-helper', count: 1 });
    });

    test('errorsHashToArray for primary data object', function (assert) {
      let result = errorsHashToArray(errorsPrimaryHash);
      assert.deepEqual(result, errorsPrimaryArray);
      assert.expectDeprecation({ id: 'ember-data:deprecate-errors-hash-to-array-helper', count: 1 });
    });

    test('errorsArrayToHash', function (assert) {
      let result = errorsArrayToHash(errorsArray);
      assert.deepEqual(result, errorsHash);
      assert.expectDeprecation({ id: 'ember-data:deprecate-errors-array-to-hash-helper', count: 1 });
    });

    test('errorsArrayToHash without trailing slash', function (assert) {
      let result = errorsArrayToHash([
        {
          detail: 'error message',
          source: { pointer: 'data/attributes/name' },
        },
      ]);
      assert.deepEqual(result, { name: ['error message'] });
      assert.expectDeprecation({ id: 'ember-data:deprecate-errors-array-to-hash-helper', count: 1 });
    });

    test('errorsArrayToHash for primary data object', function (assert) {
      let result = errorsArrayToHash(errorsPrimaryArray);
      assert.deepEqual(result, errorsPrimaryHash);
      assert.expectDeprecation({ id: 'ember-data:deprecate-errors-array-to-hash-helper', count: 1 });
    });
  }

  testInDebug('InvalidError will normalize errors hash will assert', function (assert) {
    assert.expectAssertion(function () {
      new InvalidError({ name: ['is invalid'] });
    }, /expects json-api formatted errors/);
  });
});
