import { run } from '@ember/runloop';
import { createStore } from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';
import Model from 'ember-data/model';

import DS from 'ember-data';

var Post, Comment, Message, User;

module('integration/relationships/inverse_relationships - Inverse Relationships');

test('When a record is added to a has-many relationship, the inverse belongsTo is determined automatically', function(assert) {
  Post = Model.extend({
    comments: DS.hasMany('comment', { async: false }),
  });

  Comment = Model.extend({
    post: DS.belongsTo('post', { async: false }),
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;

  let comment = store.createRecord('comment');
  let post = store.createRecord('post');

  assert.equal(comment.get('post'), null, 'no post has been set on the comment');

  run(function() {
    post.get('comments').pushObject(comment);
  });
  assert.equal(comment.get('post'), post, 'post was set on the comment');
});

test('When a record is added to a has-many relationship, the inverse belongsTo can be set explicitly', function(assert) {
  Post = Model.extend({
    comments: DS.hasMany('comment', { inverse: 'redPost', async: false }),
  });

  Comment = Model.extend({
    onePost: DS.belongsTo('post', { async: false }),
    twoPost: DS.belongsTo('post', { async: false }),
    redPost: DS.belongsTo('post', { async: false }),
    bluePost: DS.belongsTo('post', { async: false }),
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;

  let comment = store.createRecord('comment');
  let post = store.createRecord('post');

  assert.equal(comment.get('onePost'), null, 'onePost has not been set on the comment');
  assert.equal(comment.get('twoPost'), null, 'twoPost has not been set on the comment');
  assert.equal(comment.get('redPost'), null, 'redPost has not been set on the comment');
  assert.equal(comment.get('bluePost'), null, 'bluePost has not been set on the comment');

  run(function() {
    post.get('comments').pushObject(comment);
  });

  assert.equal(comment.get('onePost'), null, 'onePost has not been set on the comment');
  assert.equal(comment.get('twoPost'), null, 'twoPost has not been set on the comment');
  assert.equal(comment.get('redPost'), post, 'redPost has been set on the comment');
  assert.equal(comment.get('bluePost'), null, 'bluePost has not been set on the comment');
});

test("When a record's belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", function(assert) {
  Post = Model.extend({
    meComments: DS.hasMany('comment', { async: false }),
    youComments: DS.hasMany('comment', { async: false }),
    everyoneWeKnowComments: DS.hasMany('comment', { async: false }),
  });

  Comment = Model.extend({
    post: DS.belongsTo('post', { inverse: 'youComments', async: false }),
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;
  var comment, post;

  run(function() {
    comment = store.createRecord('comment');
    post = store.createRecord('post');

    assert.equal(post.get('meComments.length'), 0, 'meComments has no posts');
    assert.equal(post.get('youComments.length'), 0, 'youComments has no posts');
    assert.equal(
      post.get('everyoneWeKnowComments.length'),
      0,
      'everyoneWeKnowComments has no posts'
    );

    comment.set('post', post);
  });

  assert.equal(comment.get('post'), post, 'The post that was set can be retrieved');

  assert.equal(post.get('meComments.length'), 0, 'meComments has no posts');
  assert.equal(post.get('youComments.length'), 1, 'youComments had the post added');
  assert.equal(post.get('everyoneWeKnowComments.length'), 0, 'everyoneWeKnowComments has no posts');
});

test('When setting a belongsTo, the OneToOne invariant is respected even when other records have been previously used', function(assert) {
  Post = Model.extend({
    bestComment: DS.belongsTo('comment', { async: false }),
  });

  Comment = Model.extend({
    post: DS.belongsTo('post', { async: false }),
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;

  let comment = store.createRecord('comment');
  let post = store.createRecord('post');
  let post2 = store.createRecord('post');

  run(function() {
    comment.set('post', post);
    post2.set('bestComment', null);
  });

  assert.equal(comment.get('post'), post);
  assert.equal(post.get('bestComment'), comment);
  assert.strictEqual(post2.get('bestComment'), null);

  run(function() {
    comment.set('post', post2);
  });

  assert.equal(comment.get('post'), post2);
  assert.strictEqual(post.get('bestComment'), null);
  assert.equal(post2.get('bestComment'), comment);
});

test('When setting a belongsTo, the OneToOne invariant is transitive', function(assert) {
  Post = Model.extend({
    bestComment: DS.belongsTo('comment', { async: false }),
  });

  Comment = Model.extend({
    post: DS.belongsTo('post', { async: false }),
  });

  var store = createStore({
    post: Post,
    comment: Comment,
  });

  let comment = store.createRecord('comment');
  let post = store.createRecord('post');
  let post2 = store.createRecord('post');

  run(function() {
    comment.set('post', post);
  });

  assert.equal(comment.get('post'), post);
  assert.equal(post.get('bestComment'), comment);
  assert.strictEqual(post2.get('bestComment'), null);

  run(function() {
    post2.set('bestComment', comment);
  });

  assert.equal(comment.get('post'), post2);
  assert.strictEqual(post.get('bestComment'), null);
  assert.equal(post2.get('bestComment'), comment);
});

test('When setting a belongsTo, the OneToOne invariant is commutative', function(assert) {
  Post = Model.extend({
    bestComment: DS.belongsTo('comment', { async: false }),
  });

  Comment = Model.extend({
    post: DS.belongsTo('post', { async: false }),
  });

  var store = createStore({
    post: Post,
    comment: Comment,
  });

  let post = store.createRecord('post');
  let comment = store.createRecord('comment');
  let comment2 = store.createRecord('comment');

  run(function() {
    comment.set('post', post);
  });

  assert.equal(comment.get('post'), post);
  assert.equal(post.get('bestComment'), comment);
  assert.strictEqual(comment2.get('post'), null);

  run(function() {
    post.set('bestComment', comment2);
  });

  assert.strictEqual(comment.get('post'), null);
  assert.equal(post.get('bestComment'), comment2);
  assert.equal(comment2.get('post'), post);
});

test('OneToNone relationship works', function(assert) {
  assert.expect(3);
  Post = Model.extend({
    name: DS.attr('string'),
  });

  Comment = Model.extend({
    post: DS.belongsTo('post', { async: false }),
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;

  let comment = store.createRecord('comment');
  let post1 = store.createRecord('post');
  let post2 = store.createRecord('post');

  run(function() {
    comment.set('post', post1);
  });
  assert.equal(comment.get('post'), post1, 'the post is set to the first one');

  run(function() {
    comment.set('post', post2);
  });
  assert.equal(comment.get('post'), post2, 'the post is set to the second one');

  run(function() {
    comment.set('post', post1);
  });
  assert.equal(comment.get('post'), post1, 'the post is re-set to the first one');
});

test('When a record is added to or removed from a polymorphic has-many relationship, the inverse belongsTo can be set explicitly', function(assert) {
  User = Model.extend({
    messages: DS.hasMany('message', {
      async: false,
      inverse: 'redUser',
      polymorphic: true,
    }),
  });

  Message = Model.extend({
    oneUser: DS.belongsTo('user', { async: false }),
    twoUser: DS.belongsTo('user', { async: false }),
    redUser: DS.belongsTo('user', { async: false }),
    blueUser: DS.belongsTo('user', { async: false }),
  });

  Post = Message.extend();

  var env = setupStore({ user: User, message: Message, post: Post });
  var store = env.store;

  let post = store.createRecord('post');
  let user = store.createRecord('user');

  assert.equal(post.get('oneUser'), null, 'oneUser has not been set on the user');
  assert.equal(post.get('twoUser'), null, 'twoUser has not been set on the user');
  assert.equal(post.get('redUser'), null, 'redUser has not been set on the user');
  assert.equal(post.get('blueUser'), null, 'blueUser has not been set on the user');

  run(function() {
    user.get('messages').pushObject(post);
  });

  assert.equal(post.get('oneUser'), null, 'oneUser has not been set on the user');
  assert.equal(post.get('twoUser'), null, 'twoUser has not been set on the user');
  assert.equal(post.get('redUser'), user, 'redUser has been set on the user');
  assert.equal(post.get('blueUser'), null, 'blueUser has not been set on the user');

  run(function() {
    user.get('messages').popObject();
  });

  assert.equal(post.get('oneUser'), null, 'oneUser has not been set on the user');
  assert.equal(post.get('twoUser'), null, 'twoUser has not been set on the user');
  assert.equal(post.get('redUser'), null, 'redUser has bot been set on the user');
  assert.equal(post.get('blueUser'), null, 'blueUser has not been set on the user');
});

test("When a record's belongsTo relationship is set, it can specify the inverse polymorphic hasMany to which the new child should be added or removed", function(assert) {
  User = Model.extend({
    meMessages: DS.hasMany('message', { polymorphic: true, async: false }),
    youMessages: DS.hasMany('message', { polymorphic: true, async: false }),
    everyoneWeKnowMessages: DS.hasMany('message', { polymorphic: true, async: false }),
  });

  Message = Model.extend({
    user: DS.belongsTo('user', { inverse: 'youMessages', async: false }),
  });

  Post = Message.extend();

  var env = setupStore({ user: User, message: Message, post: Post });
  var store = env.store;

  let user = store.createRecord('user');
  let post = store.createRecord('post');

  assert.equal(user.get('meMessages.length'), 0, 'meMessages has no posts');
  assert.equal(user.get('youMessages.length'), 0, 'youMessages has no posts');
  assert.equal(user.get('everyoneWeKnowMessages.length'), 0, 'everyoneWeKnowMessages has no posts');

  run(function() {
    post.set('user', user);
  });

  assert.equal(user.get('meMessages.length'), 0, 'meMessages has no posts');
  assert.equal(user.get('youMessages.length'), 1, 'youMessages had the post added');
  assert.equal(user.get('everyoneWeKnowMessages.length'), 0, 'everyoneWeKnowMessages has no posts');

  run(function() {
    post.set('user', null);
  });

  assert.equal(user.get('meMessages.length'), 0, 'meMessages has no posts');
  assert.equal(user.get('youMessages.length'), 0, 'youMessages has no posts');
  assert.equal(user.get('everyoneWeKnowMessages.length'), 0, 'everyoneWeKnowMessages has no posts');
});

test("When a record's polymorphic belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", function(assert) {
  Message = Model.extend({
    meMessages: DS.hasMany('comment', { inverse: null, async: false }),
    youMessages: DS.hasMany('comment', { inverse: 'message', async: false }),
    everyoneWeKnowMessages: DS.hasMany('comment', { inverse: null, async: false }),
  });

  Post = Message.extend();

  Comment = Message.extend({
    message: DS.belongsTo('message', {
      async: false,
      polymorphic: true,
      inverse: 'youMessages',
    }),
  });

  var env = setupStore({ comment: Comment, message: Message, post: Post });
  var store = env.store;

  let comment = store.createRecord('comment');
  let post = store.createRecord('post');

  assert.equal(post.get('meMessages.length'), 0, 'meMessages has no posts');
  assert.equal(post.get('youMessages.length'), 0, 'youMessages has no posts');
  assert.equal(post.get('everyoneWeKnowMessages.length'), 0, 'everyoneWeKnowMessages has no posts');

  run(function() {
    comment.set('message', post);
  });

  assert.equal(post.get('meMessages.length'), 0, 'meMessages has no posts');
  assert.equal(post.get('youMessages.length'), 1, 'youMessages had the post added');
  assert.equal(post.get('everyoneWeKnowMessages.length'), 0, 'everyoneWeKnowMessages has no posts');

  run(function() {
    comment.set('message', null);
  });

  assert.equal(post.get('meMessages.length'), 0, 'meMessages has no posts');
  assert.equal(post.get('youMessages.length'), 0, 'youMessages has no posts');
  assert.equal(post.get('everyoneWeKnowMessages.length'), 0, 'everyoneWeKnowMessages has no posts');
});

testInDebug("Inverse relationships that don't exist throw a nice error for a hasMany", function(
  assert
) {
  User = Model.extend();
  Comment = Model.extend();

  Post = Model.extend({
    comments: DS.hasMany('comment', { inverse: 'testPost', async: false }),
  });

  var env = setupStore({ post: Post, comment: Comment, user: User });
  var post;

  env.store.createRecord('comment');

  assert.expectAssertion(function() {
    run(function() {
      post = env.store.createRecord('post');
      post.get('comments');
    });
  }, /We found no inverse relationships by the name of 'testPost' on the 'comment' model/);
});

testInDebug("Inverse relationships that don't exist throw a nice error for a belongsTo", function(
  assert
) {
  User = Model.extend();
  Comment = Model.extend();

  Post = Model.extend({
    user: DS.belongsTo('user', { inverse: 'testPost', async: false }),
  });

  var env = setupStore({ post: Post, comment: Comment, user: User });
  var post;
  env.store.createRecord('user');

  assert.expectAssertion(function() {
    run(function() {
      post = env.store.createRecord('post');
      post.get('user');
    });
  }, /We found no inverse relationships by the name of 'testPost' on the 'user' model/);
});
