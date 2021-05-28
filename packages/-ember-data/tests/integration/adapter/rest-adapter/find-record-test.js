import Pretender from 'pretender';
import { module, test } from 'qunit';

import { assign } from '@ember/polyfills';

import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr } from '@ember-data/model';
import RESTSerializer from '@ember-data/serializer/rest';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

import { ajaxResponse } from './-ajax-mocks';

let server;

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
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, { posts: [{ id: '1', name: 'Rails is omakase' }] });
    const post = await store.findRecord('post', '1');
    const { passedUrl, passedVerb, passedHash } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, {});

    assert.strictEqual(post.get('id'), '1');
    assert.strictEqual(post.get('name'), 'Rails is omakase');
  });

  // Ok Identifier tests
  [
    { withType: true, withId: true, desc: 'type and id' },
    { withType: true, withId: true, desc: 'type, id and lid' },
    {
      withType: true,
      withLid: true,
      desc: 'type and lid',
    },
    {
      withType: true,
      withLid: true,
      extra: { id: null },
      desc: 'type, null id, and lid',
    },
  ].forEach(({ withType, withId, withLid, extra, desc }) => {
    test(`findRecord - basic payload (${desc})`, async function (assert) {
      const Post = Model.extend({
        name: attr('string'),
      });
      this.owner.register('model:post', Post);
      this.owner.register('adapter:application', RESTAdapter.extend());
      this.owner.register('serializer:application', RESTSerializer.extend());

      let id = '1';
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');
      const ajaxCallback = ajaxResponse(adapter, { posts: [{ id, name: 'Rails is omakase' }] });

      const findRecordArgs = Object.create(null);
      if (withType) {
        findRecordArgs.type = 'post';
      }
      if (withId) {
        findRecordArgs.id = id;
      }
      if (withLid) {
        // create the identifier without creating a record
        const identifier = store.identifierCache.getOrCreateRecordIdentifier({ ...findRecordArgs, id });
        findRecordArgs.lid = identifier.lid;
      }
      if (extra) {
        assign(findRecordArgs, extra);
      }

      const post = await store.findRecord(findRecordArgs);
      const { passedUrl, passedVerb, passedHash } = ajaxCallback();

      assert.strictEqual(passedUrl, '/posts/1');
      assert.strictEqual(passedVerb, 'GET');
      assert.deepEqual(passedHash.data, {});

      assert.strictEqual(post.get('id'), '1');
      assert.strictEqual(post.get('name'), 'Rails is omakase');
    });
  });

  // Error Identifier Tests
  [
    {
      withType: true,
      extra: { id: null },
      desc: 'type and no id',
      errorMsg: 'Assertion Failed: Expected an identifier object with (type and id) or lid',
    },
  ].forEach(({ withType, withLid, extra, desc, errorMsg }) => {
    testInDebug(`findRecord - will assert with (${desc})`, async function (assert) {
      const Post = Model.extend({
        name: attr('string'),
      });
      this.owner.register('model:post', Post);
      this.owner.register('adapter:application', RESTAdapter.extend());
      this.owner.register('serializer:application', RESTSerializer.extend());

      const store = this.owner.lookup('service:store');
      const findRecordArgs = Object.create(null);
      if (withType) {
        findRecordArgs.type = 'post';
      }
      if (withLid) {
        // create the identifier without creating a record
        const identifier = store.identifierCache.getOrCreateRecordIdentifier({ ...findRecordArgs, id: '1' });
        findRecordArgs.lid = identifier.lid;
      }
      if (extra) {
        assign(findRecordArgs, extra);
      }

      assert.expectAssertion(async () => {
        await store.findRecord(findRecordArgs);
      }, errorMsg);
    });
  });

  test('findRecord - passes buildURL a requestType', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    const Comment = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, { posts: [{ id: '1', name: 'Rails is omakase' }] });

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

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, { post: { id: '1', name: 'Rails is omakase' } });

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

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, {
      posts: [
        { id: '1', name: 'Rails is omakase' },
        { id: '2', name: 'The Parley Letter' },
      ],
    });

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

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, {
      posts: [{ id: 1, name: 'Rails is omakase' }],
      comments: [{ id: 1, name: 'FIRST' }],
    });

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

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, { posts: [{ _ID_: '1', name: 'Rails is omakase' }] });

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
      createdAt: attr('number'),
    });
    const Comment = Model.extend({
      name: attr('string'),
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

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, {
      posts: [{ id: '1', _NAME_: 'Rails is omakase', _CREATED_AT_: 2013 }],
    });

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

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const ajaxCallback = ajaxResponse(adapter, {
      post: { id: '1', name: 'Rails is very expensive sushi' },
    });

    await store.findRecord('post', 1, { include: 'comments' });

    const { passedHash } = ajaxCallback();

    assert.deepEqual(passedHash.data, { include: 'comments' }, '`include` parameter sent to adapter.ajax');
  });
});
