import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { findRecord } from '@ember-data/legacy-compat/builders';
import Model, { attr } from '@ember-data/model';
import type Store from '@ember-data/store';

type FindRecordBuilderOptions = Exclude<Parameters<typeof findRecord>[1], undefined>;

class Post extends Model {
  @attr declare name: string;
}

module('Integration - legacy-compat/builders/findRecord', function (hooks) {
  setupTest(hooks);

  test('basic payload', async function (assert) {
    this.owner.register('model:post', Post);
    this.owner.register(
      'adapter:application',
      class Adapter {
        findRecord() {
          assert.step('adapter-findRecord');
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

    const store = this.owner.lookup('service:store') as Store;
    const { content: post } = await store.request<Post>(findRecord('post', '1'));

    assert.strictEqual(post.id, '1', 'post has correct id');
    assert.strictEqual(post.name, 'Krystan rules, you drool', 'post has correct name');
    assert.verifySteps(['adapter-findRecord'], 'adapter-findRecord was called');
  });

  test('findRecord by type+id', function (assert) {
    const result = findRecord('post', '1');
    assert.deepEqual(
      result,
      {
        op: 'findRecord',
        data: {
          record: { type: 'post', id: '1' },
          options: {},
        },
        cacheOptions: {},
      },
      `findRecord works with type+id`
    );
  });

  test('findRecord by type+id with options', function (assert) {
    const options: Required<FindRecordBuilderOptions> = {
      reload: true,
      backgroundReload: false,
      include: 'author,comments',
      adapterOptions: {},
    };
    const result = findRecord('post', '1', options);
    assert.deepEqual(
      result,
      {
        op: 'findRecord',
        data: {
          record: { type: 'post', id: '1' },
          options,
        },
        cacheOptions: {},
      },
      `findRecord works with type+id and options`
    );
  });

  test('findRecord by type+id with invalid options', async function (assert) {
    const invalidOptions = {
      preload: {},
    };
    await assert.expectAssertion(() => {
      // @ts-expect-error TS knows the options are invalid
      findRecord('post', '1', invalidOptions);
    }, 'Assertion Failed: findRecord builder does not support options.preload');
  });

  test('findRecord by identifier', function (assert) {
    const result = findRecord({ type: 'post', id: '1' });
    assert.deepEqual(
      result,
      {
        op: 'findRecord',
        data: {
          record: { type: 'post', id: '1' },
          options: {},
        },
        cacheOptions: {},
      },
      `findRecord works with an identifier`
    );
  });

  test('findRecord by identifier with options', function (assert) {
    const options: Required<FindRecordBuilderOptions> = {
      reload: true,
      backgroundReload: false,
      include: 'author,comments',
      adapterOptions: {},
    };
    const result = findRecord({ type: 'post', id: '1' }, options);
    assert.deepEqual(
      result,
      {
        op: 'findRecord',
        data: {
          record: { type: 'post', id: '1' },
          options,
        },
        cacheOptions: {},
      },
      `findRecord works with an identifier and options`
    );
  });

  test('findRecord by identifier with invalid options', async function (assert) {
    // Type hacks to ensure we're notified if we add new FindRecordOptions that aren't valid FindRecordBuilderOptions
    const invalidOptions = {
      preload: {},
    };
    await assert.expectAssertion(() => {
      // @ts-expect-error TS knows the options are invalid
      findRecord({ type: 'post', id: '1' }, invalidOptions);
    }, 'Assertion Failed: findRecord builder does not support options.preload');
  });
});
