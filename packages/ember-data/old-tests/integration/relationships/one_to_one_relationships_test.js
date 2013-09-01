var get = Ember.get, set = Ember.set;

var store, adapter, App, Post, Comment;

module("One-to-One Relationships", {
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

    App.Post.reopen({
      comment: DS.belongsTo(App.Comment)
    });
  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
    });
  }
});

function verifySynchronizedOneToOne(post, comment, expectedHasMany) {
  equal(comment.get('post'), post);
  equal(post.get('comment'), comment);
}

test("When setting a record's belongsTo relationship to another record, that record should be added to the inverse belongsTo", function() {
  store.load(App.Post, { id: 1, title: "parent" });
  store.load(App.Comment, { id: 2, body: "child" });

  var post = store.find(App.Post, 1),
      comment = store.find(App.Comment, 2);

  comment.set('post', post);
  verifySynchronizedOneToOne(post, comment);
});
