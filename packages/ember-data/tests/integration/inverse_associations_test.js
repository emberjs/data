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
