import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type { CompatStore } from '@ember-data/legacy-compat';
import type { QueryBuilderOptions } from '@ember-data/legacy-compat/builders';
import { query, queryRecord } from '@ember-data/legacy-compat/builders';
import Model, { attr } from '@ember-data/model';

module('Integration - legacy-compat/builders/query', function (hooks) {
  setupTest(hooks);

  module('query', function () {
    test('basic payload', async function (assert) {
      class Post extends Model {
        @attr declare name: string;
      }
      this.owner.register('model:post', Post);
      this.owner.register(
        'adapter:application',
        class Adapter {
          query() {
            assert.step('adapter-query');
            return Promise.resolve({
              data: [
                {
                  id: '1',
                  type: 'post',
                  attributes: {
                    name: 'Krystan rules, you drool',
                  },
                },
              ],
            });
          }
          static create() {
            return new this();
          }
        }
      );

      const store = this.owner.lookup('service:store') as CompatStore;
      const { content: results } = await store.request<Post[]>(query('post', { id: '1' }));

      assert.strictEqual(results.length, 1, 'post was found');
      assert.strictEqual(results[0].id, '1', 'post has correct id');
      assert.strictEqual(results[0].name, 'Krystan rules, you drool', 'post has correct name');
      assert.verifySteps(['adapter-query'], 'adapter-query was called');
    });

    test('query', function (assert) {
      const result = query('post', { id: '1' });
      assert.deepEqual(
        result,
        {
          op: 'query',
          data: {
            type: 'post',
            query: { id: '1' },
            options: {},
          },
          cacheOptions: {},
        },
        `query works`
      );
    });

    test('query with options', function (assert) {
      const options: Required<QueryBuilderOptions> = {
        whatever: true,
        adapterOptions: {},
      };
      const result = query('post', { id: '1' }, options);
      assert.deepEqual(
        result,
        {
          op: 'query',
          data: {
            type: 'post',
            query: { id: '1' },
            options,
          },
          cacheOptions: {},
        },
        `query works with options`
      );
    });
  });

  module('queryRecord', function () {
    test('basic payload', async function (assert) {
      class Post extends Model {
        @attr declare name: string;
      }
      this.owner.register('model:post', Post);
      this.owner.register(
        'adapter:application',
        class Adapter {
          queryRecord() {
            assert.step('adapter-queryRecord');
            return Promise.resolve({
              data: {
                id: '1',
                type: 'post',
                attributes: {
                  name: 'Krystan rules, you drool',
                },
              },
            });
          }
          static create() {
            return new this();
          }
        }
      );

      const store = this.owner.lookup('service:store') as CompatStore;
      const { content: post } = await store.request<Post>(queryRecord('post', { id: '1' }));

      assert.strictEqual(post.id, '1', 'post has correct id');
      assert.strictEqual(post.name, 'Krystan rules, you drool', 'post has correct name');
      assert.verifySteps(['adapter-queryRecord'], 'adapter-queryRecord was called');
    });

    test('queryRecord', function (assert) {
      const result = queryRecord('post', { id: '1' });
      assert.deepEqual(
        result,
        {
          op: 'queryRecord',
          data: {
            type: 'post',
            query: { id: '1' },
            options: {},
          },
          cacheOptions: {},
        },
        `queryRecord works`
      );
    });

    test('queryRecord with options', function (assert) {
      const options: Required<QueryBuilderOptions> = {
        whatever: true,
        adapterOptions: {},
      };
      const result = queryRecord('post', { id: '1' }, options);
      assert.deepEqual(
        result,
        {
          op: 'queryRecord',
          data: {
            type: 'post',
            query: { id: '1' },
            options,
          },
          cacheOptions: {},
        },
        `queryRecord works with options`
      );
    });
  });
});
