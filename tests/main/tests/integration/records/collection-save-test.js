import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/records/collection_save - Save Collection of Records', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Post = Model.extend({
      title: attr('string'),
    });

    this.owner.register('model:post', Post);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('Collection will resolve save on success', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    let id = 1;

    store.createRecord('post', { title: 'Hello' });
    store.createRecord('post', { title: 'World' });

    const posts = store.peekAll('post');

    adapter.createRecord = function (store, type, snapshot) {
      return Promise.resolve({ data: { id: id++, type: 'post' } });
    };

    await posts.save().then(() => {
      assert.ok(true, 'save operation was resolved');
    });
  });

  test('Collection will reject save on error', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    store.createRecord('post', { title: 'Hello' });
    store.createRecord('post', { title: 'World' });

    const posts = store.peekAll('post');

    adapter.createRecord = function (store, type, snapshot) {
      return Promise.reject();
    };

    try {
      await posts.save();
      assert.ok(false, 'should error');
    } catch {
      assert.ok(true, 'save operation was rejected');
    }
  });

  test('Retry is allowed in a failure handler', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    store.createRecord('post', { title: 'Hello' });
    store.createRecord('post', { title: 'World' });

    const posts = store.peekAll('post');

    let count = 0;
    let id = 1;

    adapter.createRecord = function (store, type, snapshot) {
      if (count++ === 0) {
        return Promise.reject();
      } else {
        return Promise.resolve({ data: { id: id++, type: 'post' } });
      }
    };

    adapter.updateRecord = function (store, type, snapshot) {
      return Promise.resolve({ data: { id: snapshot.id, type: 'post' } });
    };

    await posts
      .save()
      .catch(() => posts.save())
      .then((post) => {
        // the ID here is '2' because the second post saves on the first attempt,
        // while the first post saves on the second attempt
        assert.strictEqual(posts.at(0).id, '2', 'The post ID made it through');
      });
  });

  test('Collection will reject save on invalid', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    store.createRecord('post', { title: 'Hello' });
    store.createRecord('post', { title: 'World' });

    const posts = store.peekAll('post');

    adapter.createRecord = function (store, type, snapshot) {
      return Promise.reject({ title: 'invalid' });
    };

    await posts.save().catch(() => {
      assert.ok(true, 'save operation was rejected');
    });
  });
});
