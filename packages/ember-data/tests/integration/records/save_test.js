var env;

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

test("Repeated failed saves keeps the record in uncommited state", function() {
  expect(2);

  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject();
  };

  post.save().then(null, function() {
    equal(post.get('currentState.stateName'), 'root.loaded.created.uncommitted');

    post.save().then(null, function() {
      equal(post.get('currentState.stateName'), 'root.loaded.created.uncommitted');
    });
  });
});

test("Will reject save on invalid", function() {
  expect(1);
  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject({ title: 'invalid' });
  };

  Ember.run(function(){
    post.save().then(function() {}, async(function() {
      ok(true, 'save operation was rejected');
    }));
  });
});
