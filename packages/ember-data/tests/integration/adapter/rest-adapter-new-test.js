var env, store, adapter, Post, Comment, SuperUser;
var passedUrl, passedVerb, passedHash;
var run = Ember.run;
//var get = Ember.get;

module("integration/adapter/rest_adapter - REST Adapter (new API)", {
  setup: function() {
    Post = DS.Model.extend({
      name: DS.attr("string")
    });

    Post.toString = function() {
      return "Post";
    };

    Comment = DS.Model.extend({
      name: DS.attr("string")
    });

    SuperUser = DS.Model.extend();

    env = setupStore({
      post: Post,
      comment: Comment,
      superUser: SuperUser,
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
    posts: [{ id: 1, name: "Rails is very expensive sushi" }]
  });

  store.findAll('post').then(async(function(posts) {
    equal(
      store.metadataFor('post').offset,
      5,
      "Metadata can be accessed with metadataFor."
    );
  }));
});
