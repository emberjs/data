import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';
import Store from 'serializer-encapsulation-test-app/services/store';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

class Post extends Model {
  @attr
  title;

  @hasMany('comment', { inverse: 'post', async: true })
  comments;
}

class Comment extends Post {
  @attr
  message;

  @belongsTo('post', { inverse: 'comments', async: true })
  post;
}

module(
  'integration/relationships - running requests for async relationships with minimum serializer',
  function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.owner.register('service:store', Store);
      this.owner.register('model:post', Post);
      this.owner.register('model:comment', Comment);
    });

    test('accessing an async hasMany relationship without links results in serializer.normalizeResponse being called with the requestType findMany', async function (assert) {
      let normalizeResponseCalled = 0;

      class TestMinimumSerializer extends EmberObject {
        normalizeResponse(store, schema, rawPayload, id, requestType) {
          normalizeResponseCalled++;
          assert.strictEqual(requestType, 'findMany', 'expected method name is correct');
          assert.deepEqual(rawPayload, { data: [] });
          return {
            data: [
              {
                id: '1',
                type: 'comment',
                attributes: {
                  message: 'Message 1',
                },
                relationships: {
                  post: {
                    data: {
                      id: '1',
                      type: 'post',
                    },
                  },
                },
              },
              {
                id: '2',
                type: 'comment',
                attributes: {
                  message: 'Message 2',
                },
                relationships: {
                  post: {
                    data: {
                      id: '1',
                      type: 'post',
                    },
                  },
                },
              },
            ],
          };
        }
      }
      this.owner.register('serializer:application', TestMinimumSerializer);

      class TestAdapter extends JSONAPIAdapter {
        coalesceFindRequests = true;

        ajax(url, type) {
          return resolve({ data: [] });
        }
      }
      this.owner.register('adapter:application', TestAdapter);

      const store = this.owner.lookup('service:store');

      let post = store.push({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            title: 'Post 1',
          },
          relationships: {
            comments: {
              data: [
                {
                  id: '1',
                  type: 'comment',
                },
                {
                  id: '2',
                  type: 'comment',
                },
              ],
            },
          },
        },
      });
      let comments = await post.comments;

      assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse is called once');
      assert.deepEqual(
        comments.map((r) => r.message),
        ['Message 1', 'Message 2'],
        'response is expected response'
      );
    });

    test('accessing an async hasMany relationship with links results in serializer.normalizeResponse being called with the requestType findHasMany', async function (assert) {
      let normalizeResponseCalled = 0;

      class TestMinimumSerializer extends EmberObject {
        normalizeResponse(store, schema, rawPayload, id, requestType) {
          normalizeResponseCalled++;
          assert.strictEqual(requestType, 'findHasMany', 'expected method name is correct');
          assert.deepEqual(rawPayload, { data: [] });
          return {
            data: [
              {
                id: '1',
                type: 'comment',
                attributes: {
                  message: 'Message 1',
                },
              },
              {
                id: '2',
                type: 'comment',
                attributes: {
                  message: 'Message 2',
                },
              },
            ],
          };
        }
      }
      this.owner.register('serializer:application', TestMinimumSerializer);

      class TestAdapter extends JSONAPIAdapter {
        coalesceFindRequests = true;

        ajax(url, type) {
          return resolve({ data: [] });
        }
      }
      this.owner.register('adapter:application', TestAdapter);

      const store = this.owner.lookup('service:store');

      let post = store.push({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            title: 'Post 1',
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
      let comments = await post.comments;

      assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse is called once');
      assert.deepEqual(
        comments.map((r) => r.message),
        ['Message 1', 'Message 2'],
        'response is expected response'
      );
    });

    test('accessing an async belongsTo relationship with links results in serializer.normalizeResponse being called with the requestType findBelongsTo', async function (assert) {
      let normalizeResponseCalled = 0;

      class TestMinimumSerializer extends EmberObject {
        normalizeResponse(store, schema, rawPayload, id, requestType) {
          normalizeResponseCalled++;
          assert.strictEqual(requestType, 'findBelongsTo', 'expected method name is correct');
          assert.deepEqual(rawPayload, {
            data: {
              id: '1',
              type: 'post',
              attributes: {
                title: 'John',
              },
            },
          });
          return {
            data: {
              id: '1',
              type: 'post',
              attributes: {
                title: 'Chris',
              },
            },
          };
        }
      }
      this.owner.register('serializer:application', TestMinimumSerializer);

      class TestAdapter extends JSONAPIAdapter {
        coalesceFindRequests = true;

        ajax(url, type) {
          return resolve({
            data: {
              id: '1',
              type: 'post',
              attributes: {
                title: 'John',
              },
            },
          });
        }
      }
      this.owner.register('adapter:application', TestAdapter);

      const store = this.owner.lookup('service:store');

      let comment = store.push({
        data: {
          id: '1',
          type: 'comment',
          attributes: {
            message: 'Message 1',
          },
          relationships: {
            post: {
              links: {
                related: '/comments/1/post',
              },
            },
          },
        },
      });
      let post = await comment.post;

      assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse is called once');
      assert.deepEqual(post.title, 'Chris', 'response is expected response');
    });
  }
);
