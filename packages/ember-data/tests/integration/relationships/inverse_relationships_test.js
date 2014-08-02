var Post, Comment, Message, User, store, env;

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

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 1, "youComments had the post added");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");
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
    meMessages: DS.hasMany('comment'),
    youMessages: DS.hasMany('comment'),
    everyoneWeKnowMessages: DS.hasMany('comment')
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

test("Inverse relationships that don't exist throw a nice error", function () {
  User = DS.Model.extend();
  Comment = DS.Model.extend();

  Post = DS.Model.extend({
    comments: DS.hasMany(Comment, { inverse: 'testPost' }),
    user: DS.belongsTo(User, { inverse: 'testPost' })
  });

  var env = setupStore({ post: Post, comment: Comment, user: User });
  var post = env.store.createRecord('post');
  var user = env.store.createRecord('user');
  var comment = env.store.createRecord('comment');

  expectAssertion(function() {
    post.set('user', user);
  }, /We found no inverse relationships by the name of 'testPost' on the 'user' model/);

  expectAssertion(function() {
    post.get('comments').addRecord(comment);
  }, /We found no inverse relationships by the name of 'testPost' on the 'comment' model/);
});


