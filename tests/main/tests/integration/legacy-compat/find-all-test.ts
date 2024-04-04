import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type { CompatStore } from '@ember-data/legacy-compat';
import type { QueryBuilderOptions } from '@ember-data/legacy-compat/builders';
import { findAll } from '@ember-data/legacy-compat/builders';
import Model, { attr } from '@ember-data/model';

module('Integration - legacy-compat/builders/findAll', function (hooks) {
  setupTest(hooks);

  test('basic payload', async function (assert) {
    class Post extends Model {
      @attr declare name: string;
    }
    this.owner.register('model:post', Post);
    this.owner.register(
      'adapter:application',
      class Adapter {
        findAll() {
          assert.step('adapter-findAll');
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
    const { content: results } = await store.request<Post[]>(findAll('post'));

    assert.strictEqual(results.length, 1, 'post was found');
    assert.strictEqual(results[0].id, '1', 'post has correct id');
    assert.strictEqual(results[0].name, 'Krystan rules, you drool', 'post has correct name');
    assert.verifySteps(['adapter-findAll'], 'adapter-findAll was called');
  });

  test('findAll', function (assert) {
    const result = findAll('post');
    assert.deepEqual(
      result,
      {
        op: 'findAll',
        data: {
          type: 'post',
          options: {},
        },
        cacheOptions: {},
      },
      `findAll works`
    );
  });

  test('findAll with options', function (assert) {
    const options: Required<QueryBuilderOptions> = {
      whatever: true,
      adapterOptions: {},
    };
    const result = findAll('post', options);
    assert.deepEqual(
      result,
      {
        op: 'findAll',
        data: {
          type: 'post',
          options,
        },
        cacheOptions: {},
      },
      `findAll works with options`
    );
  });
});
