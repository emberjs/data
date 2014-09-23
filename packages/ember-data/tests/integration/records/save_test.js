var Comment, Post, env;

module("integration/records/save - Save Record", {
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

test("Will resolve save on success", function() {
  expect(1);
  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 123 });
  };

  post.save().then(async(function() {
    ok(true, 'save operation was resolved');
  }));
});

test("Will reject save on error", function() {
  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject();
  };

  post.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});

test("Retry is allowed in a failure handler", function() {
  var post = env.store.createRecord('post', {title: 'toto'});

  var count = 0;

  env.adapter.createRecord = function(store, type, record) {
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ id: 123 });
    }
  };

  post.save().then(function() {}, async(function() {
    return post.save();
  })).then(async(function(post) {
    equal(post.get('id'), '123', "The post ID made it through");
  }));
});

test("Will reject save on invalid", function() {
  expect(1);
  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject({ title: 'invalid' });
  };

  post.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});

test("Save supports extra parameters", function() {
  expect(1);
  var post = env.store.createRecord('post', {title: 'Hello world'});

  env.adapter.createRecord = function(store, type, record, extraData) {
    return Ember.RSVP.resolve({ title: extraData.extra + ' ' + record.get('title') });
  };

  post.save({
    extra: 'say:'
  }).then(function(post) {
    equal(post.get('title'), 'say: Hello world', 'extra parameters were passed on request');
  });
});
