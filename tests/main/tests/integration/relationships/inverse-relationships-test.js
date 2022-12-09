import { module } from 'qunit';

import { setupTest } from 'ember-qunit';

import { graphFor } from '@ember-data/graph/-private';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

function test(label, callback) {
  deprecatedTest(label, { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 'ALL' }, callback);
}

module('integration/relationships/inverse_relationships - Inverse Relationships', function (hooks) {
  setupTest(hooks);

  let store;
  let register;

  hooks.beforeEach(function () {
    const { owner } = this;

    store = owner.lookup('service:store');
    register = owner.register.bind(owner);
  });

  test('When a record is added to a has-many relationship, the inverse belongsTo is determined automatically', async function (assert) {
    class Post extends Model {
      @hasMany('comment', { async: false })
      comments;
    }

    class Comment extends Model {
      @belongsTo('post', { async: false })
      post;
    }

    register('model:Post', Post);
    register('model:Comment', Comment);

    const comment = store.createRecord('comment');
    const post = store.createRecord('post');

    assert.strictEqual(comment.post, null, 'no post has been set on the comment');

    post.comments.push(comment);
    assert.strictEqual(comment.post, post, 'post was set on the comment');
  });

  test('Inverse relationships can be explicitly nullable', function (assert) {
    class User extends Model {
      @hasMany('post', { inverse: 'participants', async: false })
      posts;
    }

    class Post extends Model {
      @belongsTo('user', { inverse: null, async: false })
      lastParticipant;

      @hasMany('user', { inverse: 'posts', async: false })
      participants;
    }

    register('model:User', User);
    register('model:Post', Post);

    const user = store.createRecord('user');
    const post = store.createRecord('post');

    assert.strictEqual(user.inverseFor('posts').name, 'participants', 'User.posts inverse is Post.participants');
    assert.strictEqual(post.inverseFor('lastParticipant'), null, 'Post.lastParticipant has no inverse');
    assert.strictEqual(post.inverseFor('participants').name, 'posts', 'Post.participants inverse is User.posts');
  });

  test('Null inverses are excluded from potential relationship resolutions', function (assert) {
    class User extends Model {
      @hasMany('post', { async: false })
      posts;
    }

    class Post extends Model {
      @belongsTo('user', { inverse: null, async: false })
      lastParticipant;

      @hasMany('user', { async: false })
      participants;
    }

    register('model:User', User);
    register('model:Post', Post);

    const user = store.createRecord('user');
    const post = store.createRecord('post');

    assert.strictEqual(user.inverseFor('posts').name, 'participants', 'User.posts inverse is Post.participants');
    assert.strictEqual(post.inverseFor('lastParticipant'), null, 'Post.lastParticipant has no inverse');
    assert.strictEqual(post.inverseFor('participants').name, 'posts', 'Post.participants inverse is User.posts');
  });

  test('When a record is added to a has-many relationship, the inverse belongsTo can be set explicitly', async function (assert) {
    class Post extends Model {
      @hasMany('comment', { inverse: 'redPost', async: false })
      comments;
    }

    class Comment extends Model {
      @belongsTo('post', { async: false })
      onePost;

      @belongsTo('post', { async: false })
      twoPost;

      @belongsTo('post', { async: false })
      redPost;

      @belongsTo('post', { async: false })
      bluePost;
    }

    register('model:Post', Post);
    register('model:Comment', Comment);

    const comment = store.createRecord('comment');
    const post = store.createRecord('post');

    assert.strictEqual(comment.onePost, null, 'onePost has not been set on the comment');
    assert.strictEqual(comment.twoPost, null, 'twoPost has not been set on the comment');
    assert.strictEqual(comment.redPost, null, 'redPost has not been set on the comment');
    assert.strictEqual(comment.bluePost, null, 'bluePost has not been set on the comment');

    post.comments.push(comment);

    assert.strictEqual(comment.onePost, null, 'onePost has not been set on the comment');
    assert.strictEqual(comment.twoPost, null, 'twoPost has not been set on the comment');
    assert.strictEqual(comment.redPost, post, 'redPost has been set on the comment');
    assert.strictEqual(comment.bluePost, null, 'bluePost has not been set on the comment');
  });

  test("When a record's belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", async function (assert) {
    class Post extends Model {
      @hasMany('comment', { async: false })
      meComments;

      @hasMany('comment', { async: false })
      youComments;

      @hasMany('comment', { async: false })
      everyoneWeKnowComments;
    }

    class Comment extends Model {
      @belongsTo('post', { inverse: 'youComments', async: false })
      post;
    }

    register('model:Post', Post);
    register('model:Comment', Comment);

    let comment, post;

    comment = store.createRecord('comment');
    post = store.createRecord('post');

    assert.strictEqual(post.meComments.length, 0, 'meComments has no posts');
    assert.strictEqual(post.youComments.length, 0, 'youComments has no posts');
    assert.strictEqual(post.everyoneWeKnowComments.length, 0, 'everyoneWeKnowComments has no posts');

    comment.set('post', post);

    assert.strictEqual(comment.post, post, 'The post that was set can be retrieved');

    assert.strictEqual(post.meComments.length, 0, 'meComments has no posts');
    assert.strictEqual(post.youComments.length, 1, 'youComments had the post added');
    assert.strictEqual(post.everyoneWeKnowComments.length, 0, 'everyoneWeKnowComments has no posts');
  });

  test('When setting a belongsTo, the OneToOne invariant is respected even when other records have been previously used', async function (assert) {
    class Post extends Model {
      @belongsTo('comment', { async: false })
      bestComment;
    }

    class Comment extends Model {
      @belongsTo('post', { async: false })
      post;
    }

    register('model:Post', Post);
    register('model:Comment', Comment);

    const comment = store.createRecord('comment');
    const post = store.createRecord('post');
    const post2 = store.createRecord('post');

    comment.set('post', post);
    post2.set('bestComment', null);

    assert.strictEqual(comment.post, post);
    assert.strictEqual(post.bestComment, comment);
    assert.strictEqual(post2.bestComment, null);

    comment.set('post', post2);

    assert.strictEqual(comment.post, post2);
    assert.strictEqual(post.bestComment, null);
    assert.strictEqual(post2.bestComment, comment);
  });

  test('When setting a belongsTo, the OneToOne invariant is transitive', async function (assert) {
    class Post extends Model {
      @belongsTo('comment', { async: false })
      bestComment;
    }

    class Comment extends Model {
      @belongsTo('post', { async: false })
      post;
    }

    register('model:Post', Post);
    register('model:Comment', Comment);

    const comment = store.createRecord('comment');
    const post = store.createRecord('post');
    const post2 = store.createRecord('post');

    comment.set('post', post);

    assert.strictEqual(comment.post, post, 'comment post is set correctly');
    assert.strictEqual(post.bestComment, comment, 'post1 comment is set correctly');
    assert.strictEqual(post2.bestComment, null, 'post2 comment is not set');

    post2.set('bestComment', comment);

    assert.strictEqual(comment.post, post2, 'comment post is set correctly');
    assert.strictEqual(post.bestComment, null, 'post1 comment is no longer set');
    assert.strictEqual(post2.bestComment, comment, 'post2 comment is set correctly');
  });

  test('When setting a belongsTo, the OneToOne invariant is commutative', async function (assert) {
    class Post extends Model {
      @belongsTo('comment', { async: false })
      bestComment;
    }

    class Comment extends Model {
      @belongsTo('post', { async: false })
      post;
    }

    register('model:Post', Post);
    register('model:Comment', Comment);

    const post = store.createRecord('post');
    const comment = store.createRecord('comment');
    const comment2 = store.createRecord('comment');

    comment.set('post', post);

    assert.strictEqual(comment.post, post);
    assert.strictEqual(post.bestComment, comment);
    assert.strictEqual(comment2.post, null);

    post.set('bestComment', comment2);

    assert.strictEqual(comment.post, null);
    assert.strictEqual(post.bestComment, comment2);
    assert.strictEqual(comment2.post, post);
  });

  test('OneToNone relationship works', async function (assert) {
    assert.expect(3);

    class Post extends Model {
      @attr('string')
      name;
    }

    class Comment extends Model {
      @belongsTo('post', { async: false })
      post;
    }

    register('model:Post', Post);
    register('model:Comment', Comment);

    const comment = store.createRecord('comment');
    const post1 = store.createRecord('post');
    const post2 = store.createRecord('post');

    comment.set('post', post1);
    assert.strictEqual(comment.post, post1, 'the post is set to the first one');

    comment.set('post', post2);
    assert.strictEqual(comment.post, post2, 'the post is set to the second one');

    comment.set('post', post1);
    assert.strictEqual(comment.post, post1, 'the post is re-set to the first one');
  });

  test('When a record is added to or removed from a polymorphic has-many relationship, the inverse belongsTo can be set explicitly', async function (assert) {
    class User extends Model {
      @hasMany('message', { async: false, inverse: 'redUser', polymorphic: true })
      messages;
    }

    class Message extends Model {
      @belongsTo('user', { async: false })
      oneUser;

      @belongsTo('user', { async: false })
      twoUser;

      @belongsTo('user', { async: false, as: 'message' })
      redUser;

      @belongsTo('user', { async: false })
      blueUser;
    }

    class Post extends Message {}

    register('model:User', User);
    register('model:Message', Message);
    register('model:Post', Post);

    const post = store.createRecord('post');
    const user = store.createRecord('user');

    assert.strictEqual(post.oneUser, null, 'oneUser has not been set on the user');
    assert.strictEqual(post.twoUser, null, 'twoUser has not been set on the user');
    assert.strictEqual(post.redUser, null, 'redUser has not been set on the user');
    assert.strictEqual(post.blueUser, null, 'blueUser has not been set on the user');

    user.messages.push(post);

    assert.strictEqual(post.oneUser, null, 'oneUser has not been set on the user');
    assert.strictEqual(post.twoUser, null, 'twoUser has not been set on the user');
    assert.strictEqual(post.redUser, user, 'redUser has been set on the user');
    assert.strictEqual(post.blueUser, null, 'blueUser has not been set on the user');

    user.messages.pop();

    assert.strictEqual(post.oneUser, null, 'oneUser has not been set on the user');
    assert.strictEqual(post.twoUser, null, 'twoUser has not been set on the user');
    assert.strictEqual(post.redUser, null, 'redUser has bot been set on the user');
    assert.strictEqual(post.blueUser, null, 'blueUser has not been set on the user');
  });

  test("When a record's belongsTo relationship is set, it can specify the inverse polymorphic hasMany to which the new child should be added or removed", async function (assert) {
    class User extends Model {
      @hasMany('message', { polymorphic: true, async: false })
      meMessages;

      @hasMany('message', { polymorphic: true, async: false })
      youMessages;

      @hasMany('message', { polymorphic: true, async: false })
      everyoneWeKnowMessages;
    }

    class Message extends Model {
      @belongsTo('user', { inverse: 'youMessages', async: false, as: 'message' })
      user;
    }

    class Post extends Message {}

    register('model:User', User);
    register('model:Message', Message);
    register('model:Post', Post);

    const user = store.createRecord('user');
    const post = store.createRecord('post');

    assert.strictEqual(user.meMessages.length, 0, 'meMessages has no posts');
    assert.strictEqual(user.youMessages.length, 0, 'youMessages has no posts');
    assert.strictEqual(user.everyoneWeKnowMessages.length, 0, 'everyoneWeKnowMessages has no posts');

    post.set('user', user);

    assert.strictEqual(user.meMessages.length, 0, 'meMessages has no posts');
    assert.strictEqual(user.youMessages.length, 1, 'youMessages had the post added');
    assert.strictEqual(user.everyoneWeKnowMessages.length, 0, 'everyoneWeKnowMessages has no posts');

    post.set('user', null);

    assert.strictEqual(user.meMessages.length, 0, 'meMessages has no posts');
    assert.strictEqual(user.youMessages.length, 0, 'youMessages has no posts');
    assert.strictEqual(user.everyoneWeKnowMessages.length, 0, 'everyoneWeKnowMessages has no posts');
  });

  test("When a record's polymorphic belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", async function (assert) {
    class Message extends Model {
      @hasMany('comment', { inverse: null, async: false })
      meMessages;

      @hasMany('comment', { inverse: 'message', async: false, as: 'message' })
      youMessages;

      @hasMany('comment', { inverse: null, async: false })
      everyoneWeKnowMessages;
    }

    class Post extends Message {}

    class Comment extends Message {
      @belongsTo('message', { async: false, polymorphic: true, inverse: 'youMessages' })
      message;
    }

    register('model:Message', Message);
    register('model:Post', Post);
    register('model:Comment', Comment);

    const comment = store.createRecord('comment');
    const post = store.createRecord('post');

    assert.strictEqual(post.meMessages.length, 0, 'meMessages has no posts');
    assert.strictEqual(post.youMessages.length, 0, 'youMessages has no posts');
    assert.strictEqual(post.everyoneWeKnowMessages.length, 0, 'everyoneWeKnowMessages has no posts');

    comment.set('message', post);

    assert.strictEqual(post.meMessages.length, 0, 'meMessages has no posts');
    assert.strictEqual(post.youMessages.length, 1, 'youMessages had the post added');
    assert.strictEqual(post.everyoneWeKnowMessages.length, 0, 'everyoneWeKnowMessages has no posts');

    comment.set('message', null);

    assert.strictEqual(post.meMessages.length, 0, 'meMessages has no posts');
    assert.strictEqual(post.youMessages.length, 0, 'youMessages has no posts');
    assert.strictEqual(post.everyoneWeKnowMessages.length, 0, 'everyoneWeKnowMessages has no posts');
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

  test('inverseFor is only called when inverse is not null', async function (assert) {
    assert.expect(2);

    class Post extends Model {
      @hasMany('comment', { async: false, inverse: null })
      comments;
    }

    class Comment extends Model {
      @belongsTo('post', { async: false, inverse: null })
      post;
    }

    class User extends Model {
      @hasMany('message', { async: false, inverse: 'user' })
      messages;
    }

    class Message extends Model {
      @belongsTo('user', { async: false, inverse: 'messages' })
      user;
    }

    register('model:Post', Post);
    register('model:Comment', Comment);
    register('model:User', User);
    register('model:Message', Message);

    Post.inverseFor = function () {
      assert.notOk(true, 'Post model inverseFor is not called');
    };

    Comment.inverseFor = function () {
      assert.notOk(true, 'Comment model inverseFor is not called');
    };

    Message.inverseFor = function () {
      assert.ok(true, 'Message model inverseFor is called');
    };

    User.inverseFor = function () {
      assert.ok(true, 'User model inverseFor is called');
    };

    store.push({
      data: {
        id: '1',
        type: 'post',
        relationships: {
          comments: {
            data: [
              {
                id: '1',
                type: 'comment',
              },
              {
                id: '2',
                type: 'comment',
              },
            ],
          },
        },
      },
    });
    store.push({
      data: [
        {
          id: '1',
          type: 'comment',
          relationships: {
            post: {
              data: {
                id: '1',
                type: 'post',
              },
            },
          },
        },
        {
          id: '2',
          type: 'comment',
          relationships: {
            post: {
              data: {
                id: '1',
                type: 'post',
              },
            },
          },
        },
      ],
    });
    store.push({
      data: {
        id: '1',
        type: 'user',
        relationships: {
          messages: {
            data: [
              {
                id: '1',
                type: 'message',
              },
              {
                id: '2',
                type: 'message',
              },
            ],
          },
        },
      },
    });
    store.push({
      data: [
        {
          id: '1',
          type: 'message',
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
        {
          id: '2',
          type: 'message',
          relationships: {
            post: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      ],
    });
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

  test('No inverse configuration - should default to a null inverse', async function (assert) {
    class User extends Model {}

    class Comment extends Model {
      @belongsTo('user', { async: true })
      user;
    }

    register('model:User', User);
    register('model:Comment', Comment);

    const comment = store.createRecord('comment');

    assert.strictEqual(comment.inverseFor('user'), null, 'Defaults to a null inverse');
  });

  test('Unload a destroyed record should clean the relations', async function (assert) {
    assert.expect(2);

    class Post extends Model {
      @hasMany('comment', { async: true, inverse: 'post' })
      comments;
    }

    class Comment extends Model {
      @belongsTo('post', { async: true, inverse: 'comments' })
      post;
    }

    register('model:post', Post);
    register('model:comment', Comment);

    const comment = store.createRecord('comment');
    const post = store.createRecord('post');
    const comments = await post.comments;
    comments.push(comment);
    const identifier = recordIdentifierFor(comment);

    await comment.destroyRecord();

    assert.false(graphFor(store).identifiers.has(identifier), 'relationships are cleared');
    assert.strictEqual(
      store._instanceCache.peek({ identifier, bucket: 'recordData' }),
      undefined,
      'The recordData is destroyed'
    );
  });
});
