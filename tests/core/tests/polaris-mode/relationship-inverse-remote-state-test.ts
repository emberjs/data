import { recordIdentifierFor, useRecommendedStore } from '@warp-drive/core';
import { withDefaults } from '@warp-drive/core/reactive';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { Type } from '@warp-drive/core/types/symbols';
import { module, setupTest, test } from '@warp-drive/diagnostic/ember';
import { JSONAPICache } from '@warp-drive/json-api';

const Store = useRecommendedStore({
  cache: JSONAPICache,
});

interface Post {
  id: string | null;
  $type: 'post';
  title: string;
  [Type]: 'post';
}

interface Comment {
  id: string | null;
  $type: 'comment';
  body: string;
  [Type]: 'comment';
}

function registerSchemas(store: InstanceType<typeof Store>) {
  store.schema.registerResources([
    withDefaults({
      type: 'post',
      fields: [
        { name: 'title', kind: 'field' },
        { name: 'comments', kind: 'collection', type: 'comment', options: { inverse: 'post', async: false } },
      ],
    }),
    withDefaults({
      type: 'comment',
      fields: [
        { name: 'body', kind: 'field' },
        { name: 'post', kind: 'resource', type: 'post', options: { inverse: 'comments', async: false } },
      ],
    }),
  ]);
}

function keyOf(record: Post | Comment): ResourceKey {
  return recordIdentifierFor(record);
}

// The comments are included without a `post` relationship, so everything the
// cache knows about `comment.post` comes from inverse updates in the graph.
function pushPost(store: InstanceType<typeof Store>) {
  const post = store.push<Post>({
    data: {
      type: 'post',
      id: '1',
      attributes: { title: 'Relationships' },
      relationships: {
        comments: {
          data: [
            { type: 'comment', id: '1' },
            { type: 'comment', id: '2' },
          ],
        },
      },
    },
    included: [
      { type: 'comment', id: '1', attributes: { body: 'first' } },
      { type: 'comment', id: '2', attributes: { body: 'second' } },
    ],
  });
  const comment1 = store.peekRecord<Comment>('comment', '1')!;
  const comment2 = store.peekRecord<Comment>('comment', '2')!;
  return { post, comment1, comment2 };
}

module('Graph | remote state of inverses', function (hooks) {
  setupTest(hooks);

  test('an inverse populated by a remote update knows its remote state', function (assert) {
    const store = new Store();
    registerSchemas(store);
    const { post, comment1 } = pushPost(store);

    const remote = store.cache.getRemoteRelationship(keyOf(comment1), 'post');
    assert.equal(remote.data, keyOf(post), 'the remote state of the inverse is the post');
  });

  test('a remote update that confirms a local removal empties the remote state of the inverse', function (assert) {
    const store = new Store();
    registerSchemas(store);
    const { post, comment1, comment2 } = pushPost(store);

    store.cache.mutate({
      op: 'replaceRelatedRecords',
      record: keyOf(post),
      field: 'comments',
      value: [keyOf(comment2)],
    });
    assert.equal(
      store.cache.getRelationship(keyOf(comment1), 'post').data,
      null,
      'the local state of the inverse was cleared'
    );
    assert.equal(
      store.cache.getRemoteRelationship(keyOf(comment1), 'post').data,
      keyOf(post),
      'the remote state of the inverse is unchanged'
    );

    // e.g. the response to a save request
    store.push<Post>({
      data: {
        type: 'post',
        id: '1',
        relationships: { comments: { data: [{ type: 'comment', id: '2' }] } },
      },
    });

    const remote = store.cache.getRemoteRelationship(keyOf(comment1), 'post');
    assert.true('data' in remote, 'the remote state of the inverse is known');
    assert.equal(remote.data, null, 'the remote state of the inverse is empty');
    assert.deepEqual(
      store.cache.getRemoteRelationship(keyOf(post), 'comments').data,
      [keyOf(comment2)],
      'the remote state of the collection reflects the payload'
    );
  });
});
