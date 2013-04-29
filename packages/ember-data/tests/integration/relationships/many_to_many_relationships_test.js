var get = Ember.get, set = Ember.set;

var store, adapter, App, Post, Comment;

module("Many-to-Many Relationships", {
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
      posts: DS.hasMany(App.Post)
    });

    App.Post.reopen({
      comments: DS.hasMany(App.Comment)
    });
  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
    });
  }
});

function verifySynchronizedManyToMany(post, comment, expectedHasMany) {
  expectedHasMany = expectedHasMany || [comment];
  deepEqual(post.get('comments').toArray(), [comment]);
  deepEqual(comment.get('posts').toArray(), [post]);
}

test("When adding another record to a hasMany relationship, that record should be added to the inverse hasMany array", function() {
  store.load(App.Post, { id: 1, title: "parent" });
  store.load(App.Comment, { id: 2, body: "child" });

  var post = store.find(App.Post, 1),
      comment = store.find(App.Comment, 2);

  equal(post.get('comments.length'), 0, "precond - the post has no child comments yet");

  comment.get('posts').addObject(post);
  verifySynchronizedManyToMany(post, comment);
});
