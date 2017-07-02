import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

const { get, run } = Ember;
let Post, Comment, Misc, env;

module("integration/client_id_generation - Client-side ID Generation", {
  beforeEach() {
    Comment = DS.Model.extend({
      post: DS.belongsTo('post', { async: false })
    });

    Post = DS.Model.extend({
      comments: DS.hasMany('comment', { async: false })
    });

    Misc = DS.Model.extend({
      foo: DS.attr('string')
    });

    env = setupStore({
      post: Post,
      comment: Comment,
      misc: Misc
    });
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

test("If an adapter implements the `generateIdForRecord` method, the store should be able to assign IDs without saving to the persistence layer.", function(assert) {
  assert.expect(6);

  let idCount = 1;

  env.adapter.generateIdForRecord = function(passedStore, record) {
    assert.equal(env.store, passedStore, "store is the first parameter");

    return "id-" + idCount++;
  };

  env.adapter.createRecord = function(store, type, snapshot) {
    if (type === Comment) {
      assert.equal(snapshot.id, 'id-1', "Comment passed to `createRecord` has 'id-1' assigned");
      return Ember.RSVP.resolve();
    } else {
      assert.equal(snapshot.id, 'id-2', "Post passed to `createRecord` has 'id-2' assigned");
      return Ember.RSVP.resolve();
    }
  };

  let comment, post;
  run(function() {
    comment = env.store.createRecord('comment');
    post = env.store.createRecord('post');
  });

  assert.equal(get(comment, 'id'), 'id-1', "comment is assigned id 'id-1'");
  assert.equal(get(post, 'id'), 'id-2', "post is assigned id 'id-2'");

  // Despite client-generated IDs, calling commit() on the store should still
  // invoke the adapter's `createRecord` method.
  run(function() {
    comment.save();
    post.save();
  });
});

test("empty string and undefined ids should coerce to null", function(assert) {
  assert.expect(6);
  let comment, post;
  let idCount = 0;
  let id = 1;
  let ids = [undefined, ''];
  env.adapter.generateIdForRecord = function(passedStore, record) {
    assert.equal(env.store, passedStore, "store is the first parameter");

    return ids[idCount++];
  };

  env.adapter.createRecord = function(store, type, record) {
    assert.equal(typeof get(record, 'id'), 'object', 'correct type');
    return Ember.RSVP.resolve({ data: { id: id++, type: type.modelName } });
  };

  run(() => {
    comment = env.store.createRecord('misc');
    post = env.store.createRecord('misc');
  });

  assert.equal(get(comment, 'id'), null, "comment is assigned id 'null'");
  assert.equal(get(post, 'id'), null, "post is assigned id 'null'");

  // Despite client-generated IDs, calling commit() on the store should still
  // invoke the adapter's `createRecord` method.
  run(() => {
    comment.save();
    post.save();
  });
});
