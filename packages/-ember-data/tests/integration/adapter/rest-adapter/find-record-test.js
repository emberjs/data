import Pretender from 'pretender';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import RESTAdapter from '@ember-data/adapter/rest';
import RESTSerializer from '@ember-data/serializer/rest';
import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';
import { resolve } from 'rsvp';
import Model, { attr } from '@ember-data/model';

let server;

/**
 * @description Helper function to mock the response of an adapter in order to
 * Test is behaviour.
 * @param { adapter } RESTAdapter instance
 * @param { response } Response to return from the adapter
 * @returns { ajaxCallback } Function that returns information about the last
 * call to the ajax method of the adapter.
 */
function ajaxResponse(adapter, value) {
  let passedUrl = null;
  let passedVerb = null;
  let passedHash = null;

  adapter._fetchRequest = (hash) => {
    passedHash = hash;
    passedUrl = passedHash.url;
    passedVerb = passedHash.method;
    return resolve({
      text() {
        return resolve(JSON.stringify(deepCopy(value)));
      },
      ok: true,
      status: 200,
    });
  };

  adapter.ajax = (url, verb, hash) => {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return resolve(deepCopy(value));
  };

  return () => { return { passedUrl, passedVerb, passedHash } };
}

module('integration/adapter/rest_adapter - REST Adapter - findRecord', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    server = new Pretender();
  });

  hooks.afterEach(function () {
    if (server) {
      server.shutdown();
      server = null;
    }
  });

  test('findRecord - basic payload', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    const Comment = Model.extend({
      name: attr('string'),
    });
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, { posts: [{ id: '1', name: 'Rails is omakase' }] });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const post = await store.findRecord('post', '1');
    const { passedUrl, passedVerb, passedHash } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, {});

    assert.strictEqual(post.get('id'), '1');
    assert.strictEqual(post.get('name'), 'Rails is omakase');
  });

  test('findRecord - passes buildURL a requestType', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    const Comment = Model.extend({
      name: attr('string'),
    });
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, { posts: [{ id: '1', name: 'Rails is omakase' }] });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    adapter.buildURL = function (_type, id, _snapshot, requestType) {
      return '/' + requestType + '/post/' + id;
    };

    await store.findRecord('post', '1');

    const { passedUrl } = ajaxCallback();

    assert.strictEqual(passedUrl, '/findRecord/post/1');
  });

  test('findRecord - basic payload (with legacy singular name)', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    const Comment = Model.extend({
      name: attr('string'),
    });
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, { post: { id: '1', name: 'Rails is omakase' } });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const post = await store.findRecord('post', '1');

    const { passedUrl, passedVerb, passedHash } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, {});
    assert.strictEqual(post.get('id'), '1');
    assert.strictEqual(post.get('name'), 'Rails is omakase');
  });

  test('findRecord - payload with sideloaded records of the same type', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    const Comment = Model.extend({
      name: attr('string'),
    });
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, {
      posts: [
        { id: '1', name: 'Rails is omakase' },
        { id: '2', name: 'The Parley Letter' },
      ],
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const post = await store.findRecord('post', '1');

    const { passedUrl, passedVerb, passedHash } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, {});

    assert.strictEqual(post.get('id'), '1');
    assert.strictEqual(post.get('name'), 'Rails is omakase');

    const post2 = await store.peekRecord('post', '2');

    assert.strictEqual(post2.get('id'), '2');
    assert.strictEqual(post2.get('name'), 'The Parley Letter');
  });

  test('findRecord - payload with sideloaded records of a different type', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    const Comment = Model.extend({
      name: attr('string'),
    });
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, {
      posts: [{ id: 1, name: 'Rails is omakase' }],
      comments: [{ id: 1, name: 'FIRST' }],
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const post = await store.findRecord('post', '1');

    const { passedUrl, passedVerb, passedHash } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, {});
    assert.strictEqual(post.get('id'), '1');
    assert.strictEqual(post.get('name'), 'Rails is omakase');

    const comment = await store.peekRecord('comment', '1');

    assert.strictEqual(comment.get('id'), '1');
  });

  test('findRecord - payload with an serializer-specified primary key', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    const Comment = Model.extend({
      name: attr('string'),
    });
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, { posts: [{ _ID_: '1', name: 'Rails is omakase' }] });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        primaryKey: '_ID_',
      })
    );

    const post = await store.findRecord('post', '1');

    const { passedUrl, passedVerb, passedHash } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, {});
    assert.strictEqual(post.get('id'), '1');
    assert.strictEqual(post.get('name'), 'Rails is omakase');
  });

  test('findRecord - payload with a serializer-specified attribute mapping', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
      createdAt: attr('number')
    });
    const Comment = Model.extend({
      name: attr('string'),
    });
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, {
      posts: [
        { id: '1', _NAME_: 'Rails is omakase', _CREATED_AT_: 2013 }
      ]
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());
    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        attrs: {
          name: '_NAME_',
          createdAt: { key: '_CREATED_AT_', someOtherOption: 'option' },
        },
      })
    );
    this.owner.register('model:post', Post);

    const post = await store.findRecord('post', '1');

    const { passedUrl, passedVerb, passedHash } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, {});
    assert.strictEqual(post.get('id'), '1');
    assert.strictEqual(post.get('name'), 'Rails is omakase');
    assert.strictEqual(post.get('createdAt'), 2013);
  });

  test('findRecord - passes `include` as a query parameter to ajax', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    const Comment = Model.extend({
      name: attr('string'),
    });
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const ajaxCallback = ajaxResponse(adapter, {
      post: { id: '1', name: 'Rails is very expensive sushi' },
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    await store.findRecord('post', 1, { include: 'comments' });

    const { passedHash } = ajaxCallback();

    assert.deepEqual(passedHash.data, { include: 'comments' }, '`include` parameter sent to adapter.ajax');
  });
});
