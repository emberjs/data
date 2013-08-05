var store, Adapter, adapter;
var Post, Comment, User, App;
var attr = DS.attr;

var get = Ember.get, set = Ember.set;

var originalLookup = Ember.lookup;

module("Embedded Saving", {
  setup: function() {
    App = Ember.lookup = Ember.Namespace.create({ name: "App" });

    Comment = App.Comment = DS.Model.extend({
      title: attr('string')
    });

    Post = App.Post = DS.Model.extend({
      title: attr('string'),
      comments: DS.hasMany(Comment)
    });

    Comment.reopen({
      post: DS.belongsTo(Post)
    });

    Adapter = DS.RESTAdapter.extend();

    Adapter.map(Post, {
      comments: { embedded: 'always' }
    });

    adapter = Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });
  },

  teardown: function() {
    store.destroy();
    App.destroy();
    Ember.lookup = originalLookup;
  }
});

asyncTest("Modifying the parent in a different transaction", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts/1');
    equal(type, 'PUT');
    equal(hash.data.post.comments.length, 1);

    return new Ember.RSVP.Promise(function(resolve, reject){
      Ember.run.later(function(){
        start();
        resolve(hash.data);
      },0);
    });
  };

  adapter.load(store, Post, {
    id: 1,
    title: 'I cannot wait for Ember.Component to be implemented.',
    comments: [{id: 2, title: 'yes!'}]
  });

  var post = store.find(Post, 1);

  var t = store.transaction();
  t.add(post);

  set(post, 'title', "Hopefully soon.");

  t.commit();
});

asyncTest("Adding a new embedded record to an unsaved record: Both records use the same POST request.", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts');
    equal(type, 'POST');
    equal(hash.data.post.comments.length, 1);

    return new Ember.RSVP.Promise(function(resolve, reject){
      Ember.run.later(function(){
        start();
        resolve(hash.data);
      },0);
    });

  };
  var transaction = store.transaction();
  var post = transaction.createRecord(Post, {
    title: 'This post is unsaved'
  });

  post.get('comments').createRecord({ title: 'This embedded record is also unsaved' });

  transaction.commit();
});
