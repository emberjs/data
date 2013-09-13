var Comment, Post, env;

module("integration/records/collection_save - Save Collection of Records", {
  setup: function() {
    var Post = DS.Model.extend({
      title: DS.attr('string')
    });

    Post.toString = function() { return "Post"; };

    env = setupStore({ post: Post });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("Collection will resolve save on success", function() {
  expect(1);
  env.store.createRecord('post', {title: 'Hello'});
  env.store.createRecord('post', {title: 'World'});

  var posts = env.store.all('post');

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 123 });
  };

  posts.save().then(async(function() {
    ok(true, 'save operation was resolved');
  }));
});

test("Collection will reject save on error", function() {
  env.store.createRecord('post', {title: 'Hello'});
  env.store.createRecord('post', {title: 'World'});

  var posts = env.store.all('post');

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject();
  };

  posts.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});

test("Retry is allowed in a failure handler", function() {
  env.store.createRecord('post', {title: 'Hello'});
  env.store.createRecord('post', {title: 'World'});

  var posts = env.store.all('post');

  var count = 0;

  env.adapter.createRecord = function(store, type, record) {
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ id: 123 });
    }
  };

  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 123 });
  };

  posts.save().then(function() {}, async(function() {
    return posts.save();
  })).then(async(function(post) {
    equal(posts.get('firstObject.id'), '123', "The post ID made it through");
  }));
});

test("Collection will reject save on invalid", function() {
  expect(1);
  env.store.createRecord('post', {title: 'Hello'});
  env.store.createRecord('post', {title: 'World'});

  var posts = env.store.all('post');

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject({ title: 'invalid' });
  };

  posts.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});