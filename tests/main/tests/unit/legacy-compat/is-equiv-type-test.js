import { dasherize } from '@ember/string';

import { module } from 'qunit';

import { singularize } from 'ember-inflector';

import { configureTypeNormalization, isEquivType } from '@ember-data/legacy-compat/utils';
import test from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

configureTypeNormalization((type) => dasherize(singularize(type)));

module('Unit | Data Utils | Type | isEquivType (util)', function () {
  test('it compares types as expected', function (assert) {
    const passingPostCommentChecks = [
      'post-comment',
      'post-comments',
      'PostComments',
      'postComments',
      'Post_comment',
      'Post_Comments',
    ];
    const failingPostCommentChecks = ['post', 'post-comment-like'];
    const passingPostChecks = ['post', 'posts', 'Post', 'Posts'];
    assert.expect(
      passingPostCommentChecks.length * 2 + passingPostChecks.length * 2 + failingPostCommentChecks.length * 2
    );

    passingPostCommentChecks.forEach((type) => {
      assert.true(isEquivType('post-comment', type), `compared ${type} to 'post-comment' correctly`);
      assert.true(isEquivType(type, 'post-comment'), `compared 'post-comment' to ${type} correctly`);
    });
    passingPostChecks.forEach((type) => {
      assert.true(isEquivType('post', type), `compared ${type} to 'post' correctly`);
      assert.true(isEquivType(type, 'post'), `compared 'post' to ${type} correctly`);
    });
    failingPostCommentChecks.forEach((type) => {
      assert.false(isEquivType('post-comment', type), `compared ${type} to 'post-comment' correctly`);
      assert.false(isEquivType(type, 'post-comment'), `compared 'post-comment' to ${type} correctly`);
    });
  });

  test('it throws an error when type is null', function (assert) {
    assert.throws(() => {
      isEquivType(null, 'post');
    }, /Error: Assertion Failed: isEquivType: Expected type must not be null/);
    assert.throws(() => {
      isEquivType('post', null);
    }, /Error: Assertion Failed: isEquivType: Actual type must not be null/);
  });

  test('it throws an error when type is undefined', function (assert) {
    assert.throws(() => {
      isEquivType(undefined, 'post');
    }, /Error: Assertion Failed: isEquivType: Expected type must not be undefined/);
    assert.throws(() => {
      isEquivType('post', undefined);
    }, /Error: Assertion Failed: isEquivType: Actual type must not be undefined/);
  });

  test('it throws an error when the type is empty', function (assert) {
    assert.throws(() => {
      isEquivType('', 'post');
    }, /Error: Assertion Failed: isEquivType: Expected type must not be empty/);
    assert.throws(() => {
      isEquivType('post', '');
    }, /Error: Assertion Failed: isEquivType: Actual type must not be empty/);
  });

  test('it throws an error when the type is not a string', function (assert) {
    assert.throws(() => {
      isEquivType(new Date(), 'post');
    }, /Error: Assertion Failed: isEquivType: Expected type must be a string/);

    assert.throws(() => {
      isEquivType([], 'post');
    }, /Error: Assertion Failed: isEquivType: Expected type must be a string/);

    assert.throws(() => {
      isEquivType('post', new Date());
    }, /Error: Assertion Failed: isEquivType: Actual type must be a string/);

    assert.throws(() => {
      isEquivType('post', []);
    }, /Error: Assertion Failed: isEquivType: Actual type must be a string/);
  });
});
