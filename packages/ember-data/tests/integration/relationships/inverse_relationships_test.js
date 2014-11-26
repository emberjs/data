var Post, Comment, Message, User;

module('integration/relationships/inverse_relationships - Inverse Relationships');

test("When a record is added to a has-many relationship, the inverse belongsTo is determined automatically", function() {
  Post = DS.Model.extend({
    comments: DS.hasMany('comment')
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');

  equal(comment.get('post'), null, "no post has been set on the comment");

  post.get('comments').pushObject(comment);
  equal(comment.get('post'), post, "post was set on the comment");
});

test("Inverse relationships can be explicitly nullable", function () {
  User = DS.Model.extend();

  Post = DS.Model.extend({
    lastParticipant: DS.belongsTo(User, { inverse: null }),
    participants: DS.hasMany(User, { inverse: 'posts' })
  });

  User.reopen({
    posts: DS.hasMany(Post, { inverse: 'participants' })
  });

  equal(User.inverseFor('posts').name, 'participants', 'User.posts inverse is Post.participants');
  equal(Post.inverseFor('lastParticipant'), null, 'Post.lastParticipant has no inverse');
  equal(Post.inverseFor('participants').name, 'posts', 'Post.participants inverse is User.posts');
});

test("When a record is added to a has-many relationship, the inverse belongsTo can be set explicitly", function() {
  Post = DS.Model.extend({
    comments: DS.hasMany('comment', { inverse: 'redPost' })
  });

  Comment = DS.Model.extend({
    onePost: DS.belongsTo('post'),
    twoPost: DS.belongsTo('post'),
    redPost: DS.belongsTo('post'),
    bluePost: DS.belongsTo('post')
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');

  equal(comment.get('onePost'), null, "onePost has not been set on the comment");
  equal(comment.get('twoPost'), null, "twoPost has not been set on the comment");
  equal(comment.get('redPost'), null, "redPost has not been set on the comment");
  equal(comment.get('bluePost'), null, "bluePost has not been set on the comment");

  post.get('comments').pushObject(comment);

  equal(comment.get('onePost'), null, "onePost has not been set on the comment");
  equal(comment.get('twoPost'), null, "twoPost has not been set on the comment");
  equal(comment.get('redPost'), post, "redPost has been set on the comment");
  equal(comment.get('bluePost'), null, "bluePost has not been set on the comment");
});

test("When a record's belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", function() {
  Post = DS.Model.extend({
    meComments: DS.hasMany('comment'),
    youComments: DS.hasMany('comment'),
    everyoneWeKnowComments: DS.hasMany('comment')
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post', { inverse: 'youComments' })
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 0, "youComments has no posts");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");

  comment.set('post', post);

  equal(comment.get('post'), post, 'The post that was set can be retrieved');

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 1, "youComments had the post added");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");
});

test("When setting a belongsTo, the OneToOne invariant is respected even when other records have been previously used", function() {
  Post = DS.Model.extend({
    bestComment: DS.belongsTo('comment')
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');
  var post2 = store.createRecord('post');

  comment.set('post', post);
  post2.set('bestComment', null);

  equal(comment.get('post'), post);
  equal(post.get('bestComment'), comment);
  equal(post2.get('bestComment'), null);

  comment.set('post', post2);

  equal(comment.get('post'), post2);
  equal(post.get('bestComment'), null);
  equal(post2.get('bestComment'), comment);
});

test("When setting a belongsTo, the OneToOne invariant is transitive", function() {
  Post = DS.Model.extend({
    bestComment: DS.belongsTo('comment')
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');
  var post2 = store.createRecord('post');

  comment.set('post', post);

  equal(comment.get('post'), post);
  equal(post.get('bestComment'), comment);
  equal(post2.get('bestComment'), null);

  post2.set('bestComment', comment);

  equal(comment.get('post'), post2);
  equal(post.get('bestComment'), null);
  equal(post2.get('bestComment'), comment);

});

test("When setting a belongsTo, the OneToOne invariant is commutative", function() {
  Post = DS.Model.extend({
    bestComment: DS.belongsTo('comment')
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');
  var comment2 = store.createRecord('comment');

  comment.set('post', post);

  equal(comment.get('post'), post);
  equal(post.get('bestComment'), comment);
  equal(comment2.get('post'), null);

  post.set('bestComment', comment2);

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
    post: DS.belongsTo('post')
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post1 = store.createRecord('post');
  var post2 = store.createRecord('post');

  comment.set('post', post1);
  equal(comment.get('post'), post1, 'the post is set to the first one');

  comment.set('post', post2);
  equal(comment.get('post'), post2, 'the post is set to the second one');

  comment.set('post', post1);
  equal(comment.get('post'), post1, 'the post is re-set to the first one');
});


test("When a record is added to or removed from a polymorphic has-many relationship, the inverse belongsTo can be set explicitly", function() {
  User = DS.Model.extend({
    messages: DS.hasMany('message', {
      inverse: 'redUser',
      polymorphic: true
    })
  });

  Message = DS.Model.extend({
    oneUser: DS.belongsTo('user'),
    twoUser: DS.belongsTo('user'),
    redUser: DS.belongsTo('user'),
    blueUser: DS.belongsTo('user')
  });

  Post = Message.extend();

  var env = setupStore({ user: User, message: Message, post: Post }),
      store = env.store;

  var post = store.createRecord('post');
  var user = store.createRecord('user');

  equal(post.get('oneUser'), null, "oneUser has not been set on the user");
  equal(post.get('twoUser'), null, "twoUser has not been set on the user");
  equal(post.get('redUser'), null, "redUser has not been set on the user");
  equal(post.get('blueUser'), null, "blueUser has not been set on the user");

  user.get('messages').pushObject(post);

  equal(post.get('oneUser'), null, "oneUser has not been set on the user");
  equal(post.get('twoUser'), null, "twoUser has not been set on the user");
  equal(post.get('redUser'), user, "redUser has been set on the user");
  equal(post.get('blueUser'), null, "blueUser has not been set on the user");

  user.get('messages').popObject();

  equal(post.get('oneUser'), null, "oneUser has not been set on the user");
  equal(post.get('twoUser'), null, "twoUser has not been set on the user");
  equal(post.get('redUser'), null, "redUser has bot been set on the user");
  equal(post.get('blueUser'), null, "blueUser has not been set on the user");
});

test("When a record's belongsTo relationship is set, it can specify the inverse polymorphic hasMany to which the new child should be added or removed", function() {
  User = DS.Model.extend({
    meMessages: DS.hasMany('message', { polymorphic: true }),
    youMessages: DS.hasMany('message', { polymorphic: true }),
    everyoneWeKnowMessages: DS.hasMany('message', { polymorphic: true })
  });

  Message = DS.Model.extend({
    user: DS.belongsTo('user', { inverse: 'youMessages' })
  });

  Post = Message.extend();

  var env = setupStore({ user: User, message: Message, post: Post }),
      store = env.store;

  var user = store.createRecord('user');
  var post = store.createRecord('post');

  equal(user.get('meMessages.length'), 0, "meMessages has no posts");
  equal(user.get('youMessages.length'), 0, "youMessages has no posts");
  equal(user.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  post.set('user', user);

  equal(user.get('meMessages.length'), 0, "meMessages has no posts");
  equal(user.get('youMessages.length'), 1, "youMessages had the post added");
  equal(user.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  post.set('user', null);

  equal(user.get('meMessages.length'), 0, "meMessages has no posts");
  equal(user.get('youMessages.length'), 0, "youMessages has no posts");
  equal(user.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");
});

test("When a record's polymorphic belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", function() {
  Message = DS.Model.extend({
    meMessages: DS.hasMany('comment', {inverse: null}),
    youMessages: DS.hasMany('comment', {inverse: 'message'}),
    everyoneWeKnowMessages: DS.hasMany('comment', {inverse: null})
  });

  Post = Message.extend();

  Comment = Message.extend({
    message: DS.belongsTo('message', {
      polymorphic: true,
      inverse: 'youMessages'
    })
  });

  var env = setupStore({ comment: Comment, message: Message, post: Post }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');

  equal(post.get('meMessages.length'), 0, "meMessages has no posts");
  equal(post.get('youMessages.length'), 0, "youMessages has no posts");
  equal(post.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  comment.set('message', post);

  equal(post.get('meMessages.length'), 0, "meMessages has no posts");
  equal(post.get('youMessages.length'), 1, "youMessages had the post added");
  equal(post.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  comment.set('message', null);

  equal(post.get('meMessages.length'), 0, "meMessages has no posts");
  equal(post.get('youMessages.length'), 0, "youMessages has no posts");
  equal(post.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");
});

test("Inverse relationships that don't exist throw a nice error for a hasMany", function () {
  User = DS.Model.extend();
  Comment = DS.Model.extend();

  Post = DS.Model.extend({
    comments: DS.hasMany(Comment, { inverse: 'testPost' })
  });

  var env = setupStore({ post: Post, comment: Comment, user: User });
  env.store.createRecord('comment');

  expectAssertion(function() {
    env.store.createRecord('post');
  }, /We found no inverse relationships by the name of 'testPost' on the 'comment' model/);

});

test("Inverse relationships that don't exist throw a nice error for a belongsTo", function () {
  User = DS.Model.extend();
  Comment = DS.Model.extend();

  Post = DS.Model.extend({
    user: DS.belongsTo(User, { inverse: 'testPost' })
  });

  var env = setupStore({ post: Post, comment: Comment, user: User });
  env.store.createRecord('user');

  expectAssertion(function() {
    env.store.createRecord('post');
  }, /We found no inverse relationships by the name of 'testPost' on the 'user' model/);

});


