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
    let error = new AdapterError();

    assert.ok(error instanceof Error);
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

  testInDebug('InvalidError will normalize errors hash will assert', function (assert) {
    assert.expectAssertion(function () {
      new InvalidError({ name: ['is invalid'] });
    }, /expects json-api formatted errors/);
  });
});
