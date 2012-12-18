var store, Adapter, adapter, serializer;
var Post, Comment;

module("Embedded Records without IDs", {
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

    Adapter.map(Comment, {
      post: { embedded: 'always' }
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

test("An embedded record can be accessed via a belongsTo relationship but does not have an ID", function() {
  adapter.load(store, Comment, {
    id: 1,
    title: "Why not use a more lightweight solution?",

    post: {
      title: "A New MVC Framework in Under 100 Lines of Code"
    }
  });

  adapter.load(store, Comment, {
    id: 2,
    title: "I do not trust it",

    post: {
      title: "Katz's Recent Foray into JavaScript"
    }
  });

  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var post1 = comment1.get('post');
  var post2 = comment2.get('post');

  equal(post1.get('title'), "A New MVC Framework in Under 100 Lines of Code", "the embedded record is found and its attributes are materialized");
  equal(post1.get('id'), null, "the embedded record does not have an id");

  equal(post2.get('title'), "Katz's Recent Foray into JavaScript", "the embedded record is found and its attributed are materialized");
  equal(post2.get('id'), null, "the embedded record does not have an id");
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
