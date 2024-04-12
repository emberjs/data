import { module } from 'qunit';

import { formattedId } from '@ember-data/legacy-compat/utils';
import test from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('Unit | Data Utils | ID | formattedId (util)', function () {
  test('it normalizes id as expected', function (assert) {
    assert.strictEqual(formattedId(1), '1', `normalized 1 correctly`);
    assert.strictEqual(formattedId('1'), '1', `normalized '1' correctly`);
    assert.strictEqual(formattedId(null), null, `normalized null correctly`);
  });

  test('it throws an error when the id is undefined', function (assert) {
    assert.throws(() => {
      formattedId();
    }, /Error: Assertion Failed: formattedId: id must not be undefined/);
  });

  test('it throws an error when the id is empty', function (assert) {
    assert.throws(() => {
      formattedId('');
    }, /Error: Assertion Failed: formattedId: id must not be empty/);
  });

  test('it throws an error when the id is 0', function (assert) {
    assert.throws(() => {
      formattedId(0);
    }, /Error: Assertion Failed: formattedId: id must not be 0/);
  });

  test('it throws an error when the id is "0"', function (assert) {
    assert.throws(() => {
      formattedId('0');
    }, /Error: Assertion Failed: formattedId: id must not be 0/);
  });

  test('it throws an error when the id is not a string', function (assert) {
    assert.throws(() => {
      formattedId(new Date());
    }, /Error: Assertion Failed: formattedId: id must be a number, string or null/);

    assert.throws(() => {
      formattedId([]);
    }, /Error: Assertion Failed: formattedId: id must be a number, string or null/);

    assert.throws(() => {
      formattedId(true);
    }, /Error: Assertion Failed: formattedId: id must be a number, string or null/);

    assert.throws(() => {
      formattedId(false);
    }, /Error: Assertion Failed: formattedId: id must be a number, string or null/);
  });
});
