var store, Adapter, adapter, serializer;
var Post, Comment;

module("Embedded Records without IDs", {
  setup: function() {
    var attr = DS.attr;

    Post = DS.Model.extend({
      title: attr('string')
    });

    Comment = DS.Model.extend({
      title: attr('string'),

      post: DS.belongsTo(Post)
    });

    serializer = DS.JSONSerializer.create();

    Adapter = DS.Adapter.extend({
      serializer: serializer
    });

    Adapter.map(Comment, {
      post: { embedded: 'always' }
    });

    store = DS.Store.create({
      adapter: Adapter.create()
    });

  }
});

test("An embedded record can be accessed via a belongsTo relationship but does not have an ID", function() {
  store.load(Comment, {
    id: 1,
    title: "Why not use a more lightweight solution?",

    post: {
      title: "A New MVC Framework in Under 100 Lines of Code"
    }
  });

  store.load(Comment, {
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
