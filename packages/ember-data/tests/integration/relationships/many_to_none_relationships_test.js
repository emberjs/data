var get = Ember.get, set = Ember.set;

var store, adapter, App, Post, Comment;

module("Many-to-None Relationships", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    });

    App = Ember.Namespace.create({
      toString: function() { return "App"; }
    });
    
    App.Comment = DS.Model.extend({
      body: DS.attr('string'),
    });

    App.Post = DS.Model.extend({
      title: DS.attr('string'),
      comments: DS.hasMany(App.Comment)
    });
  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
    });
  }
});

test("Adding a record to a hasMany relationship should work", function() {
  store.load(App.Post, { id: 1, title: "parent" });
  store.load(App.Comment, { id: 2, body: "child" });

  var post = store.find(App.Post, 1),
      comment = store.find(App.Comment, 2);

  post.get('comments').pushObject(comment);
  deepEqual(post.get('comments').toArray(), [comment], "post should have the comment added to its comments");
});

test("Removing a record from a hasMany relationship should work", function() {
  store.load(App.Post, { id: 1, title: "parent", comments: [2, 3] });
  store.load(App.Comment, { id: 2, body: "child" });
  store.load(App.Comment, { id: 3, body: "child" });

  var post = store.find(App.Post, 1),
      comment1 = store.find(App.Comment, 2),
      comment2 = store.find(App.Comment, 3);

  post.get('comments').removeObject(comment1);
  deepEqual(post.get('comments').toArray(), [comment2], "post should have the comment added to its comments");
});
