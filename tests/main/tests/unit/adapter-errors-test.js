import { module, test } from 'qunit';

import AdapterError, {
  AbortError,
  ConflictError,
  ForbiddenError,
  InvalidError,
  NotFoundError,
  ServerError,
  TimeoutError,
  UnauthorizedError,
} from '@ember-data/adapter/error';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/adapter-errors - AdapterError', function () {
  test('AdapterError', function (assert) {
    const error = new AdapterError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'Adapter operation failed');
  });

  test('InvalidError', function (assert) {
    const error = new InvalidError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error instanceof AdapterError, 'error is instanceof AdapterError');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'The adapter rejected the commit because it was invalid');
  });

  test('TimeoutError', function (assert) {
    const error = new TimeoutError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error instanceof AdapterError, 'error is instanceof AdapterError');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'The adapter operation timed out');
  });

  test('AbortError', function (assert) {
    const error = new AbortError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error instanceof AdapterError, 'error is instanceof AdapterError');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'The adapter operation was aborted');
  });

  test('UnauthorizedError', function (assert) {
    const error = new UnauthorizedError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error instanceof AdapterError, 'error is instanceof AdapterError');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'The adapter operation is unauthorized');
  });

  test('ForbiddenError', function (assert) {
    const error = new ForbiddenError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error instanceof AdapterError, 'error is instanceof AdapterError');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'The adapter operation is forbidden');
  });

  test('NotFoundError', function (assert) {
    const error = new NotFoundError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error instanceof AdapterError, 'error is instanceof AdapterError');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'The adapter could not find the resource');
  });

  test('ConflictError', function (assert) {
    const error = new ConflictError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error instanceof AdapterError, 'error is instanceof AdapterError');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'The adapter operation failed due to a conflict');
  });

  test('ServerError', function (assert) {
    const error = new ServerError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error instanceof AdapterError, 'error is instanceof AdapterError');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'The adapter operation failed due to a server error');
  });

  test('CustomAdapterError', function (assert) {
    const CustomAdapterError = AdapterError.extend();
    const error = new CustomAdapterError();

    assert.true(error instanceof Error, 'error is instanceof Error');
    assert.true(error instanceof AdapterError, 'error is instanceof AdapterError');
    assert.true(error.isAdapterError, 'error.isAdapterError');
    assert.strictEqual(error.message, 'Adapter operation failed');
  });

  test('CustomAdapterError with default message', function (assert) {
    const CustomAdapterError = AdapterError.extend({ message: 'custom error!' });
    const error = new CustomAdapterError();

    assert.strictEqual(error.message, 'custom error!');
  });

  testInDebug('InvalidError will normalize errors hash will assert', function (assert) {
    assert.expectAssertion(function () {
      new InvalidError({ name: ['is invalid'] });
    }, /expects json-api formatted errors/);
  });
});
