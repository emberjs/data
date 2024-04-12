import { dasherize } from '@ember/string';

import { module } from 'qunit';

import { singularize } from 'ember-inflector';

import { configureTypeNormalization, formattedType } from '@ember-data/legacy-compat/utils';
import test from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

configureTypeNormalization((type) => dasherize(singularize(type)));

module('Unit | Data Utils | Type | formattedType (util)', function () {
  test('it normalizes types as expected', function (assert) {
    assert.expect(10);
    ['post-comment', 'post-comments', 'PostComments', 'postComments', 'Post_comment', 'Post_Comments'].forEach(
      (type) => {
        assert.strictEqual(formattedType(type), 'post-comment', `normalized ${type} correctly`);
      }
    );
    ['post', 'posts', 'Post', 'Posts'].forEach((type) => {
      assert.strictEqual(formattedType(type), 'post');
    });
  });

  test('it throws an error when the type is null', function (assert) {
    assert.throws(() => {
      formattedType(null);
    }, /Error: Assertion Failed: formattedType: type must not be null/);
  });

  test('it throws an error when the type is undefined', function (assert) {
    assert.throws(() => {
      formattedType();
    }, /Error: Assertion Failed: formattedType: type must not be undefined/);
  });

  test('it throws an error when the type is empty', function (assert) {
    assert.throws(() => {
      formattedType('');
    }, /Error: Assertion Failed: formattedType: type must not be empty/);
  });

  test('it throws an error when the type is not a string', function (assert) {
    assert.throws(() => {
      formattedType(new Date());
    }, /Error: Assertion Failed: formattedType: type must be a string/);

    assert.throws(() => {
      formattedType([]);
    }, /Error: Assertion Failed: formattedType: type must be a string/);
  });
});
