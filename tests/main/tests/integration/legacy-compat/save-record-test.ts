import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type { CompatStore } from '@ember-data/legacy-compat';
import { saveRecord } from '@ember-data/legacy-compat/builders';
import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import { ResourceType } from '@warp-drive/core-types/symbols';

class Post extends Model {
  [ResourceType] = 'post' as const;
  @attr declare name: string;
}

type SaveRecordBuilderOptions = Exclude<Parameters<typeof saveRecord>[1], undefined>;

module('Integration - legacy-compat/builders/saveRecord', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:post', Post);
  });

  module('createRecord', function () {
    test('basic payload', async function (assert) {
      this.owner.register(
        'adapter:application',
        class Adapter {
          createRecord() {
            assert.step('adapter-createRecord');
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
      const newPost: Post = store.createRecord('post', { name: 'Krystan rules, you drool' });
      const { content: savedPost } = await store.request(saveRecord(newPost));

      assert.strictEqual(savedPost.id, '1', 'post has correct id');
      assert.strictEqual(savedPost.name, 'Krystan rules, you drool', 'post has correct name');
      assert.verifySteps(['adapter-createRecord'], 'adapter-createRecord was called');
    });

    test('saveRecord', function (assert) {
      const store = this.owner.lookup('service:store') as CompatStore;
      const newPost = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
      const identifier = recordIdentifierFor(newPost);
      const result = saveRecord(newPost);
      assert.deepEqual(
        result,
        {
          op: 'createRecord',
          data: {
            record: identifier,
            options: {},
          },
          records: [identifier],
          cacheOptions: {},
        },
        `saveRecord works`
      );
    });

    test('saveRecord with options', function (assert) {
      const options: Required<SaveRecordBuilderOptions> = {
        whatever: true,
        adapterOptions: {},
      };
      const store = this.owner.lookup('service:store') as CompatStore;
      const newPost: Post = store.createRecord('post', { name: 'Krystan rules, you drool' });
      const identifier = recordIdentifierFor(newPost);
      const result = saveRecord(newPost, options);
      assert.deepEqual(
        result,
        {
          op: 'createRecord',
          data: {
            record: identifier,
            options: options,
          },
          records: [identifier],
          cacheOptions: {},
        },
        `saveRecord works`
      );
    });
  });

  module('deleteRecord', function () {
    test('basic payload', async function (assert) {
      this.owner.register(
        'adapter:application',
        class Adapter {
          deleteRecord() {
            assert.step('adapter-deleteRecord');
            return Promise.resolve();
          }
          static create() {
            return new this();
          }
        }
      );

      const store = this.owner.lookup('service:store') as CompatStore;
      const existingPost = store.push<Post>({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            name: 'Krystan rules, you drool',
          },
        },
      });
      existingPost.deleteRecord();
      const { content: savedPost } = await store.request(saveRecord(existingPost));

      assert.strictEqual(savedPost.id, '1', 'post has correct id');
      assert.strictEqual(savedPost.name, 'Krystan rules, you drool', 'post has correct name');
      assert.true(savedPost.isDeleted, 'post isDeleted');
      assert.verifySteps(['adapter-deleteRecord'], 'adapter-deleteRecord was called');
    });

    test('saveRecord', function (assert) {
      const store = this.owner.lookup('service:store') as CompatStore;
      const existingPost: Post = store.push({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            name: 'Krystan rules, you drool',
          },
        },
      });
      existingPost.deleteRecord();
      const identifier = recordIdentifierFor(existingPost);
      const result = saveRecord(existingPost);
      assert.deepEqual(
        result,
        {
          op: 'deleteRecord',
          data: {
            record: identifier,
            options: {},
          },
          records: [identifier],
          cacheOptions: {},
        },
        `saveRecord works`
      );
    });

    test('saveRecord with options', function (assert) {
      const options: Required<SaveRecordBuilderOptions> = {
        whatever: true,
        adapterOptions: {},
      };
      const store = this.owner.lookup('service:store') as CompatStore;
      const existingPost: Post = store.push({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            name: 'Krystan rules, you drool',
          },
        },
      });
      existingPost.deleteRecord();
      const identifier = recordIdentifierFor(existingPost);
      const result = saveRecord(existingPost, options);
      assert.deepEqual(
        result,
        {
          op: 'deleteRecord',
          data: {
            record: identifier,
            options: options,
          },
          records: [identifier],
          cacheOptions: {},
        },
        `saveRecord works`
      );
    });
  });

  module('updateRecord', function () {
    test('basic payload', async function (assert) {
      this.owner.register(
        'adapter:application',
        class Adapter {
          updateRecord() {
            assert.step('adapter-updateRecord');
            return Promise.resolve();
          }
          static create() {
            return new this();
          }
        }
      );

      const store = this.owner.lookup('service:store') as CompatStore;
      const existingPost = store.push<Post>({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            name: 'Krystan rules, you drool',
          },
        },
      });
      existingPost.name = 'Chris drools, Krystan rules';
      const { content: savedPost } = await store.request(saveRecord(existingPost));

      assert.strictEqual(savedPost.id, '1', 'post has correct id');
      assert.strictEqual(savedPost.name, 'Chris drools, Krystan rules', 'post has correct name');
      assert.false(savedPost.isDeleted, 'post is not deleted');
      assert.verifySteps(['adapter-updateRecord'], 'adapter-updateRecord was called');
    });

    test('saveRecord', function (assert) {
      const store = this.owner.lookup('service:store') as CompatStore;
      const existingPost: Post = store.push({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            name: 'Krystan rules, you drool',
          },
        },
      });
      existingPost.name = 'Chris drools, Krystan rules';
      const identifier = recordIdentifierFor(existingPost);
      const result = saveRecord(existingPost);
      assert.deepEqual(
        result,
        {
          op: 'updateRecord',
          data: {
            record: identifier,
            options: {},
          },
          records: [identifier],
          cacheOptions: {},
        },
        `saveRecord works`
      );
    });

    test('saveRecord with options', function (assert) {
      const options: Required<SaveRecordBuilderOptions> = {
        whatever: true,
        adapterOptions: {},
      };
      const store = this.owner.lookup('service:store') as CompatStore;
      const existingPost: Post = store.push({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            name: 'Krystan rules, you drool',
          },
        },
      });
      existingPost.name = 'Chris drools, Krystan rules';
      const identifier = recordIdentifierFor(existingPost);
      const result = saveRecord(existingPost, options);
      assert.deepEqual(
        result,
        {
          op: 'updateRecord',
          data: {
            record: identifier,
            options: options,
          },
          records: [identifier],
          cacheOptions: {},
        },
        `saveRecord works`
      );
    });
  });
});
