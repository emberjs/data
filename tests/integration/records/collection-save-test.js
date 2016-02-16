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
  run(function() {
    env.store.createRecord('post', { title: 'Hello' });
    env.store.createRecord('post', { title: 'World' });
  });

  var posts = env.store.peekAll('post');

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ id: 123 });
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

  env.adapter.createRecord = function(store, type, snapshot) {
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ id: 123 });
    }
  };

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ id: 123 });
  };

  run(function() {
    posts.save().then(function() {}, assert.wait(function() {
      return posts.save();
    })).then(assert.wait(function(post) {
      assert.equal(posts.get('firstObject.id'), '123', "The post ID made it through");
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
