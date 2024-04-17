import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type { CompatStore } from '@ember-data/legacy-compat';
import { query, queryRecord } from '@ember-data/legacy-compat/builders';
import Model, { attr } from '@ember-data/model';
import { ResourceType } from '@warp-drive/core-types/symbols';

type QueryBuilderOptions = Exclude<Parameters<typeof query>[2], undefined>;
type QueryRecordBuilderOptions = Exclude<Parameters<typeof queryRecord>[2], undefined>;

class Post extends Model {
  [ResourceType] = 'post' as const;
  @attr declare name: string;
}

module('Integration - legacy-compat/builders/query', function (hooks) {
  setupTest(hooks);

  module('query', function () {
    test('basic payload', async function (assert) {
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
      const { content: results } = await store.request<Post[]>(query<Post>('post', { id: '1' }));

      assert.strictEqual(results.length, 1, 'post was found');
      assert.strictEqual(results[0].id, '1', 'post has correct id');
      assert.strictEqual(results[0].name, 'Krystan rules, you drool', 'post has correct name');
      assert.verifySteps(['adapter-query'], 'adapter-query was called');
    });

    test('query', function (assert) {
      const result = query<Post>('post', { id: '1' });
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
      const result = query<Post>('post', { id: '1' }, options);
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
      const { content: post } = await store.request(queryRecord<Post>('post', { id: '1' }));

      assert.strictEqual(post?.id, '1', 'post has correct id');
      assert.strictEqual(post?.name, 'Krystan rules, you drool', 'post has correct name');
      assert.verifySteps(['adapter-queryRecord'], 'adapter-queryRecord was called');
    });

    test('queryRecord', function (assert) {
      const result = queryRecord<Post>('post', { id: '1' });
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
      const options: Required<QueryRecordBuilderOptions> = {
        whatever: true,
        adapterOptions: {},
      };
      const result = queryRecord<Post>('post', { id: '1' }, options);
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
