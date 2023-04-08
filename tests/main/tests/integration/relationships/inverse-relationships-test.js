import { module } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { belongsTo, hasMany } from '@ember-data/model';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/relationships/inverse_relationships - Inverse Relationships', function (hooks) {
  setupTest(hooks);

  let store;
  let register;

  hooks.beforeEach(function () {
    const { owner } = this;

    store = owner.lookup('service:store');
    register = owner.register.bind(owner);
  });

  testInDebug("Inverse relationships that don't exist throw a nice error for a hasMany", async function (assert) {
    class User extends Model {}

    class Comment extends Model {}

    class Post extends Model {
      @hasMany('comment', { inverse: 'testPost', async: false })
      comments;
    }

    register('model:User', User);
    register('model:Comment', Comment);
    register('model:Post', Post);

    let post;

    store.createRecord('comment');

    assert.expectAssertion(function () {
      post = store.createRecord('post');
      post.comments;
    }, /Assertion Failed: Expected a relationship schema for 'comment.testPost' to match the inverse of 'post.comments', but no relationship schema was found./);
  });

  testInDebug("Inverse relationships that don't exist throw a nice error for a belongsTo", async function (assert) {
    class User extends Model {}

    class Comment extends Model {}

    class Post extends Model {
      @belongsTo('user', { inverse: 'testPost', async: false })
      user;
    }

    register('model:User', User);
    register('model:Comment', Comment);
    register('model:Post', Post);

    let post;
    store.createRecord('user');

    assert.expectAssertion(function () {
      post = store.createRecord('post');
      post.user;
    }, /Expected a relationship schema for 'user.testPost' to match the inverse of 'post.user', but no relationship schema was found./);
  });

  testInDebug(
    "Inverse null relationships with models that don't exist throw a nice error if trying to use that relationship",
    function (assert) {
      class User extends Model {
        @belongsTo('post', { async: true, inverse: null })
        post;
      }

      register('model:user', User);
      assert.expectAssertion(() => {
        store.push({
          data: {
            id: '1',
            type: 'user',
            relationships: {
              post: {
                data: {
                  id: '1',
                  type: 'post',
                },
              },
            },
          },
        });
      }, /Missing Schema: Encountered a relationship identifier { type: 'post', id: '1' } for the 'user.post' belongsTo relationship on <user:1>, but no schema exists for that type./);

      // but don't error if the relationship is not used
      store.createRecord('user', {});
    }
  );
});
