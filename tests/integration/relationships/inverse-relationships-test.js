var Post, Comment, Message, User;
var run = Ember.run;

module('integration/relationships/inverse_relationships - Inverse Relationships');

test("When a record is added to a has-many relationship, the inverse belongsTo is determined automatically", function() {
  Post = DS.Model.extend({
    comments: DS.hasMany('comment', { async: false })
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post', { async: false })
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;
  var comment, post;

  run(function() {
    comment = store.createRecord('comment');
    post = store.createRecord('post');
  });

  equal(comment.get('post'), null, "no post has been set on the comment");

  run(function() {
    post.get('comments').pushObject(comment);
  });
  equal(comment.get('post'), post, "post was set on the comment");
});

test("Inverse relationships can be explicitly nullable", function () {
  User = DS.Model.extend();

  Post = DS.Model.extend({
    lastParticipant: DS.belongsTo('user', { inverse: null, async: false }),
    participants: DS.hasMany('user', { inverse: 'posts', async: false })
  });

  User.reopen({
    posts: DS.hasMany('post', { inverse: 'participants', async: false })
  });

  var store = createStore({
    user: User,
    post: Post
  });
  var user, post;

  run(function() {
    user = store.createRecord('user');
    post = store.createRecord('post');
  });

  equal(user.inverseFor('posts').name, 'participants', 'User.posts inverse is Post.participants');
  equal(post.inverseFor('lastParticipant'), null, 'Post.lastParticipant has no inverse');
  equal(post.inverseFor('participants').name, 'posts', 'Post.participants inverse is User.posts');
});

test("When a record is added to a has-many relationship, the inverse belongsTo can be set explicitly", function() {
  Post = DS.Model.extend({
    comments: DS.hasMany('comment', { inverse: 'redPost', async: false })
  });

  Comment = DS.Model.extend({
    onePost: DS.belongsTo('post', { async: false }),
    twoPost: DS.belongsTo('post', { async: false }),
    redPost: DS.belongsTo('post', { async: false }),
    bluePost: DS.belongsTo('post', { async: false })
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;
  var comment, post;

  run(function() {
    comment = store.createRecord('comment');
    post = store.createRecord('post');
  });

  equal(comment.get('onePost'), null, "onePost has not been set on the comment");
  equal(comment.get('twoPost'), null, "twoPost has not been set on the comment");
  equal(comment.get('redPost'), null, "redPost has not been set on the comment");
  equal(comment.get('bluePost'), null, "bluePost has not been set on the comment");

  run(function() {
    post.get('comments').pushObject(comment);
  });

  equal(comment.get('onePost'), null, "onePost has not been set on the comment");
  equal(comment.get('twoPost'), null, "twoPost has not been set on the comment");
  equal(comment.get('redPost'), post, "redPost has been set on the comment");
  equal(comment.get('bluePost'), null, "bluePost has not been set on the comment");
});

test("When a record's belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", function() {
  Post = DS.Model.extend({
    meComments: DS.hasMany('comment', { async: false }),
    youComments: DS.hasMany('comment', { async: false }),
    everyoneWeKnowComments: DS.hasMany('comment', { async: false })
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post', { inverse: 'youComments', async: false })
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;
  var comment, post;

  run(function() {
    comment = store.createRecord('comment');
    post = store.createRecord('post');
  });

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 0, "youComments has no posts");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");

  run(function() {
    comment.set('post', post);
  });

  equal(comment.get('post'), post, 'The post that was set can be retrieved');

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 1, "youComments had the post added");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");
});

test("When setting a belongsTo, the OneToOne invariant is respected even when other records have been previously used", function() {
  Post = DS.Model.extend({
    bestComment: DS.belongsTo('comment', { async: false })
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post', { async: false })
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;
  var comment, post, post2;

  run(function() {
    comment = store.createRecord('comment');
    post = store.createRecord('post');
    post2 = store.createRecord('post');
  });
  run(function() {
    comment.set('post', post);
    post2.set('bestComment', null);
  });

  equal(comment.get('post'), post);
  equal(post.get('bestComment'), comment);
  equal(post2.get('bestComment'), null);

  run(function() {
    comment.set('post', post2);
  });

  equal(comment.get('post'), post2);
  equal(post.get('bestComment'), null);
  equal(post2.get('bestComment'), comment);
});

test("When setting a belongsTo, the OneToOne invariant is transitive", function() {
  Post = DS.Model.extend({
    bestComment: DS.belongsTo('comment', { async: false })
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post', { async: false })
  });

  var store = createStore({
    post: Post,
    comment: Comment
  });
  var post, post2, comment;

  run(function() {
    comment = store.createRecord('comment');
    post = store.createRecord('post');
    post2 = store.createRecord('post');
  });

  run(function() {
    comment.set('post', post);
  });

  equal(comment.get('post'), post);
  equal(post.get('bestComment'), comment);
  equal(post2.get('bestComment'), null);

  run(function() {
    post2.set('bestComment', comment);
  });

  equal(comment.get('post'), post2);
  equal(post.get('bestComment'), null);
  equal(post2.get('bestComment'), comment);
});

test("When setting a belongsTo, the OneToOne invariant is commutative", function() {
  Post = DS.Model.extend({
    bestComment: DS.belongsTo('comment', { async: false })
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post', { async: false })
  });

  var store = createStore({
    post: Post,
    comment: Comment
  });
  var post, comment, comment2;

  run(function() {
    post = store.createRecord('post');
    comment = store.createRecord('comment');
    comment2 = store.createRecord('comment');

    comment.set('post', post);
  });

  equal(comment.get('post'), post);
  equal(post.get('bestComment'), comment);
  equal(comment2.get('post'), null);

  run(function() {
    post.set('bestComment', comment2);
  });

  equal(comment.get('post'), null);
  equal(post.get('bestComment'), comment2);
  equal(comment2.get('post'), post);
});

test("OneToNone relationship works", function() {
  expect(3);
  Post = DS.Model.extend({
    name: DS.attr('string')
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post', { async: false })
  });

  var env = setupStore({ post: Post, comment: Comment });
  var store = env.store;
  var comment, post1, post2;

  run(function() {
    comment = store.createRecord('comment');
    post1 = store.createRecord('post');
    post2 = store.createRecord('post');
  });

  run(function() {
    comment.set('post', post1);
  });
  equal(comment.get('post'), post1, 'the post is set to the first one');

  run(function() {
    comment.set('post', post2);
  });
  equal(comment.get('post'), post2, 'the post is set to the second one');

  run(function() {
    comment.set('post', post1);
  });
  equal(comment.get('post'), post1, 'the post is re-set to the first one');
});


test("When a record is added to or removed from a polymorphic has-many relationship, the inverse belongsTo can be set explicitly", function() {
  User = DS.Model.extend({
    messages: DS.hasMany('message', {
      async: false,
      inverse: 'redUser',
      polymorphic: true
    })
  });

  Message = DS.Model.extend({
    oneUser: DS.belongsTo('user', { async: false }),
    twoUser: DS.belongsTo('user', { async: false }),
    redUser: DS.belongsTo('user', { async: false }),
    blueUser: DS.belongsTo('user', { async: false })
  });

  Post = Message.extend();

  var env = setupStore({ user: User, message: Message, post: Post });
  var store = env.store;
  var post, user;

  run(function() {
    post = store.createRecord('post');
    user = store.createRecord('user');
  });

  equal(post.get('oneUser'), null, "oneUser has not been set on the user");
  equal(post.get('twoUser'), null, "twoUser has not been set on the user");
  equal(post.get('redUser'), null, "redUser has not been set on the user");
  equal(post.get('blueUser'), null, "blueUser has not been set on the user");

  run(function() {
    user.get('messages').pushObject(post);
  });

  equal(post.get('oneUser'), null, "oneUser has not been set on the user");
  equal(post.get('twoUser'), null, "twoUser has not been set on the user");
  equal(post.get('redUser'), user, "redUser has been set on the user");
  equal(post.get('blueUser'), null, "blueUser has not been set on the user");

  run(function() {
    user.get('messages').popObject();
  });

  equal(post.get('oneUser'), null, "oneUser has not been set on the user");
  equal(post.get('twoUser'), null, "twoUser has not been set on the user");
  equal(post.get('redUser'), null, "redUser has bot been set on the user");
  equal(post.get('blueUser'), null, "blueUser has not been set on the user");
});

test("When a record's belongsTo relationship is set, it can specify the inverse polymorphic hasMany to which the new child should be added or removed", function() {
  User = DS.Model.extend({
    meMessages: DS.hasMany('message', { polymorphic: true, async: false }),
    youMessages: DS.hasMany('message', { polymorphic: true, async: false }),
    everyoneWeKnowMessages: DS.hasMany('message', { polymorphic: true, async: false })
  });

  Message = DS.Model.extend({
    user: DS.belongsTo('user', { inverse: 'youMessages', async: false })
  });

  Post = Message.extend();

  var env = setupStore({ user: User, message: Message, post: Post });
  var store = env.store;
  var user, post;

  run(function() {
    user = store.createRecord('user');
    post = store.createRecord('post');
  });

  equal(user.get('meMessages.length'), 0, "meMessages has no posts");
  equal(user.get('youMessages.length'), 0, "youMessages has no posts");
  equal(user.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  run(function() {
    post.set('user', user);
  });

  equal(user.get('meMessages.length'), 0, "meMessages has no posts");
  equal(user.get('youMessages.length'), 1, "youMessages had the post added");
  equal(user.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  run(function() {
    post.set('user', null);
  });

  equal(user.get('meMessages.length'), 0, "meMessages has no posts");
  equal(user.get('youMessages.length'), 0, "youMessages has no posts");
  equal(user.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");
});

test("When a record's polymorphic belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", function() {
  Message = DS.Model.extend({
    meMessages: DS.hasMany('comment', { inverse: null, async: false }),
    youMessages: DS.hasMany('comment', { inverse: 'message', async: false }),
    everyoneWeKnowMessages: DS.hasMany('comment', { inverse: null, async: false })
  });

  Post = Message.extend();

  Comment = Message.extend({
    message: DS.belongsTo('message', {
      async: false,
      polymorphic: true,
      inverse: 'youMessages'
    })
  });

  var env = setupStore({ comment: Comment, message: Message, post: Post });
  var store = env.store;
  var comment, post;

  run(function() {
    comment = store.createRecord('comment');
    post = store.createRecord('post');
  });

  equal(post.get('meMessages.length'), 0, "meMessages has no posts");
  equal(post.get('youMessages.length'), 0, "youMessages has no posts");
  equal(post.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  run(function() {
    comment.set('message', post);
  });

  equal(post.get('meMessages.length'), 0, "meMessages has no posts");
  equal(post.get('youMessages.length'), 1, "youMessages had the post added");
  equal(post.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  run(function() {
    comment.set('message', null);
  });

  equal(post.get('meMessages.length'), 0, "meMessages has no posts");
  equal(post.get('youMessages.length'), 0, "youMessages has no posts");
  equal(post.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");
});

test("Inverse relationships that don't exist throw a nice error for a hasMany", function () {
  User = DS.Model.extend();
  Comment = DS.Model.extend();

  Post = DS.Model.extend({
    comments: DS.hasMany('comment', { inverse: 'testPost', async: false })
  });

  var env = setupStore({ post: Post, comment: Comment, user: User });
  var comment, post;
  run(function() {
    comment = env.store.createRecord('comment');
  });

  expectAssertion(function() {
    run(function() {
      post = env.store.createRecord('post');
      post.get('comments');
    });
  }, /We found no inverse relationships by the name of 'testPost' on the 'comment' model/);
});

test("Inverse relationships that don't exist throw a nice error for a belongsTo", function () {
  User = DS.Model.extend();
  Comment = DS.Model.extend();

  Post = DS.Model.extend({
    user: DS.belongsTo('user', { inverse: 'testPost', async: false })
  });

  var env = setupStore({ post: Post, comment: Comment, user: User });
  var user, post;
  run(function() {
    user = env.store.createRecord('user');
  });

  expectAssertion(function() {
    run(function() {
      post = env.store.createRecord('post');
      post.get('user');
    });
  }, /We found no inverse relationships by the name of 'testPost' on the 'user' model/);
});
