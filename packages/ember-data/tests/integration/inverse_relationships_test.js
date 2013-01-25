var Post, Comment, Message, User, store;

module('Inverse Relationships', {
  setup: function() {
    store = DS.Store.create();
  },

  teardown: function() {
    store.destroy();
  }
});

test("When a record is added to a has-many relationship, the inverse belongsTo is determined automatically", function() {
  Post = DS.Model.extend();

  Comment = DS.Model.extend({
    post: DS.belongsTo(Post)
  });

  Post.reopen({
    comments: DS.hasMany(Comment)
  });

  var comment = store.createRecord(Comment);
  var post = store.createRecord(Post);

  equal(comment.get('post'), null, "no post has been set on the comment");

  post.get('comments').pushObject(comment);
  equal(comment.get('post'), post, "post was set on the comment");
});

test("When a record is added to a has-many relationship, the inverse belongsTo can be set explicitly", function() {
  Post = DS.Model.extend();

  Comment = DS.Model.extend({
    onePost: DS.belongsTo(Post),
    twoPost: DS.belongsTo(Post),
    redPost: DS.belongsTo(Post),
    bluePost: DS.belongsTo(Post)
  });

  Post.reopen({
    comments: DS.hasMany(Comment, {
      inverse: 'redPost'
    })
  });

  var comment = store.createRecord(Comment);
  var post = store.createRecord(Post);

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
  Post = DS.Model.extend();

  Comment = DS.Model.extend({
    post: DS.belongsTo(Post, {
      inverse: 'youComments'
    }),
  });

  Post.reopen({
    meComments: DS.hasMany(Comment),
    youComments: DS.hasMany(Comment),
    everyoneWeKnowComments: DS.hasMany(Comment)
  });

  var comment = store.createRecord(Comment);
  var post = store.createRecord(Post);

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 0, "youComments has no posts");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");

  comment.set('post', post);

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 1, "youComments had the post added");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");
});

test("When a record is added to or removed from a polymorphic has-many relationship, the inverse belongsTo can be set explicitly", function() {
  User = DS.Model.extend();

  Message = DS.Model.extend({
    oneUser: DS.belongsTo(User),
    twoUser: DS.belongsTo(User),
    redUser: DS.belongsTo(User),
    blueUser: DS.belongsTo(User)
  });

  Post = Message.extend();

  User.reopen({
    messages: DS.hasMany(Message, {
      inverse: 'redUser',
      polymorphic: true
    })
  });

  var post = store.createRecord(Post);
  var user = store.createRecord(User);

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
  User = DS.Model.extend();

  Message = DS.Model.extend({
    user: DS.belongsTo(User, {
      inverse: 'youMessages'
    })
  });

  Post = Message.extend();

  User.reopen({
    meMessages: DS.hasMany(Message, { polymorphic: true }),
    youMessages: DS.hasMany(Message, { polymorphic: true }),
    everyoneWeKnowMessages: DS.hasMany(Message, { polymorphic: true }),
  });

  var user = store.createRecord(User);
  var post = store.createRecord(Post);

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
  Message = DS.Model.extend();
  Post = Message.extend();

  Comment = Message.extend({
    message: DS.belongsTo(Message, {
      polymorphic: true,
      inverse: 'youMessages'
    }),
  });

  Message.reopen({
    meMessages: DS.hasMany(Comment),
    youMessages: DS.hasMany(Comment),
    everyoneWeKnowMessages: DS.hasMany(Comment)
  });

  var comment = store.createRecord(Comment);
  var post = store.createRecord(Post);

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
