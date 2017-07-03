import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

const { hasMany } = DS;
const { run } = Ember;

let Post, Comment, env;

module("integration/load - Loading Records", {
  beforeEach() {
    Post = DS.Model.extend({
      comments: hasMany({ async: true })
    });

    Comment = DS.Model.extend();

    env = setupStore({ post: Post, comment: Comment });
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

test("When loading a record fails, the record is not left behind", function(assert) {
  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.reject();
  };

  return run(() => {
    return env.store.findRecord('post', 1).catch(() => {
      assert.equal(env.store.hasRecordForId('post', 1), false);
    });
  });
});
