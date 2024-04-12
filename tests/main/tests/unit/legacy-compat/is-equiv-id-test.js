import { module } from 'qunit';

import { isEquivId } from '@ember-data/legacy-compat/utils';
import test from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('Unit | Data Utils | ID | isEquivId (util)', function () {
  test('it compares ids as expected', function (assert) {
    assert.true(isEquivId('1', 1), `compared '1' to 1 correctly`);
    assert.true(isEquivId(1, '1'), `compared 1 to '1' correctly`);
    assert.true(isEquivId(1, 1), `compared 1 to 1 correctly`);
    assert.true(isEquivId('1', '1'), `compared '1' to '1' correctly`);

    assert.false(isEquivId('1', null), `compared '1' to null correctly`);
    assert.false(isEquivId('1', 2), `compared '1' to 2 correctly`);
    assert.false(isEquivId('1', '3'), `compared '1' to '3' correctly`);
  });

  test('it throws an error when expected id is null', function (assert) {
    assert.throws(() => {
      isEquivId(null, '1');
    }, /Error: Assertion Failed: isEquivId: Expected id must not be null/);
  });

  test('it throws an error when id is undefined', function (assert) {
    assert.throws(() => {
      isEquivId(undefined, '1');
    }, /Error: Assertion Failed: isEquivId: Expected id must not be undefined/);
    assert.throws(() => {
      isEquivId('post', undefined);
    }, /Error: Assertion Failed: isEquivId: Actual id must not be undefined/);
  });

  test('it throws an error when the id is empty', function (assert) {
    assert.throws(() => {
      isEquivId('', '1');
    }, /Error: Assertion Failed: isEquivId: Expected id must not be empty/);
    assert.throws(() => {
      isEquivId('1', '');
    }, /Error: Assertion Failed: isEquivId: Actual id must not be empty/);
  });

  test('it throws an error when the id is 0', function (assert) {
    assert.throws(() => {
      isEquivId(0, '1');
    }, /Error: Assertion Failed: isEquivId: Expected id must not be 0/);
    assert.throws(() => {
      isEquivId('0', '1');
    }, /Error: Assertion Failed: isEquivId: Expected id must not be 0/);
    assert.throws(() => {
      isEquivId('1', 0);
    }, /Error: Assertion Failed: isEquivId: Actual id must not be 0/);
    assert.throws(() => {
      isEquivId('1', '0');
    }, /Error: Assertion Failed: isEquivId: Actual id must not be 0/);
  });

  test('it throws an error when the id is not a string', function (assert) {
    assert.throws(() => {
      isEquivId(new Date(), '1');
    }, /Error: Assertion Failed: isEquivId: Expected id must be a number or string/);

    assert.throws(() => {
      isEquivId([], '1');
    }, /Error: Assertion Failed: isEquivId: Expected id must be a number or string/);

    assert.throws(() => {
      isEquivId('1', new Date());
    }, /Error: Assertion Failed: isEquivId: Actual id must be a number, string or null/);

    assert.throws(() => {
      isEquivId('1', []);
    }, /Error: Assertion Failed: isEquivId: Actual id must be a number, string or null/);
  });
});
