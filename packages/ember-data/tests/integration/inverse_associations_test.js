var Post, Comment, store;

module('Inverse Associations', {
  setup: function() {
    store = DS.Store.create();
  },

  teardown: function() {
    store.destroy();
  }
});

test("When a record is added to a has-many association, the inverse belongsTo is determined automatically", function() {
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

test("When a record is added to a has-many association, the inverse belongsTo can be set explicitly", function() {
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

test("setting a belongsTo without an inverse hasMany", function() {
  Post = DS.Model.extend({
    title: DS.attr('string')
  });
  Post.toString = function() { return "Post"; };

  Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.belongsTo(Post)
  });
  Comment.toString = function() { return "Comment"; };

  store.load(Post, { id: 1 });
  store.load(Post, { id: 2 });
  store.load(Comment, { id: 1, body: 'Pre-assigned comment', post: 1 });
  store.load(Comment, { id: 2, body: 'Initially unassigned comment' });

  var post1 = store.find(Post, 1),
      post2 = store.find(Post, 1),
      comment;

  comment = store.find(Comment, 1);
  equal(comment.get('post'), post1, "post is initially set to Post 1");
  comment.set('post', null);
  equal(comment.get('post'), null, "post has been unset");
  comment.set('post', post1);
  equal(comment.get('post'), post1, "post has been restored to Post 1");

  comment = store.find(Comment, 1);
  equal(comment.get('post'), post1, "post is initially set to Post 1");
  comment.set('post', post2);
  equal(comment.get('post'), post2, "post has been updated to Post 2");
  comment.set('post', post1);
  equal(comment.get('post'), post1, "post has been restored to Post 1");

  comment = store.find(Comment, 2);
  equal(comment.get('post'), null, "post is initially unset");
  comment.set('post', post1);
  equal(comment.get('post'), post1, "post has been set to Post 1");
  comment.set('post', null);
  equal(comment.get('post'), null, "post has been restored to null");
});
