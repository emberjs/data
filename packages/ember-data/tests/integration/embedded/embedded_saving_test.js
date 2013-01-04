var store, Adapter, adapter;
var Post, Comment, User;
var attr = DS.attr;

module("Embedded Saving", {
  setup: function() {
    var App = Ember.Namespace.create({ name: "App" });

    Comment = App.Comment = DS.Model.extend({
      title: attr('string'),
      post: DS.belongsTo('Post')
    });

    Post = App.Post = DS.Model.extend({
      title: attr('string'),
      comments: DS.hasMany(Comment)
    });

    Adapter = DS.RESTAdapter.extend();

    Adapter.map(Post, {
      comments: { embedded: 'always' }
    });

    adapter = Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });
  }
});

asyncTest("Adding a new embedded record to an unsaved record: Both records use the same POST request.", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts');
    equal(type, 'POST');
    equal(hash.data.post.comments.length, 1);

    setTimeout(function() {
      hash.success.call(hash.context);
      start();
    });
  };

  var transaction = store.transaction();
  var post = transaction.createRecord(Post, {
    title: 'This post is unsaved'
  });

  post.get('comments').createRecord({ title: 'This embedded record is also unsaved' });

  transaction.commit();
});

asyncTest("Adding a new embedded record to an existing record: Triggers a PUT request for the existing record.", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts');
    equal(type, 'PUT');
    equal(hash.data.post.comments.length, 1);

    setTimeout(function() {
      hash.success.call(hash.context);
      start();
    });
  };

  adapter.load(store, Post, {
    id: 2,
    title: "This is an existing post"
  });

  var transaction = store.transaction();
  var post = store.find(Post, 2);

  transaction.add(post);

  post.get('comments').createRecord({ title: 'This embedded record is unsaved' });

  transaction.commit();
});
