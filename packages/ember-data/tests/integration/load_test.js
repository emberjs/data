var store, Comment, Post;

module("Load Record/Query", {
  setup: function() {
    store = DS.Store.create({ adapter: DS.Adapter });

    Post = DS.Model.extend({
      title: DS.attr('string')
    });

    Post.toString = function() { return "Post"; };
  },

  teardown: function() {
    store.destroy();
  }
});

test("Will resolve record if found", function() {
  expect(1);

  store.adapterForType(Post).find = function(store, type, id) {
    this.didFindRecord(store, type, {post: {title: 'toto'}}, id);
    return Ember.RSVP.resolve();
  };

  store.fetch(Post, 1).then(async(function() {
    ok(true, 'record resolved');
  }));
});

test("Will reject record if not found", function() {
  expect(1);

  store.adapterForType(Post).find = function(store, type, id) {
    return Ember.RSVP.reject();
  };

  store.fetch(Post, 1).then(function() {}, async(function() {
    ok(true, 'record rejected');
  }));
});

test("Will resolve recordArray if found", function() {
  expect(1);

  store.adapterForType(Post).findQuery = function(store, type, query, array) {
    this.didFindQuery(store, type, {posts: [{id: 1, title: 'toto'}]}, array);
    return Ember.RSVP.resolve();
  };

  store.fetch(Post, {}).then(async(function() {
    ok(true, 'record resolved');
  }));
});

test("Will reject recordArray if not found", function() {
  expect(1);

  store.adapterForType(Post).findQuery = function(store, type, query, array) {
    return Ember.RSVP.reject();
  };

  store.fetch(Post, {}).then(function() {}, async(function() {
    ok(true, 'record rejected');
  }));
});
