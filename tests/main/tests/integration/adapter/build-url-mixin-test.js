import { decamelize, underscore } from '@ember/string';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { pluralize } from 'ember-inflector';
import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import RESTSerializer from '@ember-data/serializer/rest';
import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';

module('integration/adapter/build-url-mixin - BuildURLMixin with RESTAdapter', function (hooks) {
  setupTest(hooks);

  let store, adapter, passedUrl;

  function ajaxResponse(value) {
    adapter.ajax = function (url, verb, hash) {
      passedUrl = url;

      return resolve(deepCopy(value));
    };
  }

  hooks.beforeEach(function () {
    let { owner } = this;
    class SuperUser extends Model {}

    owner.register('adapter:application', RESTAdapter.extend());
    owner.register('serializer:application', RESTSerializer.extend());
    owner.register('model:super-user', SuperUser);

    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');

    passedUrl = null;
  });

  test('buildURL - with host and namespace', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
    }

    class CommentModel extends Model {
      @attr('string') name;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1',
    });

    ajaxResponse({ posts: [{ id: '1' }] });

    await store.findRecord('post', '1');

    assert.strictEqual(passedUrl, 'http://example.com/api/v1/posts/1');
  });

  test('buildURL - with relative paths in links', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1',
    });

    ajaxResponse({ posts: [{ id: '1', links: { comments: 'comments' } }] });

    let post = await store.findRecord('post', '1');
    ajaxResponse({ comments: [{ id: '1' }] });

    await post.comments;
    assert.strictEqual(passedUrl, 'http://example.com/api/v1/posts/1/comments');
  });

  test('buildURL - with absolute paths in links', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1',
    });

    ajaxResponse({ posts: [{ id: '1', links: { comments: '/api/v1/posts/1/comments' } }] });

    let post = await store.findRecord('post', '1');

    ajaxResponse({ comments: [{ id: '1' }] });
    await post.comments;
    assert.strictEqual(passedUrl, 'http://example.com/api/v1/posts/1/comments');
  });

  test('buildURL - with absolute paths in links and protocol relative host', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.setProperties({
      host: '//example.com',
      namespace: 'api/v1',
    });

    ajaxResponse({ posts: [{ id: '1', links: { comments: '/api/v1/posts/1/comments' } }] });

    let post = await store.findRecord('post', '1');
    ajaxResponse({ comments: [{ id: '1' }] });

    await post.comments;
    assert.strictEqual(passedUrl, '//example.com/api/v1/posts/1/comments');
  });

  test('buildURL - with absolute paths in links and host is /', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.setProperties({
      host: '/',
      namespace: 'api/v1',
    });

    ajaxResponse({ posts: [{ id: '1', links: { comments: '/api/v1/posts/1/comments' } }] });

    let post = await store.findRecord('post', '1');
    ajaxResponse({ comments: [{ id: '1' }] });

    await post.comments;
    assert.strictEqual(passedUrl, '/api/v1/posts/1/comments', 'host stripped out properly');
  });

  test('buildURL - with full URLs in links', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1',
    });

    ajaxResponse({
      posts: [
        {
          id: '1',
          links: { comments: 'http://example.com/api/v1/posts/1/comments' },
        },
      ],
    });

    let post = await store.findRecord('post', '1');
    ajaxResponse({ comments: [{ id: '1' }] });

    await post.comments;
    assert.strictEqual(passedUrl, 'http://example.com/api/v1/posts/1/comments');
  });

  test('buildURL - with camelized names', async function (assert) {
    adapter.setProperties({
      pathForType(type) {
        let decamelized = decamelize(type);
        return underscore(pluralize(decamelized));
      },
    });

    ajaxResponse({ superUsers: [{ id: '1' }] });

    await store.findRecord('super-user', '1');
    assert.strictEqual(passedUrl, '/super_users/1');
  });

  test('buildURL - buildURL takes a record from find', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.buildURL = function (type, id, snapshot) {
      return '/posts/' + snapshot.belongsTo('post', { id: true }) + '/comments/' + snapshot.id;
    };

    ajaxResponse({ comments: [{ id: '1' }] });

    let post = store.push({
      data: {
        type: 'post',
        id: '2',
      },
    });

    await store.findRecord('comment', '1', { preload: { post } });

    assert.strictEqual(passedUrl, '/posts/2/comments/1');
  });

  test('buildURL - buildURL takes the records from findMany', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.buildURL = function (type, ids, snapshots) {
      if (Array.isArray(snapshots)) {
        return '/posts/' + snapshots[0].belongsTo('post', { id: true }) + '/comments/';
      }
      return '';
    };
    adapter.coalesceFindRequests = true;

    ajaxResponse({ comments: [{ id: '1' }, { id: '2' }, { id: '3' }] });
    let post = store.push({
      data: {
        type: 'post',
        id: '2',
        relationships: {
          comments: {
            data: [
              { id: '1', type: 'comment' },
              { id: '2', type: 'comment' },
              { id: '3', type: 'comment' },
            ],
          },
        },
      },
    });

    await post.comments;
    assert.strictEqual(passedUrl, '/posts/2/comments/');
  });

  test('buildURL - buildURL takes a record from create', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.buildURL = function (type, id, snapshot) {
      return '/posts/' + snapshot.belongsTo('post', { id: true }) + '/comments/';
    };

    ajaxResponse({ comments: [{ id: '1' }] });

    let post = store.push({
      data: {
        type: 'post',
        id: '2',
      },
    });
    let comment = store.createRecord('comment');
    comment.set('post', post);
    await comment.save();
    assert.strictEqual(passedUrl, '/posts/2/comments/');
  });

  test('buildURL - buildURL takes a record from create to query a resolved async belongsTo relationship', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: true, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.buildURL = function (type, id, snapshot) {
      return '/posts/' + snapshot.belongsTo('post', { id: true }) + '/comments/';
    };

    let post = store.push({
      data: {
        id: '2',
        type: 'post',
        attributes: {
          name: 'foo',
        },
      },
    });

    ajaxResponse({ comments: [{ id: '1' }] });

    let comment = store.createRecord('comment');
    comment.set('post', post);

    await comment.save();

    assert.strictEqual(passedUrl, '/posts/2/comments/');
  });

  test('buildURL - buildURL takes a record from update', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.buildURL = function (type, id, snapshot) {
      return '/posts/' + snapshot.belongsTo('post', { id: true }) + '/comments/' + snapshot.id;
    };

    ajaxResponse({ comments: [{ id: '1' }] });

    let post = store.push({
      data: {
        type: 'post',
        id: '2',
      },
    });
    let comment = store.push({
      data: {
        type: 'comment',
        id: '1',
      },
    });
    comment.set('post', post);

    await comment.save();
    assert.strictEqual(passedUrl, '/posts/2/comments/1');
  });

  test('buildURL - buildURL takes a record from delete', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.buildURL = function (type, id, snapshot) {
      return 'posts/' + snapshot.belongsTo('post', { id: true }) + '/comments/' + snapshot.id;
    };

    ajaxResponse({ comments: [{ id: '1' }] });

    let post = store.push({
      data: {
        type: 'post',
        id: '2',
      },
    });
    let comment = store.push({
      data: {
        type: 'comment',
        id: '1',
      },
    });

    comment.set('post', post);
    comment.deleteRecord();

    await comment.save();
    assert.strictEqual(passedUrl, 'posts/2/comments/1');
  });

  test('buildURL - with absolute namespace', async function (assert) {
    class PostModel extends Model {
      @attr('string') name;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }
    class CommentModel extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', PostModel);
    this.owner.register('model:comment', CommentModel);

    adapter.setProperties({
      namespace: '/api/v1',
    });

    ajaxResponse({ posts: [{ id: '1' }] });

    await store.findRecord('post', '1');
    assert.strictEqual(passedUrl, '/api/v1/posts/1');
  });
});
