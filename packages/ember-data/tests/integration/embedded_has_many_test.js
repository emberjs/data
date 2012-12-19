var store, Adapter, adapter, serializer;
var Post, Comment;

module("Embedded HasMany Relationships without IDs", {
  setup: function() {
    var attr = DS.attr;

    var App = Ember.Namespace.create({
      toString: function() { return "App"; }
    });

    Post = App.Post = DS.Model.extend({
      title: attr('string')
    });

    Comment = App.Comment = DS.Model.extend({
      title: attr('string'),

      post: DS.belongsTo(Post)
    });

    Post.reopen({
      comments: DS.hasMany(Comment)
    });

    serializer = DS.RESTSerializer.create();

    Adapter = DS.RESTAdapter.extend({
      serializer: serializer
    });

    Adapter.map(Post, {
      comments: { embedded: 'always' }
    });

    adapter = Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });
  }
});

test("Embedded records can be accessed via a hasMany relationship without having IDs", function() {
  adapter.load(store, Post, {
    id: 1,
    title: "A New MVC Framework in Under 100 Lines of Code",

    comments: [{
      title: "Why not use a more lightweight solution?"
    }, {
      title: "This does not seem to reflect the Unix philosophy haha"
    }]
  });

  var post = store.find(Post, 1);

  var comments = post.get('comments');

  var comment1 = comments.objectAt(0);
  var comment2 = comments.objectAt(1);

  equal(comment1.get('title'), "Why not use a more lightweight solution?");
  equal(comment2.get('title'), "This does not seem to reflect the Unix philosophy haha");
});

asyncTest("Embedded hasMany relationships can be saved when embedded: always is true", function() {
  adapter.load(store, Post, {
    id: 1,
    title: "A New MVC Framework in Under 100 Lines of Code",

    comments: [{
      title: "Why not use a more lightweight solution?"
    },
    {
      title: "This does not seem to reflect the Unix philosophy haha"
    }]
  });

  adapter.ajax = function(url, type, hash) {
    deepEqual(hash.data, {
      post: {
        title: "A New MVC Framework in Under 100 Lines of Code",

        comments: [{
          title: "Wouldn't a more lightweight solution be better? This feels very monolithic."
        },
        {
          title: "This does not seem to reflect the Unix philosophy haha"
        }]
      }
    });

    setTimeout(function() {
      hash.success.call(hash.context);
      done();
    });
  };

  var transaction = store.transaction();

  var post = store.find(Post, 1);
  var comment1 = post.get('comments').objectAt(0);
  var comment2 = post.get('comments').objectAt(1);

  transaction.add(post);
  transaction.add(comment1);
  transaction.add(comment2);

  comment1.set('title', "Wouldn't a more lightweight solution be better? This feels very monolithic.");
  equal(post.get('isDirty'), true, "post becomes dirty after changing a property");
  equal(comment1.get('isDirty'), true, "comment becomes dirty when its embedded post becomes dirty");
  equal(comment2.get('isDirty'), true, "comment becomes dirty when its embedded post becomes dirty");

  transaction.commit();

  function done() {
    equal(post.get('isDirty'), false, "post becomes clean after commit");
    equal(comment1.get('isDirty'), false, "comment becomes clean after commit");
    equal(comment2.get('isDirty'), false, "comment becomes clean after commit");
    start();
  }
});
