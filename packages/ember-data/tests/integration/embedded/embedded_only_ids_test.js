var store, Adapter, adapter, post;
var Post, Comment, User, App;
var attr = DS.attr;

var get = Ember.get, set = Ember.set;

var originalLookup = Ember.lookup;

module("Embedded Saving with only IDs", {
  setup: function() {
    App = Ember.lookup = Ember.Namespace.create({ name: "App" });

    Post = App.Post = DS.Model.extend({
      title: attr('string'),
      relateds: DS.hasMany('Post')
    });

    Adapter = DS.RESTAdapter.extend();

    Adapter.map(Post, {
      relateds: { embedded: 'refs' }
    });

    adapter = Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });

    adapter.load(store, Post, {
      id: 1,
      title: "A New MVC Framework in Under 100 Lines of Code",
    });

    post = store.find(Post, 1);
  },

  teardown: function() {
    store.destroy();
    App.destroy();
    Ember.lookup = originalLookup;
  }
});

asyncTest("Reference to an pre-existing record should persist.", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts');
    equal(type, 'POST');
    equal(hash.data.post.related_ids.length, 1);

    return new Ember.RSVP.Promise(function(resolve, reject){
      Ember.run.later(function(){
        start();
        resolve(hash.data);
      },0);
    });

  };

  var transaction = store.transaction();
  var new_post = transaction.createRecord(Post, {
    title: 'This post is unsaved'
  });

  new_post.get('relateds').pushObject(post);

  transaction.commit();
});
