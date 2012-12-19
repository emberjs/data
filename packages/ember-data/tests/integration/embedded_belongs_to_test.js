var store, Adapter, adapter, serializer;
var Post, Comment;

module("Embedded BelongsTo Relationships without IDs", {
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

    serializer = DS.RESTSerializer.create();

    Adapter = DS.RESTAdapter.extend({
      serializer: serializer
    });

    Adapter.map(Comment, {
      post: { embedded: 'always' }
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

asyncTest("Embedded belongsTo relationships can be saved when embedded: always is true", function() {
  adapter.load(store, Comment, {
    id: 1,
    title: "Why not use a more lightweight solution?",

    post: {
      title: "A New MVC Framework in Under 100 Lines of Code"
    }
  });

  adapter.ajax = function(url, type, hash) {
    deepEqual(hash.data, {
      comment: {
        title: "Why not use a more lightweight solution?",
        post: {
          title: "A New Lightweight MVC Framework in Under 100 Lines of Code"
        }
      }
    });

    setTimeout(function() {
      hash.success.call(hash.context);
      done();
    });
  };

  var transaction = store.transaction();

  var comment = store.find(Comment, 1);
  var post = comment.get('post');

  transaction.add(post);
  transaction.add(comment);

  post.set('title', "A New Lightweight MVC Framework in Under 100 Lines of Code");
  equal(post.get('isDirty'), true, "post becomes dirty after changing a property");
  equal(comment.get('isDirty'), true, "comment becomes dirty when its embedded post becomes dirty");

  transaction.commit();

  function done() {
    equal(post.get('isDirty'), false, "post becomes clean after commit");
    equal(comment.get('isDirty'), false, "comment becomes clean after commit");
    start();
  }
});
