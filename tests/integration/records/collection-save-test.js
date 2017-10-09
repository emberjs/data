import { resolve, reject } from 'rsvp';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

let Post, env;

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
  run(() => {
    env.store.createRecord('post', { title: 'Hello' });
    env.store.createRecord('post', { title: 'World' });
  });

  let posts = env.store.peekAll('post');

  env.adapter.createRecord = function(store, type, snapshot) {
    return resolve({ data: { id: id++ , type: 'post' } });
  };

  return run(() => {
    return posts.save().then(() => {
      assert.ok(true, 'save operation was resolved');
    });
  });
});

test("Collection will reject save on error", function(assert) {
  run(() => {
    env.store.createRecord('post', { title: 'Hello' });
    env.store.createRecord('post', { title: 'World' });
  });

  let posts = env.store.peekAll('post');

  env.adapter.createRecord = function(store, type, snapshot) {
    return reject();
  };

  return run(() => {
    return posts.save().catch(() => {
      assert.ok(true, 'save operation was rejected');
    });
  });
});

test("Retry is allowed in a failure handler", function(assert) {
  run(() => {
    env.store.createRecord('post', { title: 'Hello' });
    env.store.createRecord('post', { title: 'World' });
  });

  let posts = env.store.peekAll('post');

  let count = 0;
  let id = 1;

  env.adapter.createRecord = function(store, type, snapshot) {
    if (count++ === 0) {
      return reject();
    } else {
      return resolve({ data: { id: id++, type: 'post' } });
    }
  };

  env.adapter.updateRecord = function(store, type, snapshot) {
    return resolve({ data: { id: snapshot.id, type: 'post' } });
  };

  return run(() => {
    return posts.save()
      .catch(() => posts.save())
      .then(post => {
        // the ID here is '2' because the second post saves on the first attempt,
        // while the first post saves on the second attempt
        assert.equal(posts.get('firstObject.id'), '2', "The post ID made it through");
      });
  });
});

test("Collection will reject save on invalid", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.createRecord('post', { title: 'Hello' });
    env.store.createRecord('post', { title: 'World' });
  });

  let posts = env.store.peekAll('post');

  env.adapter.createRecord = function(store, type, snapshot) {
    return reject({ title: 'invalid' });
  };

  return run(() => {
    return posts.save().catch(() => {
      assert.ok(true, 'save operation was rejected');
    });
  });
});
