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
    }, /We found no field named 'testPost' on the schema for 'comment' to be the inverse of the 'comments' relationship on 'post'. This is most likely due to a missing field on your model definition./);
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
    }, /We found no field named 'testPost' on the schema for 'user' to be the inverse of the 'user' relationship on 'post'. This is most likely due to a missing field on your model definition./);
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
        store.createRecord('user', { post: null });
      }, /No model was found for 'post' and no schema handles the type/);

      // but don't error if the relationship is not used
      store.createRecord('user', {});
    }
  );
});
