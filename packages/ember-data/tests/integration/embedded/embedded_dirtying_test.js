var attr = DS.attr;
var Post, Comment, User, Vote, Blog;
var Adapter, App;
var adapter, store, post;
var forEach = Ember.EnumerableUtils.forEach;


// The models here are related like this:
//
//             Post
//  belongsTo /  |
// (non-embedded)|
//        Blog   | hasMany
//           Comments
// belongsTo /    \
//          /      \ hasMany
//       User     Votes

module("Dirtying of Embedded Records", {
  setup: function() {
    App = Ember.Namespace.create({ name: "App" });

    User = App.User = DS.Model.extend({
      name: attr('string')
    });

    Vote = App.Vote = DS.Model.extend({
      voter: attr('string')
    });

    Comment = App.Comment = DS.Model.extend({
      title: attr('string'),
      user: DS.belongsTo(User),
      votes: DS.hasMany(Vote)
    });

    Blog = App.Blog = DS.Model.extend({
      title: attr('string')
    });

    Post = App.Post = DS.Model.extend({
      title: attr('string'),
      comments: DS.hasMany(Comment),
      blog: DS.belongsTo(Blog)
    });

    Comment.reopen({
      post: DS.belongsTo(Post)
    });

    Adapter = DS.RESTAdapter.extend();

    Adapter.map(Comment, {
      user: { embedded: 'always' },
      votes: { embedded: 'always' }
    });

    Adapter.map(Post, {
      comments: { embedded: 'always' },
      blog: { embedded: 'load' }
    });

    adapter = Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });

    adapter.load(store, Post, {
      id: 1,
      title: "A New MVC Framework in Under 100 Lines of Code",

      blog: {
        id: 2,
        title: "Hacker News"
      },

      comments: [{
        title: "Why not use a more lightweight solution?",
        user: {
          name: "mongodb_user"
        },
        votes: [ { voter: "tomdale" }, { voter: "wycats" } ]
      },
      {
        title: "This does not seem to reflect the Unix philosophy haha",
        user: {
          name: "microuser",
        },
        votes: [ { voter: "ebryn" } ]
      }]
    });

    post = store.find(Post, 1);
  },

  teardown: function() {
    store.destroy();
    App.destroy();
  }
});

function assertEmbeddedLoadNotDirtied() {
  var blog = post.get('blog');
  equal(blog.get('isDirty'), false, "embedded load records should not become dirty");
}

function assertTreeIs(state) {
  post.get('comments').forEach(function(comment) {
    assertRecordIs(comment, state);
    if (comment.get('user')) {
      assertRecordIs(comment.get('user'), state);
    }
    comment.get('votes').forEach(function(vote) {
      assertRecordIs(vote, state);
    });
  });
}

function assertRecordIs(record, state) {
  var isDirty = state === 'dirty';
  equal(record.get('isDirty'), isDirty, record.toString() + " should be " + state);
}

test("Modifying a record that contains embedded records should dirty the entire tree", function() {
  var post = store.find(Post, 1);
  post.set('title', "[dead]");
  assertTreeIs('dirty');
  assertEmbeddedLoadNotDirtied();
});

test("Modifying a record embedded via a belongsTo relationship should dirty the entire tree", function() {
  var user = post.get('comments.firstObject.user');
  user.set('name', "[dead]");
  assertTreeIs('dirty');
  assertEmbeddedLoadNotDirtied();
});

test("Modifying a record embedded via a hasMany relationship should dirty the entire tree", function() {
  var vote = post.get('comments.firstObject.votes.firstObject');
  vote.set('voter', "[dead]");
  assertTreeIs('dirty');
});

test("Creating a record embedded via a hasMany relationship should dirty the entire tree", function() {
  var comment = store.createRecord(Comment, {
    post: post,
    title: 'A new comment'
  });
  equal(comment.get('isDirty'), true, "New comment should be dirty");
  assertTreeIs('dirty');
});

test("Creating a record embedded via a hasMany relationship should dirty the entire tree", function() {
  var comment = post.get('comments').createRecord({ title: 'A new comment' });
  equal(comment.get('isDirty'), true, "New comment should be dirty");
  assertTreeIs('dirty');
});

test("Modifyng a record embedded via embedded loading should not dirty the tree", function() {
  var blog = post.get('blog');
  blog.set('title', "[dead]");

  assertTreeIs('clean');
  ok(blog.get('isDirty'), true, "embedded load record is dirty");
});
