var get = Ember.get, set = Ember.set;
var serializer, adapter, store;
var Post, Comment;

module("Client-side ID Generation", {
  setup: function() {
    serializer = DS.Serializer.create();
    adapter = DS.Adapter.create({
      serializer: serializer
    });
    store = DS.Store.create({
      adapter: adapter
    });

    Comment = DS.Model.extend();

    Post = DS.Model.extend({
      comments: DS.hasMany(Comment)
    });

    Comment.reopen({
      post: DS.belongsTo(Post)
    });
  },

  teardown: function() {
    serializer.destroy();
    adapter.destroy();
    store.destroy();
  }
});

test("If an adapter implements the `generateIdForRecord` method, the store should be able to assign IDs without saving to the persistence layer.", function() {
  expect(6);

  var idCount = 1;

  adapter.generateIdForRecord = function(passedStore, record) {
    equal(store, passedStore, "store is the first parameter");

    return "id-" + idCount++;
  };

  adapter.createRecord = function(store, type, record) {
    if (type === Comment) {
      equal(get(record, 'id'), 'id-1', "Comment passed to `createRecord` has 'id-1' assigned");
    } else {
      equal(get(record, 'id'), 'id-2', "Post passed to `createRecord` has 'id-2' assigned");
    }
  };

  var comment = store.createRecord(Comment);
  var post = store.createRecord(Post);

  equal(get(comment, 'id'), 'id-1', "comment is assigned id 'id-1'");
  equal(get(post, 'id'), 'id-2', "post is assigned id 'id-2'");

  // Despite client-generated IDs, calling commit() on the store should still
  // invoke the adapter's `createRecord` method.
  store.commit();
});
