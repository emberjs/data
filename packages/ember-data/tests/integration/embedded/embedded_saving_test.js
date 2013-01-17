var store, Adapter, adapter;
var Post, Comment, User;
var post;
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

    adapter.load(store, Post, {
      id: 1,
      title: "A New MVC Framework in Under 100 Lines of Code",

      comments: [{
        title: "Why not use a more lightweight solution?",
        user: {
          name: "mongodb_user"
        },
        votes: [ { voter: "tomdale" }, { voter: "wycats" } ]
      }, {
          title: "This does not seem to reflect the Unix philosophy haha",
          user: {
            name: "microuser"
          },
          votes: [ { voter: "ebryn" } ]
        }]
    });

    post = store.find(Post, 1);
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

asyncTest("Removing an embedded record from a parent record: A POST request is sent to update parent record.", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts');
    equal(type, 'POST');
    equal(hash.data.post.comments.length, 1);

    setTimeout(function() {
      hash.success.call(hash.context);
      start();
    });
  };

  post.get('comments.firstObject').deleteRecord();
  store.commit();
});
