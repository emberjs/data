import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var Post, env;
var run = Ember.run;

module("integration/records/save - Save Record", {
  beforeEach() {
    Post = DS.Model.extend({
      title: DS.attr('string')
    });

    env = setupStore({ post: Post });
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

test("Will resolve save on success", function(assert) {
  assert.expect(4);
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
    assert.equal(saved.get('id'), undefined);

    deferred.resolve({ id: 123 });
    saved.then(function(model) {
      assert.ok(true, 'save operation was resolved');
      assert.equal(saved.get('id'), 123);
      assert.equal(model, post, "resolves with the model");
    });
  });
});

test("Will reject save on error", function(assert) {
  var post;
  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    var error = new DS.InvalidError([{ title: 'not valid' }]);

    return Ember.RSVP.reject(error);
  };

  run(function() {
    post.save().then(function() {}, function() {
      assert.ok(true, 'save operation was rejected');
    });
  });
});

test("Retry is allowed in a failure handler", function(assert) {
  var post;
  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  var count = 0;

  env.adapter.createRecord = function(store, type, snapshot) {
    var error = new DS.InvalidError([{ title: 'not valid' }]);

    if (count++ === 0) {
      return Ember.RSVP.reject(error);
    } else {
      return Ember.RSVP.resolve({ id: 123 });
    }
  };

  run(function() {
    post.save().then(function() {}, function() {
      return post.save();
    }).then(function(post) {
      assert.equal(post.get('id'), '123', "The post ID made it through");
    });
  });
});

test("Repeated failed saves keeps the record in uncommited state", function(assert) {
  assert.expect(4);
  var post;

  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject();
  };

  run(function() {
    post.save().then(null, function() {
      assert.ok(post.get('isError'));
      assert.equal(post.get('currentState.stateName'), 'root.loaded.created.uncommitted');

      post.save().then(null, function() {
        assert.ok(post.get('isError'));
        assert.equal(post.get('currentState.stateName'), 'root.loaded.created.uncommitted');
      });
    });
  });
});

test("Repeated failed saves with invalid error marks the record as invalid", function(assert) {
  assert.expect(2);
  var post;

  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    var error = new DS.InvalidError([
      {
        detail: 'is invalid',
        source: { pointer: 'data/attributes/title' }
      }
    ]);

    return Ember.RSVP.reject(error);
  };

  run(function() {
    post.save().then(null, function() {
      assert.equal(post.get('isValid'), false);

      post.save().then(null, function() {
        assert.equal(post.get('isValid'), false);
      });
    });
  });
});

test("Repeated failed saves with invalid error without payload marks the record as invalid", function(assert) {
  assert.expect(2);
  var post;

  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    var error = new DS.InvalidError();

    return Ember.RSVP.reject(error);
  };

  run(function() {
    post.save().then(null, function() {
      assert.equal(post.get('isValid'), false);

      post.save().then(null, function() {
        assert.equal(post.get('isValid'), false);
      });
    });
  });
});

test("Will reject save on invalid", function(assert) {
  assert.expect(1);
  var post;
  run(function() {
    post = env.store.createRecord('post', { title: 'toto' });
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    var error = new DS.InvalidError([{ title: 'not valid' }]);

    return Ember.RSVP.reject(error);
  };

  run(function() {
    post.save().then(function() {}, function() {
      assert.ok(true, 'save operation was rejected');
    });
  });
});

test("Creating a new record that returns a duplicate record updates duplicate record", function(assert) {
  assert.expect(3);
  var store = env.store;
  var post;
  run(function() {
    store.push({
      data: {
        id: '1',
        type: 'post',
        attributes: {
          title: 'Existing post title'
        }
      }
    });
    post = env.store.createRecord('post');
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({
      id: '1',
      title: 'updated title'
    });
  };

  run(function() {
    post.save().then(function() {
      var all = store.peekAll('post');
      assert.equal(post.get('id'), '1', 'The duplicate post ID loaded');
      assert.equal(post.get('title'), 'updated title', 'it updates payload of loaded record');
      assert.equal(all.get('length'), 1, "doesn't update count");
    });
  });
});
