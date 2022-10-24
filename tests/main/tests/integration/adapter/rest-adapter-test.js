import { get } from '@ember/object';
import { underscore } from '@ember/string';

import Pretender from 'pretender';
import { module, test } from 'qunit';
import { reject, resolve } from 'rsvp';

import { singularize } from 'ember-inflector';
import { setupTest } from 'ember-qunit';

import AdapterError, {
  AbortError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  UnauthorizedError,
} from '@ember-data/adapter/error';
import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import RESTSerializer from '@ember-data/serializer/rest';
import { recordIdentifierFor } from '@ember-data/store';
import { Snapshot } from '@ember-data/store/-private';
import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

let store, adapter, SuperUser;

let passedUrl, passedVerb, passedHash;
let server;

module('integration/adapter/rest_adapter - REST Adapter', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    SuperUser = Model.extend();

    this.owner.register('model:super-user', SuperUser);

    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    server = new Pretender();
    store = this.owner.lookup('service:store');
    adapter = store.adapterFor('application');

    passedUrl = passedVerb = passedHash = null;
  });

  hooks.afterEach(function () {
    if (server) {
      server.shutdown();
      server = null;
    }
  });

  function ajaxResponse(value) {
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
  }

  function ajaxError(responseText, status = 400, headers = {}) {
    adapter._fetchRequest = () => {
      return resolve({
        text() {
          return resolve(responseText);
        },
        ok: false,
        status,
        headers: new Headers(headers),
      });
    };

    adapter._ajaxRequest = (hash) => {
      let jqXHR = {
        status,
        responseText,
        getAllResponseHeaders() {
          let reducer = (prev, key) => prev + key + ': ' + headers[key] + '\r\n';
          let stringify = (headers) => {
            return Object.keys(headers).reduce(reducer, '');
          };
          return stringify(headers);
        },
      };
      hash.error(jqXHR, responseText);
    };
  }

  function ajaxZero() {
    adapter._fetchRequest = () => {
      return resolve({
        text() {
          return resolve();
        },
        ok: false,
        status: 0,
      });
    };

    adapter._ajaxRequest = function (hash) {
      hash.error({
        status: 0,
        getAllResponseHeaders() {
          return '';
        },
      });
    };
  }

  test('updateRecord - an empty payload is a basic success', async function (assert) {
    class Comment extends Model {
      @attr name;
    }
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: null }) comments;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    let post = store.peekRecord('post', 1);
    ajaxResponse();

    post.set('name', 'The Parley Letter');
    await post.save();
    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'PUT');
    assert.deepEqual(passedHash.data, { post: { name: 'The Parley Letter' } });

    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.strictEqual(post.name, 'The Parley Letter', 'the post was updated');
  });

  test('updateRecord - passes the requestType to buildURL', async function (assert) {
    class Comment extends Model {
      @attr name;
    }
    this.owner.register('model:comment', Comment);
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: null }) comments;
    }
    this.owner.register('model:post', Post);

    adapter.buildURL = function (type, id, snapshot, requestType) {
      return '/posts/' + id + '/' + requestType;
    };
    adapter.shouldBackgroundReloadRecord = () => false;

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    let post = await store.findRecord('post', 1);
    ajaxResponse();

    post.set('name', 'The Parley Letter');
    await post.save();
    assert.strictEqual(passedUrl, '/posts/1/updateRecord');
  });

  test('updateRecord - a payload with updates applies the updates', async function (assert) {
    class Comment extends Model {
      @attr name;
    }
    this.owner.register('model:comment', Comment);
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: null }) comments;
    }
    this.owner.register('model:post', Post);

    adapter.shouldBackgroundReloadRecord = () => false;
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    let post = await store.findRecord('post', 1);
    ajaxResponse({ posts: [{ id: '1', name: 'Dat Parley Letter' }] });

    post.set('name', 'The Parley Letter');
    await post.save();
    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'PUT');
    assert.deepEqual(passedHash.data, { post: { name: 'The Parley Letter' } });

    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.strictEqual(post.name, 'Dat Parley Letter', 'the post was updated');
  });

  test('updateRecord - a payload with updates applies the updates (with legacy singular name)', async function (assert) {
    class Comment extends Model {
      @attr name;
    }
    this.owner.register('model:comment', Comment);
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: null }) comments;
    }
    this.owner.register('model:post', Post);

    adapter.shouldBackgroundReloadRecord = () => false;
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    let post = await store.findRecord('post', 1);
    ajaxResponse({ post: { id: '1', name: 'Dat Parley Letter' } });

    post.set('name', 'The Parley Letter');
    await post.save();
    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'PUT');
    assert.deepEqual(passedHash.data, { post: { name: 'The Parley Letter' } });

    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.strictEqual(post.name, 'Dat Parley Letter', 'the post was updated');
  });

  test('updateRecord - a payload with sideloaded updates pushes the updates', async function (assert) {
    class Comment extends Model {
      @attr name;
    }
    this.owner.register('model:comment', Comment);
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: null }) comments;
    }
    this.owner.register('model:post', Post);

    let post;
    ajaxResponse({
      posts: [{ id: '1', name: 'Dat Parley Letter' }],
      comments: [{ id: '1', name: 'FIRST' }],
    });

    post = store.createRecord('post', { name: 'The Parley Letter' });
    await post.save();
    assert.strictEqual(passedUrl, '/posts');
    assert.strictEqual(passedVerb, 'POST');
    assert.deepEqual(passedHash.data, { post: { name: 'The Parley Letter' } });

    assert.strictEqual(post.id, '1', 'the post has the updated ID');
    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.strictEqual(post.name, 'Dat Parley Letter', 'the post was updated');

    let comment = store.peekRecord('comment', 1);
    assert.strictEqual(comment.name, 'FIRST', 'The comment was sideloaded');
  });

  test('updateRecord - a payload with sideloaded updates pushes the updates', async function (assert) {
    class Comment extends Model {
      @attr name;
    }
    this.owner.register('model:comment', Comment);
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: null }) comments;
    }
    this.owner.register('model:post', Post);

    adapter.shouldBackgroundReloadRecord = () => false;
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    let post = await store.findRecord('post', 1);
    ajaxResponse({
      posts: [{ id: '1', name: 'Dat Parley Letter' }],
      comments: [{ id: '1', name: 'FIRST' }],
    });

    post.set('name', 'The Parley Letter');
    await post.save();
    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'PUT');
    assert.deepEqual(passedHash.data, { post: { name: 'The Parley Letter' } });

    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.strictEqual(post.name, 'Dat Parley Letter', 'the post was updated');

    let comment = store.peekRecord('comment', 1);
    assert.strictEqual(comment.name, 'FIRST', 'The comment was sideloaded');
  });

  test("updateRecord - a serializer's primary key and attributes are consulted when building the payload", async function (assert) {
    class Comment extends Model {
      @attr name;
    }
    this.owner.register('model:comment', Comment);
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: null }) comments;
    }
    this.owner.register('model:post', Post);

    adapter.shouldBackgroundReloadRecord = () => false;
    this.owner.register(
      'serializer:post',
      class extends RESTSerializer {
        primaryKey = '_id_';

        attrs = {
          name: '_name_',
        };
      }
    );

    store.push({
      data: {
        type: 'post',
        id: '1',
        name: 'Rails is omakase',
      },
    });

    ajaxResponse();

    let post = await store.findRecord('post', 1);
    post.set('name', 'The Parley Letter');

    await post.save();

    assert.deepEqual(passedHash.data, { post: { _name_: 'The Parley Letter' } });
  });

  test('updateRecord - hasMany relationships faithfully reflect simultaneous adds and removes', async function (assert) {
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);

    adapter.shouldBackgroundReloadRecord = () => false;

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Not everyone uses Rails',
        },
        relationships: {
          comments: {
            data: [{ type: 'comment', id: '1' }],
          },
        },
      },
      included: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            name: 'Rails is omakase',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            name: 'Yes. Yes it is.',
          },
        },
      ],
    });

    ajaxResponse({
      posts: { id: '1', name: 'Not everyone uses Rails', comments: [2] },
    });

    await store.findRecord('comment', 2);
    let post = await store.findRecord('post', 1);
    let newComment = store.peekRecord('comment', 2);
    let comments = post.comments;

    // Replace the comment with a new one
    comments.pop();
    comments.push(newComment);

    await post.save();
    assert.strictEqual(post.comments.length, 1, 'the post has the correct number of comments');
    assert.strictEqual(post.comments.at(0).name, 'Yes. Yes it is.', 'the post has the correct comment');
  });

  test('updateRecord - hasMany relationships faithfully reflect removal from response', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Not everyone uses Rails',
        },
        relationships: {
          comments: {
            data: [{ type: 'comment', id: '1' }],
          },
        },
      },
      included: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            name: 'Rails is omakase',
          },
        },
      ],
    });

    ajaxResponse({
      posts: { id: '1', name: 'Everyone uses Rails', comments: [] },
    });

    let post = await store.peekRecord('post', 1);
    assert.strictEqual(post.comments.length, 1, 'the post has one comment');
    post.set('name', 'Everyone uses Rails');

    post = await post.save();

    assert.strictEqual(post.comments.length, 0, 'the post has the no comments');
  });

  test('updateRecord - hasMany relationships set locally will be removed with empty response', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:comment', Comment);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Not everyone uses Rails',
        },
      },
    });

    store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    ajaxResponse({
      posts: { id: '1', name: 'Everyone uses Rails', comments: [] },
    });

    let post = await store.peekRecord('post', 1);
    let comment = await store.peekRecord('comment', 1);
    let comments = post.comments;
    comments.push(comment);
    assert.strictEqual(post.comments.length, 1, 'the post has one comment');

    post = await post.save();

    assert.strictEqual(post.comments.length, 0, 'the post has the no comments');
  });

  test('deleteRecord - an empty payload is a basic success', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.shouldBackgroundReloadRecord = () => false;
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    let post = await store.findRecord('post', 1);
    ajaxResponse();

    post.deleteRecord();
    await post.save();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'DELETE');
    assert.strictEqual(passedHash, undefined);

    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.true(post.isDeleted, 'the post is now deleted');
  });

  test('deleteRecord - passes the requestType to buildURL', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.buildURL = function (type, id, snapshot, requestType) {
      return '/posts/' + id + '/' + requestType;
    };

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    let post = await store.findRecord('post', 1);
    ajaxResponse();

    post.deleteRecord();
    await post.save();

    assert.strictEqual(passedUrl, '/posts/1/deleteRecord');
  });

  test('deleteRecord - a payload with sideloaded updates pushes the updates', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.shouldBackgroundReloadRecord = () => false;
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    let post = await store.findRecord('post', 1);
    ajaxResponse({ comments: [{ id: '1', name: 'FIRST' }] });

    post.deleteRecord();
    await post.save();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'DELETE');
    assert.strictEqual(passedHash, undefined);

    assert.false(post.hasDirtyAttributes, "the post isn't dirty anymore");
    assert.true(post.isDeleted, 'the post is now deleted');

    let comment = store.peekRecord('comment', 1);
    assert.strictEqual(comment.name, 'FIRST', 'The comment was sideloaded');
  });

  test('deleteRecord - a payload with sidloaded updates pushes the updates when the original record is omitted', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.shouldBackgroundReloadRecord = () => false;
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
      },
    });

    let post = await store.findRecord('post', 1);
    ajaxResponse({ posts: [{ id: '2', name: 'The Parley Letter' }] });

    post.deleteRecord();
    await post.save();

    assert.strictEqual(passedUrl, '/posts/1');
    assert.strictEqual(passedVerb, 'DELETE');
    assert.strictEqual(passedHash, undefined);

    assert.false(post.hasDirtyAttributes, "the original post isn't dirty anymore");
    assert.true(post.isDeleted, 'the original post is now deleted');

    let newPost = store.peekRecord('post', 2);
    assert.strictEqual(newPost.name, 'The Parley Letter', 'The new post was added to the store');
  });

  test('deleteRecord - deleting a newly created record should not throw an error', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    let post = store.createRecord('post');
    let identifier = recordIdentifierFor(post);

    post.deleteRecord();
    await post.save();

    assert.true(post.isDeleted, 'the post is now deleted');
    assert.false(post.isError, 'the post is not an error');
    assert.strictEqual(passedUrl, null, 'There is no ajax call to delete a record that has never been saved.');
    assert.strictEqual(passedVerb, null, 'There is no ajax call to delete a record that has never been saved.');
    assert.strictEqual(passedHash, null, 'There is no ajax call to delete a record that has never been saved.');

    const isLoaded = store._instanceCache.recordIsLoaded(identifier);
    assert.false(isLoaded, 'the post is now deleted');
  });

  test('findAll - returning an array populates the array', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      posts: [
        { id: '1', name: 'Rails is omakase' },
        { id: '2', name: 'The Parley Letter' },
      ],
    });

    let posts = await store.findAll('post');
    assert.strictEqual(passedUrl, '/posts');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, {});

    let post1 = store.peekRecord('post', 1);
    let post2 = store.peekRecord('post', 2);

    assert.deepEqual(post1.getProperties('id', 'name'), { id: '1', name: 'Rails is omakase' }, 'Post 1 is loaded');

    assert.deepEqual(post2.getProperties('id', 'name'), { id: '2', name: 'The Parley Letter' }, 'Post 2 is loaded');

    assert.strictEqual(posts.length, 2, 'The posts are in the array');
    assert.true(posts.isLoaded, 'The RecordArray is loaded');
    assert.deepEqual(posts.slice(), [post1, post2], 'The correct records are in the array');
  });

  test('findAll - passes buildURL the requestType and snapshot', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    assert.expect(2);
    let adapterOptionsStub = { stub: true };
    adapter.buildURL = function (type, id, snapshot, requestType) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptionsStub);
      return '/' + requestType + '/posts';
    };

    ajaxResponse({
      posts: [
        { id: '1', name: 'Rails is omakase' },
        { id: '2', name: 'The Parley Letter' },
      ],
    });

    await store.findAll('post', { adapterOptions: adapterOptionsStub });
    assert.strictEqual(passedUrl, '/findAll/posts');
  });

  test('findAll - passed `include` as a query parameter to ajax', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      posts: [{ id: '1', name: 'Rails is very expensive sushi' }],
    });

    await store.findAll('post', { include: 'comments' });
    assert.deepEqual(passedHash.data, { include: 'comments' }, '`include` params sent to adapter.ajax');
  });

  test('findAll - returning sideloaded data loads the data', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      posts: [
        { id: '1', name: 'Rails is omakase' },
        { id: '2', name: 'The Parley Letter' },
      ],
      comments: [{ id: '1', name: 'FIRST' }],
    });

    await store.findAll('post');

    let comment = store.peekRecord('comment', '1');
    assert.deepEqual(comment.getProperties('id', 'name'), { id: '1', name: 'FIRST' });
  });

  test('findAll - data is normalized through custom serializers', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      class extends RESTSerializer {
        primaryKey = '_ID_';
        attrs = { name: '_NAME_' };
      }
    );

    ajaxResponse({
      posts: [
        { _ID_: 1, _NAME_: 'Rails is omakase' },
        { _ID_: 2, _NAME_: 'The Parley Letter' },
      ],
    });

    let posts = await store.findAll('post');
    let post1 = store.peekRecord('post', 1);
    let post2 = store.peekRecord('post', 2);

    assert.deepEqual(post1.getProperties('id', 'name'), { id: '1', name: 'Rails is omakase' }, 'Post 1 is loaded');
    assert.deepEqual(post2.getProperties('id', 'name'), { id: '2', name: 'The Parley Letter' }, 'Post 2 is loaded');

    assert.strictEqual(posts.length, 2, 'The posts are in the array');
    assert.true(posts.isLoaded, 'The RecordArray is loaded');
    assert.deepEqual(posts.slice(), [post1, post2], 'The correct records are in the array');
  });

  test('query - if `sortQueryParams` option is not provided, query params are sorted alphabetically', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      posts: [{ id: '1', name: 'Rails is very expensive sushi' }],
    });

    await store.query('post', { params: 1, in: 2, wrong: 3, order: 4 });
    assert.deepEqual(
      Object.keys(passedHash.data),
      ['in', 'order', 'params', 'wrong'],
      'query params are received in alphabetical order'
    );
  });

  test('query - passes buildURL the requestType', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.buildURL = function (type, id, snapshot, requestType) {
      return '/' + requestType + '/posts';
    };

    ajaxResponse({
      posts: [{ id: '1', name: 'Rails is very expensive sushi' }],
    });

    await store.query('post', { params: 1, in: 2, wrong: 3, order: 4 });
    assert.strictEqual(passedUrl, '/query/posts');
  });

  test('query - if `sortQueryParams` is falsey, query params are not sorted at all', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      posts: [{ id: '1', name: 'Rails is very expensive sushi' }],
    });

    adapter.sortQueryParams = null;

    await store.query('post', { params: 1, in: 2, wrong: 3, order: 4 });
    assert.deepEqual(
      Object.keys(passedHash.data),
      ['params', 'in', 'wrong', 'order'],
      'query params are received in their original order'
    );
  });

  test('query - if `sortQueryParams` is a custom function, query params passed through that function', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      posts: [{ id: '1', name: 'Rails is very expensive sushi' }],
    });

    adapter.sortQueryParams = function (obj) {
      let sortedKeys = Object.keys(obj).sort().reverse();
      let len = sortedKeys.length;
      let newQueryParams = {};

      for (var i = 0; i < len; i++) {
        newQueryParams[sortedKeys[i]] = obj[sortedKeys[i]];
      }
      return newQueryParams;
    };

    await store.query('post', { params: 1, in: 2, wrong: 3, order: 4 });
    assert.deepEqual(
      Object.keys(passedHash.data),
      ['wrong', 'params', 'order', 'in'],
      'query params are received in reverse alphabetical order'
    );
  });

  test("query - payload 'meta' is accessible on the record array", async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      meta: { offset: 5 },
      posts: [{ id: '1', name: 'Rails is very expensive sushi' }],
    });

    let posts = await store.query('post', { page: 2 });
    assert.strictEqual(posts.meta.offset, 5, 'Reponse metadata can be accessed with recordArray.meta');
  });

  test("query - each record array can have it's own meta object", async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      meta: { offset: 5 },
      posts: [{ id: '1', name: 'Rails is very expensive sushi' }],
    });

    let posts = await store.query('post', { page: 2 });
    assert.strictEqual(posts.meta.offset, 5, 'Reponse metadata can be accessed with recordArray.meta');
    ajaxResponse({
      meta: { offset: 1 },
      posts: [{ id: '1', name: 'Rails is very expensive sushi' }],
    });

    let newPosts = await store.query('post', { page: 1 });
    assert.strictEqual(newPosts.meta.offset, 1, 'new array has correct metadata');
    assert.strictEqual(posts.meta.offset, 5, 'metadata on the old array hasnt been clobbered');
  });

  test('query - returning an array populates the array', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      posts: [
        { id: '1', name: 'Rails is omakase' },
        { id: '2', name: 'The Parley Letter' },
      ],
    });

    let posts = await store.query('post', { page: 1 });
    assert.strictEqual(passedUrl, '/posts');
    assert.strictEqual(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, { page: 1 });

    let post1 = store.peekRecord('post', 1);
    let post2 = store.peekRecord('post', 2);

    assert.deepEqual(post1.getProperties('id', 'name'), { id: '1', name: 'Rails is omakase' }, 'Post 1 is loaded');
    assert.deepEqual(post2.getProperties('id', 'name'), { id: '2', name: 'The Parley Letter' }, 'Post 2 is loaded');

    assert.strictEqual(posts.length, 2, 'The posts are in the array');
    assert.true(posts.isLoaded, 'The RecordArray is loaded');
    assert.deepEqual(posts.slice(), [post1, post2], 'The correct records are in the array');
  });

  test('query - returning sideloaded data loads the data', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      posts: [
        { id: '1', name: 'Rails is omakase' },
        { id: '2', name: 'The Parley Letter' },
      ],
      comments: [{ id: '1', name: 'FIRST' }],
    });

    await store.query('post', { page: 1 });
    let comment = store.peekRecord('comment', 1);

    assert.deepEqual(comment.getProperties('id', 'name'), { id: '1', name: 'FIRST' });
  });

  test('query - data is normalized through custom serializers', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      class extends RESTSerializer {
        primaryKey = '_ID_';
        attrs = { name: '_NAME_' };
      }
    );

    ajaxResponse({
      posts: [
        { _ID_: 1, _NAME_: 'Rails is omakase' },
        { _ID_: 2, _NAME_: 'The Parley Letter' },
      ],
    });

    let posts = await store.query('post', { page: 1 });
    let post1 = store.peekRecord('post', 1);
    let post2 = store.peekRecord('post', 2);

    assert.deepEqual(post1.getProperties('id', 'name'), { id: '1', name: 'Rails is omakase' }, 'Post 1 is loaded');

    assert.deepEqual(post2.getProperties('id', 'name'), { id: '2', name: 'The Parley Letter' }, 'Post 2 is loaded');

    assert.strictEqual(posts.length, 2, 'The posts are in the array');
    assert.true(posts.isLoaded, 'The RecordArray is loaded');
    assert.deepEqual(posts.slice(), [post1, post2], 'The correct records are in the array');
  });

  test('queryRecord - empty response', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({});

    let post = await store.queryRecord('post', { slug: 'ember-js-rocks' });
    assert.strictEqual(post, null);
  });

  test('queryRecord - primary data being null', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      post: null,
    });

    let post = await store.queryRecord('post', { slug: 'ember-js-rocks' });
    assert.strictEqual(post, null);
  });

  test('queryRecord - primary data being a single object', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      post: {
        id: '1',
        name: 'Ember.js rocks',
      },
    });

    let post = await store.queryRecord('post', { slug: 'ember-js-rocks' });
    assert.deepEqual(post.name, 'Ember.js rocks');
  });

  test('queryRecord - returning sideloaded data loads the data', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      post: { id: '1', name: 'Rails is omakase' },
      comments: [{ id: '1', name: 'FIRST' }],
    });

    await store.queryRecord('post', { slug: 'rails-is-omakaze' });
    let comment = store.peekRecord('comment', 1);

    assert.deepEqual(comment.getProperties('id', 'name'), { id: '1', name: 'FIRST' });
  });

  testInDebug('queryRecord - returning an array is asserted', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      post: [
        { id: '1', name: 'Rails is omakase' },
        { id: '2', name: 'Ember is js' },
      ],
    });

    assert.expectAssertion(
      () => store.queryRecord('post', { slug: 'rails-is-omakaze' }),
      'Assertion Failed: The adapter returned an array for the primary data of a `queryRecord` response. `queryRecord` should return a single record.'
    );
  });

  testInDebug("queryRecord - returning an single object doesn't throw a deprecation", async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      post: { id: '1', name: 'Rails is omakase' },
    });

    assert.expectNoDeprecation();

    await store.queryRecord('post', { slug: 'rails-is-omakaze' });
  });

  test('queryRecord - data is normalized through custom serializers', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        primaryKey: '_ID_',
        attrs: { name: '_NAME_' },
      })
    );

    ajaxResponse({
      post: { _ID_: 1, _NAME_: 'Rails is omakase' },
    });

    return store.queryRecord('post', { slug: 'rails-is-omakaze' }).then((post) => {
      assert.deepEqual(
        post.getProperties('id', 'name'),
        { id: '1', name: 'Rails is omakase' },
        'Post 1 is loaded with correct data'
      );
    });
  });

  test('findMany - findMany uses a correct URL to access the records', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.coalesceFindRequests = true;

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });

    let post = store.peekRecord('post', 1);
    ajaxResponse({
      comments: [
        { id: '1', name: 'FIRST' },
        { id: '2', name: 'Rails is unagi' },
        { id: '3', name: 'What is omakase?' },
      ],
    });

    await post.comments;
    assert.strictEqual(passedUrl, '/comments');
    assert.deepEqual(passedHash, { data: { ids: ['1', '2', '3'] } });
  });

  test('findMany - passes buildURL the requestType', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.buildURL = function (type, id, snapshot, requestType) {
      return '/' + requestType + '/' + type;
    };

    this.owner.register('model:post', Post);
    adapter.coalesceFindRequests = true;

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });

    let post = store.peekRecord('post', 1);
    ajaxResponse({
      comments: [
        { id: '1', name: 'FIRST' },
        { id: '2', name: 'Rails is unagi' },
        { id: '3', name: 'What is omakase?' },
      ],
    });

    await post.comments;
    assert.strictEqual(passedUrl, '/findMany/comment');
  });

  test('findMany - findMany does not coalesce by default', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });

    let post = store.peekRecord('post', 1);
    //It's still ok to return this even without coalescing  because RESTSerializer supports sideloading
    ajaxResponse({
      comments: [
        { id: '1', name: 'FIRST' },
        { id: '2', name: 'Rails is unagi' },
        { id: '3', name: 'What is omakase?' },
      ],
    });

    await post.comments;
    assert.strictEqual(passedUrl, '/comments/3');
    assert.deepEqual(passedHash.data, {});
  });

  test('findMany - returning an array populates the array', async function (assert) {
    adapter.shouldBackgroundReloadRecord = () => false;
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.coalesceFindRequests = true;

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });

    let post = await store.findRecord('post', 1);
    ajaxResponse({
      comments: [
        { id: '1', name: 'FIRST' },
        { id: '2', name: 'Rails is unagi' },
        { id: '3', name: 'What is omakase?' },
      ],
    });

    let comments = await post.comments;
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);

    assert.deepEqual(comment1.getProperties('id', 'name'), { id: '1', name: 'FIRST' });
    assert.deepEqual(comment2.getProperties('id', 'name'), { id: '2', name: 'Rails is unagi' });
    assert.deepEqual(comment3.getProperties('id', 'name'), {
      id: '3',
      name: 'What is omakase?',
    });

    assert.deepEqual(comments.slice(), [comment1, comment2, comment3], 'The correct records are in the array');
  });

  test('findMany - returning sideloaded data loads the data', async function (assert) {
    adapter.shouldBackgroundReloadRecord = () => false;
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    adapter.coalesceFindRequests = true;

    const post = store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });

    ajaxResponse({
      comments: [
        { id: '1', name: 'FIRST' },
        { id: '2', name: 'Rails is unagi' },
        { id: '3', name: 'What is omakase?' },
        { id: '4', name: 'Unrelated comment' },
      ],
      posts: [{ id: '2', name: 'The Parley Letter' }],
    });

    let comments = await post.comments;

    let comment1 = store.peekRecord('comment', '1');
    let comment2 = store.peekRecord('comment', '2');
    let comment3 = store.peekRecord('comment', '3');
    let comment4 = store.peekRecord('comment', '4');
    let post2 = store.peekRecord('post', '2');

    assert.deepEqual(comments.slice(), [comment1, comment2, comment3], 'The correct records are in the array');

    assert.deepEqual(comment4.getProperties('id', 'name'), {
      id: '4',
      name: 'Unrelated comment',
    });
    assert.deepEqual(post2.getProperties('id', 'name'), { id: '2', name: 'The Parley Letter' });
  });

  test('findMany - a custom serializer is used if present', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.shouldBackgroundReloadRecord = () => false;
    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        primaryKey: '_ID_',
        attrs: { name: '_NAME_' },
      })
    );

    this.owner.register(
      'serializer:comment',
      RESTSerializer.extend({
        primaryKey: '_ID_',
        attrs: { name: '_NAME_' },
      })
    );

    adapter.coalesceFindRequests = true;

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });

    let post = await store.findRecord('post', 1);

    ajaxResponse({
      comments: [
        { _ID_: 1, _NAME_: 'FIRST' },
        { _ID_: 2, _NAME_: 'Rails is unagi' },
        { _ID_: 3, _NAME_: 'What is omakase?' },
      ],
    });

    let comments = await post.comments;
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);

    assert.deepEqual(comment1.getProperties('id', 'name'), { id: '1', name: 'FIRST' });
    assert.deepEqual(comment2.getProperties('id', 'name'), { id: '2', name: 'Rails is unagi' });
    assert.deepEqual(comment3.getProperties('id', 'name'), {
      id: '3',
      name: 'What is omakase?',
    });

    assert.deepEqual(comments.slice(), [comment1, comment2, comment3], 'The correct records are in the array');
  });

  test('findHasMany - returning an array populates the array', async function (assert) {
    adapter.shouldBackgroundReloadRecord = () => false;
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments',
            },
          },
        },
      },
    });

    let post = await store.findRecord('post', '1');

    ajaxResponse({
      comments: [
        { id: '1', name: 'FIRST' },
        { id: '2', name: 'Rails is unagi' },
        { id: '3', name: 'What is omakase?' },
      ],
    });

    let comments = await post.comments;
    assert.strictEqual(passedUrl, '/posts/1/comments');
    assert.strictEqual(passedVerb, 'GET');
    assert.strictEqual(passedHash, undefined);

    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);

    assert.deepEqual(comment1.getProperties('id', 'name'), { id: '1', name: 'FIRST' });
    assert.deepEqual(comment2.getProperties('id', 'name'), {
      id: '2',
      name: 'Rails is unagi',
    });
    assert.deepEqual(comment3.getProperties('id', 'name'), {
      id: '3',
      name: 'What is omakase?',
    });

    assert.deepEqual(comments.slice(), [comment1, comment2, comment3], 'The correct records are in the array');
  });

  test('findHasMany - passes buildURL the requestType', async function (assert) {
    assert.expect(2);
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.buildURL = function (type, id, snapshot, requestType) {
      assert.ok(snapshot instanceof Snapshot);
      assert.strictEqual(requestType, 'findHasMany');
    };

    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments',
            },
          },
        },
      },
    });

    let post = await store.findRecord('post', '1');

    ajaxResponse({
      comments: [
        { id: '1', name: 'FIRST' },
        { id: '2', name: 'Rails is unagi' },
        { id: '3', name: 'What is omakase?' },
      ],
    });

    await post.comments;
  });

  test('findMany - returning sideloaded data loads the data (with JSONApi Links)', async function (assert) {
    adapter.shouldBackgroundReloadRecord = () => false;
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    adapter.coalesceFindRequests = true;

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments',
            },
          },
        },
      },
    });

    let post = await store.findRecord('post', 1);

    ajaxResponse({
      comments: [
        { id: '1', name: 'FIRST' },
        { id: '2', name: 'Rails is unagi' },
        { id: '3', name: 'What is omakase?' },
      ],
      posts: [{ id: '2', name: 'The Parley Letter' }],
    });

    let comments = await post.comments;
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);
    let post2 = store.peekRecord('post', 2);

    assert.deepEqual(comments.slice(), [comment1, comment2, comment3], 'The correct records are in the array');

    assert.deepEqual(post2.getProperties('id', 'name'), { id: '2', name: 'The Parley Letter' });
  });

  test('findMany - a custom serializer is used if present', async function (assert) {
    adapter.shouldBackgroundReloadRecord = () => false;
    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        primaryKey: '_ID_',
        attrs: { name: '_NAME_' },
      })
    );

    this.owner.register(
      'serializer:comment',
      RESTSerializer.extend({
        primaryKey: '_ID_',
        attrs: { name: '_NAME_' },
      })
    );

    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: 'Rails is omakase',
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments',
            },
          },
        },
      },
    });

    await store
      .findRecord('post', 1)
      .then((post) => {
        ajaxResponse({
          comments: [
            { _ID_: 1, _NAME_: 'FIRST' },
            { _ID_: 2, _NAME_: 'Rails is unagi' },
            { _ID_: 3, _NAME_: 'What is omakase?' },
          ],
        });
        return post.comments;
      })
      .then((comments) => {
        let comment1 = store.peekRecord('comment', 1);
        let comment2 = store.peekRecord('comment', 2);
        let comment3 = store.peekRecord('comment', 3);

        assert.deepEqual(comment1.getProperties('id', 'name'), { id: '1', name: 'FIRST' });
        assert.deepEqual(comment2.getProperties('id', 'name'), { id: '2', name: 'Rails is unagi' });
        assert.deepEqual(comment3.getProperties('id', 'name'), {
          id: '3',
          name: 'What is omakase?',
        });

        assert.deepEqual(comments.slice(), [comment1, comment2, comment3], 'The correct records are in the array');
      });
  });

  test('findBelongsTo - passes buildURL the requestType', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: null }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: true, inverse: null }) post;
    }
    this.owner.register('model:comment', Comment);

    assert.expect(2);
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.buildURL = function (type, id, snapshot, requestType) {
      assert.ok(snapshot instanceof Snapshot);
      assert.strictEqual(requestType, 'findBelongsTo');
    };

    store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          name: 'FIRST',
        },
        relationships: {
          post: {
            links: {
              related: '/posts/1',
            },
          },
        },
      },
    });

    let comment = await store.findRecord('comment', '1');
    ajaxResponse({ post: { id: '1', name: 'Rails is omakase' } });
    await comment.post;
  });

  testInDebug(
    'coalesceFindRequests assert.warns if the expected records are not returned in the coalesced request',
    async function (assert) {
      assert.expect(2);
      class Post extends Model {
        @attr name;
        @hasMany('comment', { async: true, inverse: 'post' }) comments;
      }
      this.owner.register('model:post', Post);
      class Comment extends Model {
        @attr name;
        @belongsTo('post', { async: false, inverse: 'comments' }) post;
      }
      this.owner.register('model:comment', Comment);

      adapter.coalesceFindRequests = true;

      ajaxResponse({
        comments: [{ id: '1', type: 'comment' }],
      });

      let post = store.push({
        data: {
          type: 'post',
          id: '2',
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
                { type: 'comment', id: '3' },
              ],
            },
          },
        },
      });

      assert.expectWarning(
        async () => {
          try {
            await post.comments;
          } catch (e) {
            assert.strictEqual(
              e.message,
              `Expected: '<comment:2>' to be present in the adapter provided payload, but it was not found.`
            );
          }
        },
        { id: 'ds.store.missing-records-from-adapter' }
      );
    }
  );

  test('groupRecordsForFindMany groups records based on their url', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    adapter.coalesceFindRequests = true;

    adapter.buildURL = function (type, id, snapshot) {
      if (id === '1') {
        return '/comments/1';
      } else {
        return '/other_comments/' + id;
      }
    };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(id, '1');
      return resolve({ comments: { id: '1' } });
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.deepEqual(ids, ['2', '3']);
      return resolve({ comments: [{ id: '2' }, { id: '3' }] });
    };

    store.push({
      data: {
        type: 'post',
        id: '2',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });

    let post = store.peekRecord('post', 2);

    await post.comments;
  });

  test('groupRecordsForFindMany groups records correctly when singular URLs are encoded as query params', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    adapter.coalesceFindRequests = true;

    adapter.buildURL = function (type, id, snapshot) {
      if (id === '1') {
        return '/comments?id=1';
      } else {
        return '/other_comments?id=' + id;
      }
    };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(id, '1');
      return resolve({ comments: { id: '1' } });
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.deepEqual(ids, ['2', '3']);
      return resolve({ comments: [{ id: '2' }, { id: '3' }] });
    };

    store.push({
      data: {
        type: 'post',
        id: '2',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });

    let post = store.peekRecord('post', 2);

    await post.comments;
  });

  test('normalizeKey - to set up _ids and _id', async function (assert) {
    class Post extends Model {
      @attr name;
      @attr authorName;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
      @belongsTo('user', { async: false, inverse: null }) author;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    class User extends Model {
      @attr createdAt;
      @attr name;
    }
    this.owner.register('model:user', User);

    this.owner.register(
      'serializer:application',
      RESTSerializer.extend({
        keyForAttribute(attr) {
          return underscore(attr);
        },

        keyForBelongsTo(belongsTo) {},

        keyForRelationship(rel, kind) {
          if (kind === 'belongsTo') {
            let underscored = underscore(rel);
            return underscored + '_id';
          } else {
            let singular = singularize(rel);
            return underscore(singular) + '_ids';
          }
        },
      })
    );

    ajaxResponse({
      posts: [
        {
          id: '1',
          name: 'Rails is omakase',
          author_name: '@d2h',
          author_id: '1',
          comment_ids: ['1', '2'],
        },
      ],

      users: [
        {
          id: '1',
          name: 'D2H',
        },
      ],

      comments: [
        {
          id: '1',
          body: 'Rails is unagi',
        },
        {
          id: '2',
          body: 'What is omakase?',
        },
      ],
    });

    let post = await store.findRecord('post', 1);
    assert.strictEqual(post.authorName, '@d2h');
    assert.strictEqual(post.author.name, 'D2H');
    assert.deepEqual(
      post.comments.map((r) => r.body),
      ['Rails is unagi', 'What is omakase?']
    );
  });

  test('groupRecordsForFindMany splits up calls for large ids', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    assert.expect(2);

    function repeatChar(character, n) {
      return new Array(n + 1).join(character);
    }

    let a2000 = repeatChar('a', 2000);
    let b2000 = repeatChar('b', 2000);
    let post;

    store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: a2000 },
              { type: 'comment', id: b2000 },
            ],
          },
        },
      },
    });

    post = store.peekRecord('post', 1);

    adapter.coalesceFindRequests = true;

    adapter.findRecord = function (store, type, id, snapshot) {
      if (id === a2000 || id === b2000) {
        assert.ok(true, 'Found ' + id);
      }

      return resolve({ comments: { id: id } });
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.ok(false, 'findMany should not be called - we expect 2 calls to find for a2000 and b2000');
      return reject();
    };

    post.comments;
  });

  test('groupRecordsForFindMany groups calls for small ids', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    assert.expect(1);

    function repeatChar(character, n) {
      return new Array(n + 1).join(character);
    }

    let a100 = repeatChar('a', 100);
    let b100 = repeatChar('b', 100);
    let post;

    store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: a100 },
              { type: 'comment', id: b100 },
            ],
          },
        },
      },
    });

    post = store.peekRecord('post', 1);

    adapter.coalesceFindRequests = true;

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.ok(false, 'findRecord should not be called - we expect 1 call to findMany for a100 and b100');
      return reject();
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.deepEqual(ids, [a100, b100]);
      return resolve({ comments: [{ id: a100 }, { id: b100 }] });
    };

    await post.comments;
  });

  test('calls adapter.handleResponse with the jqXHR and json', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    assert.expect(2);

    let data = {
      post: {
        id: '1',
        name: 'Docker is amazing',
      },
    };

    server.get('/posts/1', function () {
      return [200, { 'Content-Type': 'application/json' }, JSON.stringify(data)];
    });

    adapter.handleResponse = function (status, headers, json) {
      assert.deepEqual(status, 200);
      assert.deepEqual(json, data);
      return json;
    };

    await store.findRecord('post', '1');
  });

  test('calls handleResponse with jqXHR, jqXHR.responseText, and requestData', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    assert.expect(4);

    let responseText = 'Nope lol';

    let expectedRequestData = {
      method: 'GET',
      url: '/posts/1',
    };

    server.get('/posts/1', function () {
      return [400, {}, responseText];
    });

    adapter.handleResponse = function (status, headers, json, requestData) {
      assert.deepEqual(status, 400);
      assert.deepEqual(json, responseText);
      assert.deepEqual(requestData, expectedRequestData);
      return new AdapterError('nope!');
    };

    try {
      await store.findRecord('post', '1');
    } catch (err) {
      assert.ok(err, 'promise rejected');
    }
  });

  test('rejects promise if AdapterError is returned from adapter.handleResponse', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    assert.expect(3);

    let data = {
      something: 'is invalid',
    };

    server.get('/posts/1', function () {
      return [200, { 'Content-Type': 'application/json' }, JSON.stringify(data)];
    });

    adapter.handleResponse = function (status, headers, json) {
      assert.ok(true, 'handleResponse should be called');
      return new AdapterError(json);
    };

    try {
      await store.findRecord('post', '1');
    } catch (reason) {
      assert.ok(true, 'promise should be rejected');
      assert.ok(reason instanceof AdapterError, 'reason should be an instance of AdapterError');
    }
  });

  test('gracefully handles exceptions in handleResponse', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    assert.expect(1);

    server.post('/posts/1', function () {
      return [200, { 'Content-Type': 'application/json' }, 'ok'];
    });

    adapter.handleResponse = function (status, headers, json) {
      throw new Error('Unexpected error');
    };

    try {
      await store.findRecord('post', '1');
    } catch (error) {
      assert.ok(true, 'Unexpected error is captured by the promise chain');
    }
  });

  test('gracefully handles exceptions in handleResponse where the ajax request errors', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    assert.expect(1);

    server.get('/posts/1', function () {
      return [500, { 'Content-Type': 'application/json' }, 'Internal Server Error'];
    });

    adapter.handleResponse = function (status, headers, json) {
      throw new Error('Unexpected error');
    };

    try {
      await store.findRecord('post', '1');
    } catch (error) {
      assert.ok(true, 'Unexpected error is captured by the promise chain');
    }
  });

  test('treats status code 0 as an abort', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    assert.expect(3);

    ajaxZero();
    adapter.handleResponse = function (status, headers, payload) {
      assert.ok(false);
    };

    try {
      await store.findRecord('post', '1');
    } catch (err) {
      assert.ok(err instanceof AbortError, 'reason should be an instance of AbortError');
      assert.strictEqual(err.errors.length, 1, 'AbortError includes errors with request/response details');
      let expectedError = {
        title: 'Adapter Error',
        detail: 'Request failed: GET /posts/1',
        status: 0,
      };
      assert.deepEqual(err.errors[0], expectedError, 'method, url and, status are captured as details');
    }
  });

  test('on error appends errorThrown for sanity', async function (assert) {
    assert.expect(2);
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    let jqXHR = {
      responseText: 'Nope lol',
      getAllResponseHeaders() {
        return '';
      },
    };

    let errorThrown = new Error('nope!');

    adapter.useFetch = false;
    adapter._ajaxRequest = function (hash) {
      hash.error(jqXHR, jqXHR.responseText, errorThrown);
    };

    adapter.handleResponse = function (status, headers, payload) {
      assert.ok(false);
    };

    try {
      await store.findRecord('post', '1');
    } catch (err) {
      assert.strictEqual(err, errorThrown);
      assert.ok(err, 'promise rejected');
      if (err !== errorThrown) {
        throw err;
      }
    }
  });

  test('on error wraps the error string in an AdapterError object', async function (assert) {
    assert.expect(2);
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    let jqXHR = {
      responseText: '',
      getAllResponseHeaders() {
        return '';
      },
    };

    let errorThrown = 'nope!';

    adapter.useFetch = false;
    adapter._ajaxRequest = function (hash) {
      hash.error(jqXHR, 'error', errorThrown);
    };

    try {
      await store.findRecord('post', '1');
    } catch (err) {
      assert.strictEqual(err.errors[0].detail, errorThrown);
      assert.ok(err, 'promise rejected');
    }
  });

  test('rejects promise with a specialized subclass of AdapterError if ajax responds with http error codes', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    assert.expect(10);

    ajaxError('error', 401);

    try {
      await store.findRecord('post', '1');
    } catch (reason) {
      assert.ok(true, 'promise should be rejected');
      assert.ok(reason instanceof UnauthorizedError, 'reason should be an instance of UnauthorizedError');
    }

    ajaxError('error', 403);

    try {
      await store.findRecord('post', '1');
    } catch (reason) {
      assert.ok(true, 'promise should be rejected');
      assert.ok(reason instanceof ForbiddenError, 'reason should be an instance of ForbiddenError');
    }

    ajaxError('error', 404);

    try {
      await store.findRecord('post', '1');
    } catch (reason) {
      assert.ok(true, 'promise should be rejected');
      assert.ok(reason instanceof NotFoundError, 'reason should be an instance of NotFoundError');
    }

    ajaxError('error', 409);

    try {
      await store.findRecord('post', '1');
    } catch (reason) {
      assert.ok(true, 'promise should be rejected');
      assert.ok(reason instanceof ConflictError, 'reason should be an instance of ConflictError');
    }

    ajaxError('error', 500);

    try {
      await store.findRecord('post', '1');
    } catch (reason) {
      assert.ok(true, 'promise should be rejected');
      assert.ok(reason instanceof ServerError, 'reason should be an instance of ServerError');
    }
  });

  test('error handling includes a detailed message from the server', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    assert.expect(2);

    ajaxError('An error message, perhaps generated from a backend server!', 500, {
      'Content-Type': 'text/plain',
    });

    try {
      await store.findRecord('post', '1');
    } catch (err) {
      assert.strictEqual(
        err.message,
        'Ember Data Request GET /posts/1 returned a 500\nPayload (text/plain)\nAn error message, perhaps generated from a backend server!'
      );
      assert.ok(err, 'promise rejected');
    }
  });

  test('error handling with a very long HTML-formatted payload truncates the friendly message', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    assert.expect(2);

    ajaxError(new Array(100).join('<blink />'), 500, { 'Content-Type': 'text/html' });

    try {
      await store.findRecord('post', '1');
    } catch (err) {
      assert.strictEqual(
        err.message,
        'Ember Data Request GET /posts/1 returned a 500\nPayload (text/html)\n[Omitted Lengthy HTML]'
      );
      assert.ok(err, 'promise rejected');
    }
  });

  test('findAll resolves with a collection of Models, not Identifiers', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);
    assert.expect(4);

    ajaxResponse({
      posts: [
        {
          id: '1',
          name: 'dhh lol',
        },
        {
          id: '2',
          name: 'james mickens is rad',
        },
        {
          id: '3',
          name: 'in the name of love',
        },
      ],
    });

    let posts = await store.findAll('post');
    assert.strictEqual(get(posts, 'length'), 3);
    posts.forEach((post) => assert.ok(post instanceof Model));
  });

  test('createRecord - sideloaded records are pushed to the store', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    ajaxResponse({
      post: {
        id: '1',
        name: 'The Parley Letter',
        comments: [2, 3],
      },
      comments: [
        {
          id: '2',
          name: 'First comment',
        },
        {
          id: '3',
          name: 'Second comment',
        },
      ],
    });

    let post = store.createRecord('post', { name: 'The Parley Letter' });
    await post.save();

    let comments = store.peekAll('comment');

    assert.strictEqual(comments.length, 2, 'comments.length is correct');
    assert.strictEqual(comments[0].name, 'First comment', 'comments.at(0).name is correct');
    assert.strictEqual(comments.at(-1).name, 'Second comment', 'comments.at(-1).name is correct');
  });

  testInDebug(
    'warns when an empty 201 response is returned, though a valid stringified JSON is expected',
    function (assert) {
      class Post extends Model {
        @attr name;
        @hasMany('comment', { async: true, inverse: 'post' }) comments;
      }
      this.owner.register('model:post', Post);
      class Comment extends Model {
        @attr name;
        @belongsTo('post', { async: false, inverse: 'comments' }) post;
      }
      this.owner.register('model:comment', Comment);

      assert.expect(1);

      server.post('/posts', function () {
        return [201, { 'Content-Type': 'application/json' }, ''];
      });

      let post = store.createRecord('post');
      return post.save().then(
        () => {
          assert.strictEqual(true, false, 'should not have fulfilled');
        },
        (reason) => {
          assert.ok(/saved to the server/.test(reason.message));
        }
      );
    }
  );

  if (typeof jQuery !== 'undefined') {
    testInDebug(
      'warns when an empty 201 response is returned, though a valid stringified JSON is expected - Ajax',
      async function (assert) {
        assert.expect(1);
        class Post extends Model {
          @attr name;
          @hasMany('comment', { async: true, inverse: 'post' }) comments;
        }
        this.owner.register('model:post', Post);
        class Comment extends Model {
          @attr name;
          @belongsTo('post', { async: false, inverse: 'comments' }) post;
        }
        this.owner.register('model:comment', Comment);

        adapter.useFetch = false;
        server.post('/posts', function () {
          return [201, { 'Content-Type': 'application/json' }, ''];
        });

        let post = store.createRecord('post');
        return post.save().then(
          () => {
            assert.equal(true, false, 'should not have fulfilled');
          },
          (reason) => {
            assert.ok(/JSON/.test(reason.message));
          }
        );
      }
    );
  }

  testInDebug(
    'warns when an empty 200 response is returned, though a valid stringified JSON is expected',
    async function (assert) {
      assert.expect(2);
      class Post extends Model {
        @attr name;
        @hasMany('comment', { async: true, inverse: 'post' }) comments;
      }
      this.owner.register('model:post', Post);
      class Comment extends Model {
        @attr name;
        @belongsTo('post', { async: false, inverse: 'comments' }) post;
      }
      this.owner.register('model:comment', Comment);

      server.put('/posts/1', function () {
        return [200, { 'Content-Type': 'application/json' }, ''];
      });

      let post = store.push({ data: { id: '1', type: 'post' } });
      await assert.expectWarning(async () => {
        return post.save().then(() => assert.ok(true, 'save fullfills correctly'));
      }, /JSON/);
    }
  );

  test('can return an empty 200 response, though a valid stringified JSON is expected', async function (assert) {
    assert.expect(1);

    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    server.put('/posts/1', function () {
      return [200, { 'Content-Type': 'application/json' }, ''];
    });

    let post = store.push({ data: { id: '1', type: 'post' } });
    return post.save().then(() => assert.ok(true, 'save fullfills correctly'));
  });

  test('can return a null 200 response, though a valid stringified JSON is expected', async function (assert) {
    class Post extends Model {
      @attr name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    this.owner.register('model:post', Post);
    class Comment extends Model {
      @attr name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:comment', Comment);

    assert.expect(1);

    server.put('/posts/1', function () {
      return [200, { 'Content-Type': 'application/json' }, null];
    });

    let post = store.push({ data: { id: '1', type: 'post' } });
    return post.save().then(() => assert.ok(true, 'save fullfills correctly'));
  });
});
