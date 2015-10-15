var Post, env;
var run = Ember.run;

module("integration/records/save - Save Record", {
  setup: function() {
    Post = DS.Model.extend({
      title: DS.attr('string')
    });

    Post.toString = function() { return "Post"; };

    env = setupStore({ post: Post });
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("Will resolve save on success", function() {
  expect(4);
  var post;
  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  var deferred = Ember.RSVP.defer();
  env.adapter.createRecord = function(store, type, snapshot) {
    return deferred.promise;
  };

  run(function() {
    var saved = post.save();

    // `save` returns a PromiseObject which allows to call get on it
    equal(saved.get('id'), undefined);

    deferred.resolve({ id: 123 });
    saved.then(function(model) {
      ok(true, 'save operation was resolved');
      equal(saved.get('id'), 123);
      equal(model, post, "resolves with the model");
    });
  });
});

test("Will reject save on error", function() {
  var post;
  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject();
  };

  run(function() {
    post.save().then(function() {}, function() {
      ok(true, 'save operation was rejected');
    });
  });
});

test("Retry is allowed in a failure handler", function() {
  var post;
  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  var count = 0;

  env.adapter.createRecord = function(store, type, snapshot) {
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ id: 123 });
    }
  };

  run(function() {
    post.save().then(function() {}, function() {
      return post.save();
    }).then(function(post) {
      equal(post.get('id'), '123', "The post ID made it through");
    });
  });
});

test("Repeated failed saves keeps the record in uncommited state", function() {
  expect(2);
  var post;

  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    var error = new DS.InvalidError([{ title: 'not valid' }]);

    return Ember.RSVP.reject(error);
  };

  run(function() {
    post.save().then(null, function() {
      equal(post.get('currentState.stateName'), 'root.loaded.created.uncommitted');

      post.save().then(null, function() {
        equal(post.get('currentState.stateName'), 'root.loaded.created.uncommitted');
      });
    });
  });
});

test("Will reject save on invalid", function() {
  expect(1);
  var post;
  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject({ title: 'invalid' });
  };

  run(function() {
    post.save().then(function() {}, function() {
      ok(true, 'save operation was rejected');
    });
  });
});
