import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var hasMany = DS.hasMany;
var Post, Comment, env;
var run = Ember.run;

module("integration/load - Loading Records", {
  beforeEach: function() {
    Post = DS.Model.extend({
      comments: hasMany({ async: true })
    });

    Comment = DS.Model.extend();

    Post.toString = function() { return "Post"; };
    Comment.toString = function() { return "Comment"; };

    env = setupStore({ post: Post, comment: Comment });
  },

  afterEach: function() {
    run(env.container, 'destroy');
  }
});

test("When loading a record fails, the isLoading is set to false", function(assert) {
  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.reject();
  };

  run(function() {
    env.store.findRecord('post', 1).then(null, assert.wait(function() {
      // store.recordForId is private, but there is currently no other way to
      // get the specific record instance, since it is not passed to this
      // rejection handler
      var post = env.store.recordForId('post', 1);

      assert.equal(post.get("isLoading"), false, "post is not loading anymore");
    }));
  });
});
