var get = Ember.get, set = Ember.set;

var store, adapter, App, Post, Comment;

module("One-to-None Relationships", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    });

    App = Ember.Namespace.create({
      toString: function() { return "App"; }
    });

    App.Post = DS.Model.extend({
      title: DS.attr('string')
    });

    App.Comment = DS.Model.extend({
      body: DS.attr('string'),
      post: DS.belongsTo(App.Post)
    });

  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
    });
  }
});

function verifySynchronizedOneToMany(post, comment, expectedHasMany) {
  expectedHasMany = expectedHasMany || [comment];
  equal(comment.get('post'), post);
  deepEqual(post.get('comments').toArray(), expectedHasMany);
}

test("Setting a record's belongsTo relationship to another record, should work", function() {
  store.load(App.Post, { id: 1, title: "parent" });
  store.load(App.Comment, { id: 2, body: "child" });

  var post = store.find(App.Post, 1),
      comment = store.find(App.Comment, 2);

  comment.set('post', post);
  deepEqual(comment.get('post'), post, "comment should have the correct post set");
});

test("Setting a record's belongsTo relationship to null should work", function() {
  store.load(App.Post, { id: 1, title: "parent", comments: [2, 3] });
  store.load(App.Comment, { id: 2, body: "child", post: 1 });
  store.load(App.Comment, { id: 3, body: "child", post: 1 });

  var post = store.find(App.Post, 1),
      comment1 = store.find(App.Comment, 2),
      comment2 = store.find(App.Comment, 3);

  comment1.set('post', null);
  equal(comment1.get('post'), null, "belongsTo relationship has been set to null");
});
