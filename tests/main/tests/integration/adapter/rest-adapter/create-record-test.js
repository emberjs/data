import Pretender from 'pretender';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import RESTSerializer from '@ember-data/serializer/rest';

import { ajaxResponse } from './-ajax-mocks';

let server;

module('integration/adapter/rest_adapter - REST Adapter - createRecord', function (hooks) {
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

  test('createRecord - an empty payload is a basic success if an id was specified', async function (assert) {
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
    const ajaxCallback = ajaxResponse(adapter);
    const post = store.createRecord('post', { id: 'some-uuid', name: 'The Parley Letter' });

    await post.save();

    const { passedHash, passedUrl, passedVerb } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts');
    assert.strictEqual(passedVerb, 'POST');
    assert.deepEqual(passedHash.data, { post: { id: 'some-uuid', name: 'The Parley Letter' } });

    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.strictEqual(post.name, 'The Parley Letter', 'the post was updated');
  });

  test('createRecord - passes buildURL the requestType', async function (assert) {
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

    adapter.buildURL = function (_type, _id, _snapshot, requestType) {
      return '/post/' + requestType;
    };

    const ajaxCallback = ajaxResponse(adapter);
    const post = store.createRecord('post', { id: 'some-uuid', name: 'The Parley Letter' });

    await post.save();

    const { passedUrl } = ajaxCallback();

    assert.strictEqual(passedUrl, '/post/createRecord');
  });

  test('createRecord - a payload with a new ID and data applies the updates', async function (assert) {
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
    const ajaxCallback = ajaxResponse(adapter, { posts: [{ id: '1', name: 'Dat Parley Letter' }] });
    const post = store.createRecord('post', { name: 'The Parley Letter' });

    await post.save();

    const { passedHash, passedUrl, passedVerb } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts');
    assert.strictEqual(passedVerb, 'POST');
    assert.deepEqual(passedHash.data, { post: { name: 'The Parley Letter' } });

    assert.strictEqual(post.id, '1', 'the post has the updated ID');
    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.strictEqual(post.name, 'Dat Parley Letter', 'the post was updated');
  });

  test('createRecord - a payload with a new ID and data applies the updates (with legacy singular name)', async function (assert) {
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
    const ajaxCallback = ajaxResponse(adapter, { post: { id: '1', name: 'Dat Parley Letter' } });
    const post = store.createRecord('post', { name: 'The Parley Letter' });

    await post.save();

    const { passedHash, passedUrl, passedVerb } = ajaxCallback();

    assert.strictEqual(passedUrl, '/posts');
    assert.strictEqual(passedVerb, 'POST');
    assert.deepEqual(passedHash.data, { post: { name: 'The Parley Letter' } });

    assert.strictEqual(post.id, '1', 'the post has the updated ID');
    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.strictEqual(post.name, 'Dat Parley Letter', 'the post was updated');
  });

  test("createRecord - findMany doesn't overwrite owner", async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
      comments: hasMany('comment', { async: true, inverse: 'post' }),
    });
    const Comment = Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false, inverse: 'comments' }),
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    ajaxResponse(adapter, { comment: { id: '1', name: 'Dat Parley Letter', post: 1 } });

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            data: [],
          },
        },
      },
    });

    const post = store.peekRecord('post', 1);
    const comment = store.createRecord('comment', { name: 'The Parley Letter' });

    const comments = await post.comments;
    comments.push(comment);

    assert.strictEqual(comment.post, post, 'the post has been set correctly');

    await comment.save();

    assert.false(comment.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.strictEqual(comment.name, 'Dat Parley Letter', 'the post was updated');
    assert.strictEqual(comment.post, post, 'the post is still set');
  });

  test("createRecord - a serializer's primary key and attributes are consulted when building the payload", async function (assert) {
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

    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        primaryKey: '_id_',

        attrs: {
          name: '_name_',
        },
      })
    );

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter);
    const post = store.createRecord('post', { id: 'some-uuid', name: 'The Parley Letter' });

    await post.save();

    const { passedHash } = ajaxCallback();

    assert.deepEqual(passedHash.data, {
      post: { _id_: 'some-uuid', _name_: 'The Parley Letter' },
    });
  });

  test("createRecord - a serializer's attributes are consulted when building the payload if no id is pre-defined", async function (assert) {
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

    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        attrs: {
          name: '_name_',
        },
      })
    );

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter, {
      post: { _name_: 'The Parley Letter', id: '1' },
    });
    const post = store.createRecord('post', { name: 'The Parley Letter' });

    await post.save();

    const { passedHash } = ajaxCallback();

    assert.deepEqual(passedHash.data, { post: { _name_: 'The Parley Letter' } });
  });

  test("createRecord - a serializer's attribute mapping takes precedence over keyForAttribute when building the payload", async function (assert) {
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

    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        attrs: {
          name: 'given_name',
        },

        keyForAttribute(attr) {
          return attr.toUpperCase();
        },
      })
    );

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter);
    const post = store.createRecord('post', { id: 'some-uuid', name: 'The Parley Letter' });

    await post.save();

    const { passedHash } = ajaxCallback();

    assert.deepEqual(passedHash.data, {
      post: { given_name: 'The Parley Letter', id: 'some-uuid' },
    });
  });

  test("createRecord - a serializer's attribute mapping takes precedence over keyForRelationship (belongsTo) when building the payload", async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
    });
    const Comment = Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false, inverse: null }),
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    this.owner.register(
      'serializer:comment',
      RESTSerializer.extend({
        attrs: {
          post: 'article',
        },

        keyForRelationship(attr, _kind) {
          return attr.toUpperCase();
        },
      })
    );

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter);
    const post = store.createRecord('post', { id: 'a-post-id', name: 'The Parley Letter' });
    const comment = store.createRecord('comment', {
      id: 'some-uuid',
      name: 'Letters are fun',
      post: post,
    });

    await comment.save();

    const { passedHash } = ajaxCallback();

    assert.deepEqual(passedHash.data, {
      comment: { article: 'a-post-id', id: 'some-uuid', name: 'Letters are fun' },
    });
  });

  test("createRecord - a serializer's attribute mapping takes precedence over keyForRelationship (hasMany) when building the payload", async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
      comments: hasMany('comment', { async: false, inverse: null }),
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
          comments: 'opinions',
        },

        keyForRelationship(attr, _kind) {
          return attr.toUpperCase();
        },
      })
    );

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const ajaxCallback = ajaxResponse(adapter);
    const comment = store.createRecord('comment', { id: 'a-comment-id', name: 'First!' });
    const post = store.createRecord('post', {
      id: 'some-uuid',
      name: 'The Parley Letter',
      comments: [comment],
    });

    await post.save();

    const { passedHash } = ajaxCallback();

    assert.deepEqual(passedHash.data, {
      post: { opinions: ['a-comment-id'], id: 'some-uuid', name: 'The Parley Letter' },
    });
  });

  test('createRecord - a record on the many side of a hasMany relationship should update relationships when data is sideloaded', async function (assert) {
    assert.expect(3);

    const Post = Model.extend({
      name: attr('string'),
      comments: hasMany('comment', { async: false, inverse: 'post' }),
    });
    const Comment = Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false, inverse: 'comments' }),
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    ajaxResponse(adapter, {
      posts: [
        {
          id: '1',
          name: 'Rails is omakase',
          comments: [1, 2],
        },
      ],
      comments: [
        {
          id: '2',
          name: 'Another Comment',
          post: '1',
        },
        {
          id: '1',
          name: 'Dat Parley Letter',
          post: '1',
        },
      ],
    });

    const post = store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            data: [{ type: 'comment', id: '1' }],
          },
        },
      },
    });
    store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          name: 'Dat Parlay Letter',
        },
        relationships: {
          post: {
            data: { type: 'post', id: '1' },
          },
        },
      },
    });

    const commentCount = post.comments.length;
    assert.strictEqual(commentCount, 1, 'the post starts life with a comment');

    let comment = store.createRecord('comment', { name: 'Another Comment', post: post });
    await comment.save();
    assert.strictEqual(comment.post, post, 'the comment is related to the post');

    await post.reload();
    assert.strictEqual(post.comments.length, 2, 'Post comment count has been updated');
  });

  test('createRecord - sideloaded belongsTo relationships are both marked as loaded', async function (assert) {
    assert.expect(4);

    const Post = Model.extend({
      name: attr('string'),
      comment: belongsTo('comment', { async: false, inverse: 'post' }),
    });
    const Comment = Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false, inverse: 'comment' }),
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    ajaxResponse(adapter, {
      posts: [{ id: '1', comment: '1', name: 'marked' }],
      comments: [{ id: '1', post: '1', name: 'Comcast is a bargain' }],
    });

    const post = store.createRecord('post', { name: 'man' });
    const record = await post.save();

    assert.true(store.peekRecord('post', '1').comment.isLoaded, "post's comment isLoaded (via store)");
    assert.true(store.peekRecord('comment', '1').post.isLoaded, "comment's post isLoaded (via store)");
    assert.true(record.comment.isLoaded, "post's comment isLoaded (via record)");
    assert.true(record.get('comment.post.isLoaded'), "post's comment's post isLoaded (via record)");
  });

  test("createRecord - response can contain relationships the client doesn't yet know about", async function (assert) {
    assert.expect(3); // while recorlength is 2, we are getting 4 assertions

    const Post = Model.extend({
      name: attr('string'),
      comments: hasMany('comment', { async: false, inverse: 'post' }),
    });
    const Comment = Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false, inverse: 'comments' }),
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    ajaxResponse(adapter, {
      posts: [
        {
          id: '1',
          name: 'Rails is omakase',
          comments: ['2'],
        },
      ],
      comments: [
        {
          id: '2',
          name: 'Another Comment',
          post: '1',
        },
      ],
    });

    const post = store.createRecord('post', { name: 'Rails is omakase' });

    await post.save();

    assert.strictEqual(post.comments.at(0).post, post, 'the comments are related to the correct post model');

    assert.strictEqual(
      post.comments.at(0).post,
      store.peekRecord('post', '1'),
      'The record object in the store is the same object related to the comment'
    );

    assert.strictEqual(store.peekAll('post').length, 1, 'There should only be one post record in the store');
  });

  test('createRecord - relationships are not duplicated', async function (assert) {
    const Post = Model.extend({
      name: attr('string'),
      comments: hasMany('comment', { async: false, inverse: 'post' }),
    });
    const Comment = Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false, inverse: 'comments' }),
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const post = store.createRecord('post', { name: 'Tomtomhuda' });
    const comment = store.createRecord('comment', { id: '2', name: 'Comment title' });

    ajaxResponse(adapter, { post: [{ id: '1', name: 'Rails is omakase', comments: [] }] });

    await post.save();

    assert.strictEqual(post.comments.length, 0, 'post has 0 comments');

    post.comments.push(comment);

    assert.strictEqual(post.comments.length, 1, 'post has 1 comment');

    ajaxResponse(adapter, {
      post: [{ id: '1', name: 'Rails is omakase', comments: [2] }],
      comments: [{ id: '2', name: 'Comment title' }],
    });

    await post.save();

    assert.strictEqual(post.comments.length, 1, 'post has 1 comment');
  });
});
