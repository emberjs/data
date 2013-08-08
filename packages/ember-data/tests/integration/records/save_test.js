var Comment, Post, env;

module("Save Record", {
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
    store.didSaveRecord(record, {id: 123});
  };

  post.save().then(async(function() {
    ok(true, 'save operation was resolved');
  }));
});

test("Will reject save on error", function() {
  expect(1);
  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    store.recordWasError(record);
  };

  post.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});

test("Will reject save on invalid", function() {
  expect(1);
  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    store.recordWasInvalid(record, {title: 'invalid'});
  };

  post.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});
