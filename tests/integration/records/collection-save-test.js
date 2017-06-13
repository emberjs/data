import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var Post, env;
var run = Ember.run;

module("integration/records/collection_save - Save Collection of Records", {
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

test("Collection will resolve save on success", function(assert) {
  assert.expect(1);
  let id = 1;
  run(function() {
    env.store.createRecord('post', { title: 'Hello' });
    env.store.createRecord('post', { title: 'World' });
  });

  var posts = env.store.peekAll('post');

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ data: { id: id++ , type: 'post' } });
  };

  run(function() {
    posts.save().then(assert.wait(function() {
      assert.ok(true, 'save operation was resolved');
    }));
  });
});

test("Collection will reject save on error", function(assert) {
  run(function() {
    env.store.createRecord('post', { title: 'Hello' });
    env.store.createRecord('post', { title: 'World' });
  });

  var posts = env.store.peekAll('post');

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject();
  };

  run(function() {
    posts.save().then(function() {}, assert.wait(function() {
      assert.ok(true, 'save operation was rejected');
    }));
  });
});

test("Retry is allowed in a failure handler", function(assert) {
  run(function() {
    env.store.createRecord('post', { title: 'Hello' });
    env.store.createRecord('post', { title: 'World' });
  });

  var posts = env.store.peekAll('post');

  var count = 0;
  let id = 1;

  env.adapter.createRecord = function(store, type, snapshot) {
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ data: { id: id++, type: 'post' } });
    }
  };

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ data: { id: snapshot.id, type: 'post' } });
  };

  run(function() {
    posts.save()
      .then(
        function() {},
        assert.wait(function() { return posts.save(); }))
      .then(
        assert.wait(function(post) {
          // the ID here is '2' because the second post saves on the first attempt,
          // while the first post saves on the second attempt
          assert.equal(posts.get('firstObject.id'), '2', "The post ID made it through");
        }));
  });
});

test("Collection will reject save on invalid", function(assert) {
  assert.expect(1);
  run(function() {
    env.store.createRecord('post', { title: 'Hello' });
    env.store.createRecord('post', { title: 'World' });
  });

  var posts = env.store.peekAll('post');

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject({ title: 'invalid' });
  };

  Ember.run(function() {
    posts.save().then(function() {}, function() {
      assert.ok(true, 'save operation was rejected');
    });
  });
});
