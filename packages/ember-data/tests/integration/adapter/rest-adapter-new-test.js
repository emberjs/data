var env, store, adapter;

var passedUrl, passedVerb, passedHash;

var get = Ember.get;
var run = Ember.run;

var Post, Comment;

module("integration/adapter/rest_adapter - REST Adapter (new API)", {
  setup: function() {
    Post = DS.Model.extend({
      title: DS.attr("string"),
      comments: DS.hasMany('comment')
    });

    Post.toString = function() {
      return "Post";
    };

    Comment = DS.Model.extend({
      text: DS.attr("string")
    });

    env = setupStore({
      post: Post,
      comment: Comment,

      adapter: DS.RESTAdapter.extend({
        defaultSerializer: '-rest-new'
      })
    });

    store = env.store;
    adapter = env.adapter;

    passedUrl = passedVerb = passedHash = null;
  }
});

function ajaxResponse(value) {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
  };
}

test("metadata is accessible", function() {
  ajaxResponse({
    meta: { offset: 5 },
    posts: [{ id: 1, title: "Rails is very expensive sushi" }]
  });

  store.findAll('post').then(async(function(posts) {
    equal(
      store.metadataFor('post').offset,
      5,
      "Metadata can be accessed with metadataFor."
    );
  }));
});

test("create - sideloaded records are pushed to the store", function() {
  ajaxResponse({
    post: {
      id: 1,
      title: 'The Parley Letter',
      comments: [2, 3]
    },
    comments: [{
      id: 2,
      text: 'First comment'
    }, {
      id: 3,
      text: 'Second comment'
    }]
  });
  var post;

  run(function() {
    post = store.createRecord('post', { name: 'The Parley Letter' });
    post.save().then(function(post) {
      var comments = store.peekAll('comment');

      equal(get(comments, 'length'), 2, 'comments.length is correct');
      equal(get(comments, 'firstObject.text'), 'First comment', 'comments.firstObject.text is correct');
      equal(get(comments, 'lastObject.text'), 'Second comment', 'comments.lastObject.text is correct');
    });
  });
});
