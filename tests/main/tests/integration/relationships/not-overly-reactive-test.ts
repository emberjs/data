import { rerender } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest, setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';
import { Type } from '@warp-drive/core-types/symbols';

import { reactiveContext } from '../../helpers/reactive-context';

module('Integration | Not Overly Reactive', function (hooks) {
  setupTest(hooks);

  test('pushing an identical relationship state should not clear local mutations (inverse specified)', function (assert) {
    class Post extends Model {
      declare [Type]: 'post';
      @attr declare title: string;
      @hasMany('comment', { async: false, inverse: 'post', resetOnRemoteUpdate: false }) declare comments: Comment[];
    }

    class Comment extends Model {
      declare [Type]: 'comment';
      @attr declare text: string;
      @belongsTo('post', { async: false, inverse: 'comments' }) declare post: Post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    const store = this.owner.lookup('service:store') as Store;

    const post = store.push<Post>({
      data: {
        id: '1',
        type: 'post',
        attributes: {
          title: 'Post 1',
        },
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
      included: [
        {
          id: '1',
          type: 'comment',
          attributes: {
            text: 'Comment 1',
          },
          relationships: {
            post: {
              data: { id: '1', type: 'post' },
            },
          },
        },
        {
          id: '2',
          type: 'comment',
          attributes: {
            text: 'Comment 2',
          },
          relationships: {
            post: {
              data: { id: '1', type: 'post' },
            },
          },
        },
        {
          id: '3',
          type: 'comment',
          attributes: {
            text: 'Comment 3',
          },
          relationships: {
            post: {
              data: { id: '1', type: 'post' },
            },
          },
        },
      ],
    });
    const comment4 = store.push<Comment>({
      data: {
        id: '4',
        type: 'comment',
        attributes: {
          text: 'Comment 4',
        },
        relationships: {
          post: {
            data: null,
          },
        },
      },
    });

    assert.arrayStrictEquals(
      post.comments.map((v) => v.id),
      ['1', '2', '3'],
      'initial comments are present'
    );
    assert.strictEqual(comment4.post, null, 'initial comment 4 has no post');

    post.comments.push(comment4);

    assert.arrayStrictEquals(
      post.comments.map((v) => v.id),
      ['1', '2', '3', '4'],
      'comments are updated'
    );
    assert.strictEqual(comment4.post?.id, post?.id, 'comment 4 is updated');

    store.push<Post>({
      data: {
        id: '1',
        type: 'post',
        attributes: {
          title: 'Post 1',
        },
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

    assert.arrayStrictEquals(
      post.comments.map((v) => v.id),
      ['1', '2', '3', '4'],
      'comments are NOT updated'
    );
    assert.strictEqual(comment4.post?.id, post.id, 'comment 4 is NOT updated');
  });

  test('pushing an identical relationship state should not clear local mutations (inverse not specified)', function (assert) {
    class Post extends Model {
      declare [Type]: 'post';
      @attr declare title: string;
      @hasMany('comment', { async: false, inverse: 'post', resetOnRemoteUpdate: false }) declare comments: Comment[];
    }

    class Comment extends Model {
      declare [Type]: 'comment';
      @attr declare text: string;
      @belongsTo('post', { async: false, inverse: 'comments' }) declare post: Post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    const store = this.owner.lookup('service:store') as Store;

    const post = store.push<Post>({
      data: {
        id: '1',
        type: 'post',
        attributes: {
          title: 'Post 1',
        },
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
      included: [
        {
          id: '1',
          type: 'comment',
          attributes: {
            text: 'Comment 1',
          },
          relationships: {
            post: {
              data: { id: '1', type: 'post' },
            },
          },
        },
        {
          id: '2',
          type: 'comment',
          attributes: {
            text: 'Comment 2',
          },
          relationships: {
            post: {
              data: { id: '1', type: 'post' },
            },
          },
        },
        {
          id: '3',
          type: 'comment',
          attributes: {
            text: 'Comment 3',
          },
          relationships: {
            post: {
              data: { id: '1', type: 'post' },
            },
          },
        },
      ],
    });
    const comment4 = store.push<Comment>({
      data: {
        id: '4',
        type: 'comment',
        attributes: {
          text: 'Comment 4',
        },
        relationships: {
          post: {
            data: null,
          },
        },
      },
    });

    assert.arrayStrictEquals(
      post.comments.map((v) => v.id),
      ['1', '2', '3'],
      'initial comments are present'
    );
    assert.strictEqual(comment4.post, null, 'initial comment 4 has no post');

    post.comments.push(comment4);

    assert.arrayStrictEquals(
      post.comments.map((v) => v.id),
      ['1', '2', '3', '4'],
      'comments are updated'
    );
    assert.strictEqual(comment4.post?.id, post?.id, 'comment 4 is updated');

    store.push<Post>({
      data: {
        id: '1',
        type: 'post',
        attributes: {
          title: 'Post 1',
        },
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

    assert.arrayStrictEquals(
      post.comments.map((v) => v.id),
      ['1', '2', '3', '4'],
      'comments are NOT updated'
    );
    assert.strictEqual(comment4.post?.id, post.id, 'comment 4 is NOT updated');
  });
});

module('Integration | Not Overly Reactive (rendering)', function (hooks) {
  setupRenderingTest(hooks);

  test('pushing a relationship state identical to the local state should not notify (inverse specified)', async function (assert) {
    class Post extends Model {
      declare [Type]: 'post';
      @attr declare title: string;
      @hasMany('comment', { async: false, inverse: 'post', resetOnRemoteUpdate: false }) declare comments: Comment[];
    }

    class Comment extends Model {
      declare [Type]: 'comment';
      @attr declare text: string;
      @belongsTo('post', { async: false, inverse: 'comments' }) declare post: Post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    const store = this.owner.lookup('service:store') as Store;

    const post = store.push<Post>({
      data: {
        id: '1',
        type: 'post',
        attributes: {
          title: 'Post 1',
        },
        relationships: {
          comments: {
            data: [],
          },
        },
      },
      included: [
        {
          id: '1',
          type: 'comment',
          attributes: {
            text: 'Comment 1',
          },
          relationships: {
            post: {
              data: null,
            },
          },
        },
        {
          id: '2',
          type: 'comment',
          attributes: {
            text: 'Comment 2',
          },
          relationships: {
            post: {
              data: null,
            },
          },
        },
        {
          id: '3',
          type: 'comment',
          attributes: {
            text: 'Comment 3',
          },
          relationships: {
            post: {
              data: null,
            },
          },
        },
      ],
    });
    const comment1 = store.peekRecord<Comment>('comment', '1')!;
    const comment2 = store.peekRecord<Comment>('comment', '2')!;
    const comment3 = store.peekRecord<Comment>('comment', '3')!;

    const postSchema = Object.assign({}, store.schema.resource({ type: 'post' }));
    postSchema.fields = postSchema.fields.filter((field) => field.name === 'comments');
    postSchema.identity = null;

    const context = await reactiveContext.call(this, post, postSchema);
    assert.strictEqual(context.counters.comments, 1, 'rendered comments once');

    assert.arrayStrictEquals(
      post.comments.map((v) => v.id),
      [],
      'initially no comments are present'
    );

    post.comments = [comment1, comment2, comment3];

    await rerender();
    assert.strictEqual(context.counters.comments, 2, 'rendered comments twice');

    assert.arrayStrictEquals(
      post.comments.map((v) => v.id),
      ['1', '2', '3'],
      'comments are updated'
    );

    store.push<Post>({
      data: {
        id: '1',
        type: 'post',
        attributes: {
          title: 'Post 1',
        },
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

    assert.arrayStrictEquals(
      post.comments.map((v) => v.id),
      ['1', '2', '3'],
      'comments are NOT updated'
    );

    assert.strictEqual(context.counters.comments, 2, 'did not rerender comments');
  });

  deprecatedTest(
    'pushing a relationship state identical to the local state should not notify (inverse specified)',
    { id: 'ember-data:deprecate-relationship-remote-update-clearing-local-state', count: 0, until: '6.0.0' },
    async function (assert) {
      class Post extends Model {
        declare [Type]: 'post';
        @attr declare title: string;
        @hasMany('comment', { async: false, inverse: 'post' }) declare comments: Comment[];
      }

      class Comment extends Model {
        declare [Type]: 'comment';
        @attr declare text: string;
        @belongsTo('post', { async: false, inverse: 'comments' }) declare post: Post;
      }

      this.owner.register('model:post', Post);
      this.owner.register('model:comment', Comment);
      const store = this.owner.lookup('service:store') as Store;

      const post = store.push<Post>({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            title: 'Post 1',
          },
          relationships: {
            comments: {
              data: [],
            },
          },
        },
        included: [
          {
            id: '1',
            type: 'comment',
            attributes: {
              text: 'Comment 1',
            },
            relationships: {
              post: {
                data: null,
              },
            },
          },
          {
            id: '2',
            type: 'comment',
            attributes: {
              text: 'Comment 2',
            },
            relationships: {
              post: {
                data: null,
              },
            },
          },
          {
            id: '3',
            type: 'comment',
            attributes: {
              text: 'Comment 3',
            },
            relationships: {
              post: {
                data: null,
              },
            },
          },
        ],
      });
      const comment1 = store.peekRecord<Comment>('comment', '1')!;
      const comment2 = store.peekRecord<Comment>('comment', '2')!;
      const comment3 = store.peekRecord<Comment>('comment', '3')!;

      const postSchema = Object.assign({}, store.schema.resource({ type: 'post' }));
      postSchema.fields = postSchema.fields.filter((field) => field.name === 'comments');
      postSchema.identity = null;

      const context = await reactiveContext.call(this, post, postSchema);
      assert.strictEqual(context.counters.comments, 1, 'rendered comments once');

      assert.arrayStrictEquals(
        post.comments.map((v) => v.id),
        [],
        'initially no comments are present'
      );

      post.comments = [comment1, comment2, comment3];

      await rerender();
      assert.strictEqual(context.counters.comments, 2, 'rendered comments twice');

      assert.arrayStrictEquals(
        post.comments.map((v) => v.id),
        ['1', '2', '3'],
        'comments are updated'
      );

      store.push<Post>({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            title: 'Post 1',
          },
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

      assert.arrayStrictEquals(
        post.comments.map((v) => v.id),
        ['1', '2', '3'],
        'comments are NOT updated'
      );

      assert.strictEqual(context.counters.comments, 2, 'did not rerender comments');
    }
  );
});
