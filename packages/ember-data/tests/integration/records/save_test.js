var Comment, Post, env;

module("integration/records/save - Save Record", {
  setup: function() {
    var Comment = DS.Model.extend({
      title: DS.attr('string')
    });

    Comment.toString = function() { return "Comment"; };

    var Post = DS.Model.extend({
      title: DS.attr('string'),
      otherTitle: DS.attr('string'),
      comment: DS.belongsTo('comment')
    });

    Post.toString = function() { return "Post"; };

    env = setupStore({ post: Post, comment: Comment });
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

test("Will not overwrite current data when createRecord returns partial data", function() {
  expect(3);
  var comment = env.store.createRecord('comment', {title: 'my comment'});
  var post = env.store.createRecord('post', {title: 'toto', otherTitle:'please dont delete me'});
  post.set('comment', comment);

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 123, title: 'new title' });
  };

  //The default serializer creates keys with value set to null if no key was passed by the adapter
  //That might not always be the desired behavior, so mocking normalize to avoid that
  env.serializer.normalize = function(type, hash){
    return hash;
  };

  post.save().then(async(function(post) {
    equal(post.get('title'), 'new title', 'title attribute was updated');
    equal(post.get('otherTitle'), 'please dont delete me', 'the otherTitle attribute was kept');
    equal(post.get('comment.title'), 'my comment', 'commment relationship was kept');
  }));
});

test("Will not overwrite current data when updateRecord returns partial data", function() {
  expect(3);
  var comment = env.store.push('comment', {id:5, title: 'my comment'});
  var post = env.store.push('post', {id:1, comment:5, title: 'toto', otherTitle:'please dont delete me'});

  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 1, title: 'new title' });
  };

  //The default serializer creates keys with value set to null if no key was passed by the adapter
  //That might not always be the desired behavior, so mocking normalize to avoid that
  env.serializer.normalize = function(type, hash){
    return hash;
  };

  post.save().then(async(function(post) {
    equal(post.get('title'), 'new title', 'title attribute was updated');
    equal(post.get('otherTitle'), 'please dont delete me', 'the otherTitle attribute was kept');
    equal(post.get('comment.title'), 'my comment', 'commment relationship was kept');
  }));
});
