var store, serializer, Post, Comment, comment;

module("RESTSerializer - Adapter serialization with relationships", {
  setup: function() {
    store = DS.Store.create();

    Post = DS.Model.extend();

    Comment = DS.Model.extend({
      post: DS.belongsTo(Post)
    });

    Post.reopen({
      comments: DS.hasMany(Comment)
    });

    store.load(Comment, 2, { id: 2, post: 1 });
    store.load(Post, 1, { id: 1, comments: [2] });

    serializer = DS.RESTSerializer.create();

    comment = store.find(Comment, 2);
  },

  teardown: function() {
    comment.destroy();
    serializer.destroy();
    store.destroy();
  }
});

test("addBelongsTo calls serializeId", function() {
  expect(1);

  serializer.serializeId = function(id) {
    ok(true, "serializeId has been called");
  };

  serializer.toJSON(comment);
});

test("addBelongsTo adds serialized id", function() {
  var json = serializer.toJSON(comment);
  deepEqual(json, {
    post_id: 1
  }, "toJSON uses serialized id");
});

test("addBelongsTo only adds id when there is one", function() {
  store.load(Comment, 3, {});
  comment = store.find(Comment, 3);

  equal(comment.get('post'), null, "precodition - there is no post for the comment");

  var json = serializer.toJSON(comment);
  deepEqual(json, {}, "toJSON doesn't add belongsTo relationship if there is no other side");
});