var store, Adapter, adapter;
var Post, Comment, User, App;
var attr = DS.attr;

module("Embedded Saving", {
  setup: function() {
    App = Ember.Namespace.create({ name: "App" });

    Comment = App.Comment = DS.Model.extend({
      title: attr('string'),
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
  }
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
