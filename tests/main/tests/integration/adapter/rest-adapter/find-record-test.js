import Pretender from 'pretender';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr } from '@ember-data/model';
import RESTSerializer from '@ember-data/serializer/rest';
import { recordIdentifierFor } from '@ember-data/store';
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

    assert.strictEqual(post.id, '1');
    assert.strictEqual(post.name, 'Rails is omakase');
  });

  // Ok Identifier tests
  [
    { withType: true, withId: true, desc: 'type and id' },
    { withType: true, withId: true, withLid: true, desc: 'type, id and lid' },
    {
      withType: true,
      withLid: true,
      desc: 'type and lid',
    },
    {
      withLid: true,
      desc: 'lid only',
    },
    {
      withLid: true,
      withOptions: true,
      desc: 'lid only and options',
    },
    {
      withType: true,
      withLid: true,
      withOptions: true,
      desc: 'type lid and options',
    },
  ].forEach(({ withType, withId, withLid, withOptions, desc }) => {
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
        const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'post', id });
        findRecordArgs.lid = identifier.lid;
      }

      let post;
      if (withOptions) {
        post = await store.findRecord(findRecordArgs, {});
      } else {
        post = await store.findRecord(findRecordArgs);
      }
      const { passedUrl, passedVerb, passedHash } = ajaxCallback();

      assert.strictEqual(passedUrl, '/posts/1');
      assert.strictEqual(passedVerb, 'GET');
      assert.deepEqual(passedHash.data, {});

      assert.strictEqual(post.id, '1');
      assert.strictEqual(post.name, 'Rails is omakase');

      // stress tests
      let peekPost = store.peekRecord(findRecordArgs);
      assert.strictEqual(peekPost, post, 'peekRecord returns same post');

      let recordReference = store.getReference(findRecordArgs);
      assert.strictEqual(recordReference.remoteType(), 'identity');
      assert.strictEqual(recordReference.type, 'post');
      assert.strictEqual(recordReference.id(), '1');
    });
  });

  test(`findRecord - will succeed for an un-fetchable record if no request is needed and the record exists`, async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    this.owner.register('model:post', Post);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    // create record locally so no fetch is needed
    const record = store.createRecord('post');
    const identifier = recordIdentifierFor(record);

    const foundPost = await store.findRecord(identifier, { reload: false, backgroundReload: false });
    assert.strictEqual(record, foundPost, 'We were able to findRecord');

    // stress tests
    let peekPost = store.peekRecord(identifier);
    assert.strictEqual(peekPost, foundPost, 'peekRecord returns same post');

    let recordReference = store.getReference(identifier);
    assert.strictEqual(recordReference.remoteType(), 'identity');
    assert.strictEqual(recordReference.type, 'post');
    assert.strictEqual(recordReference.id(), null);
  });

  // Error Identifier Tests
  testInDebug(
    `findRecord - will assert when the identifier is un-fetchable and a request is needed (no record at all)`,
    async function (assert) {
      const Post = Model.extend({
        name: attr('string'),
      });
      this.owner.register('model:post', Post);
      this.owner.register('adapter:application', RESTAdapter.extend());
      this.owner.register('serializer:application', RESTSerializer.extend());

      const store = this.owner.lookup('service:store');
      // create an identifier that is un-fetchable
      const identifier = store.identifierCache.createIdentifierForNewRecord({ type: 'post' });

      assert.expectAssertion(async () => {
        await store.findRecord(identifier);
      }, 'Assertion Failed: Attempted to schedule a fetch for a record without an id.');
    }
  );

  [
    { options: { reload: true, backgroundReload: false }, desc: 'reload true' },
    { options: { reload: false, backgroundReload: true }, desc: 'backgroundReload true' },
    { options: { reload: true, backgroundReload: true }, desc: 'reload true and backgroundReload true' },
  ].forEach(({ options, desc }) => {
    testInDebug(
      `findRecord - will assert when the identifier is un-fetchable and a request is needed (${desc})`,
      async function (assert) {
        const Post = Model.extend({
          name: attr('string'),
        });
        this.owner.register('model:post', Post);
        this.owner.register('adapter:application', RESTAdapter.extend());
        this.owner.register('serializer:application', RESTSerializer.extend());

        const store = this.owner.lookup('service:store');

        // create an record with no id and identifier that is un-fetchable
        const record = store.createRecord('post');
        const identifier = recordIdentifierFor(record);

        assert.expectAssertion(async () => {
          await store.findRecord(identifier, options);
        }, 'Assertion Failed: Attempted to schedule a fetch for a record without an id.');
      }
    );
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
    assert.strictEqual(post.id, '1');
    assert.strictEqual(post.name, 'Rails is omakase');
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

    assert.strictEqual(post.id, '1');
    assert.strictEqual(post.name, 'Rails is omakase');

    const post2 = await store.peekRecord('post', '2');

    assert.strictEqual(post2.id, '2');
    assert.strictEqual(post2.name, 'The Parley Letter');
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
      posts: [{ id: '1', name: 'Rails is omakase' }],
      comments: [{ id: '1', name: 'FIRST' }],
    });

    const post = await store.findRecord('post', '1');

    const { passedUrl, passedVerb, passedHash } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, {});
    assert.strictEqual(post.id, '1');
    assert.strictEqual(post.name, 'Rails is omakase');

    const comment = await store.peekRecord('comment', '1');

    assert.strictEqual(comment.id, '1');
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
    assert.strictEqual(post.id, '1');
    assert.strictEqual(post.name, 'Rails is omakase');
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
    assert.strictEqual(post.id, '1');
    assert.strictEqual(post.name, 'Rails is omakase');
    assert.strictEqual(post.createdAt, 2013);
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
