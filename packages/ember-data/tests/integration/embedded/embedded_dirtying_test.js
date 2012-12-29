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
    App.destroy();
  }
});

function assertEmbeddedLoadNotDirtied() {
  var blog = post.get('blog');
  equal(blog.get('isDirty'), false, "embedded load records should not become dirty");
}

function assertTreeIs(state) {
  var comment1 = post.get('comments.firstObject');
  var comment2 = post.get('comments.lastObject');
  var user1 = comment1.get('user');
  var user2 = comment2.get('user');
  var vote1 = comment1.get('votes.firstObject');
  var vote2 = comment1.get('votes.lastObject');
  var vote3 = comment2.get('votes.firstObject');

  var records = [post, comment1, comment2, user1, user2, vote1, vote2, vote3];

  var isDirty = state === 'dirty';

  records.forEach(function(record) {
    equal(record.get('isDirty'), isDirty, record.toString() + " should be " + state);
  });

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

test("Modifyng a record embedded via embedded loading should not dirty the tree", function() {
  var blog = post.get('blog');
  blog.set('title', "[dead]");

  assertTreeIs('clean');
  ok(blog.get('isDirty'), true, "embedded load record is dirty");
});
