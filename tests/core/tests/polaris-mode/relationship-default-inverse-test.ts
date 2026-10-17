import { recordIdentifierFor, useRecommendedStore } from '@warp-drive/core';
import { withDefaults } from '@warp-drive/core/reactive';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { Type } from '@warp-drive/core/types/symbols';
import { module, setupTest, test } from '@warp-drive/diagnostic/ember';
import { JSONAPICache } from '@warp-drive/json-api';

const Store = useRecommendedStore({
  cache: JSONAPICache,
});

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  [Type]: 'user';
}

interface Post {
  id: string | null;
  $type: 'post';
  title: string;
  [Type]: 'post';
}

// `resource` and `collection` fields declared without `options.inverse` are unidirectional
function registerSchemas(store: InstanceType<typeof Store>) {
  store.schema.registerResources([
    withDefaults({
      type: 'user',
      fields: [{ name: 'name', kind: 'field' }],
    }),
    withDefaults({
      type: 'post',
      fields: [
        { name: 'title', kind: 'field' },
        { name: 'author', kind: 'resource', type: 'user', options: { async: false } },
        { name: 'reviewers', kind: 'collection', type: 'user', options: { async: false } },
      ],
    }),
  ]);
}

function keyOf(record: User | Post): ResourceKey {
  return recordIdentifierFor(record);
}

module('Graph | resource and collection fields without an inverse', function (hooks) {
  setupTest(hooks);

  test('a resource field declared without an inverse is unidirectional', function (assert) {
    const store = new Store();
    registerSchemas(store);

    const post = store.push<Post>({
      data: {
        type: 'post',
        id: '1',
        attributes: { title: 'Relationships' },
        relationships: { author: { data: { type: 'user', id: '1' } } },
      },
      included: [{ type: 'user', id: '1', attributes: { name: 'Chris' } }],
    });
    const chris = store.peekRecord<User>('user', '1')!;

    const author = store.cache.getRemoteRelationship(keyOf(post), 'author');
    assert.equal(author.data, keyOf(chris), 'the post has an author');
  });

  test('a collection field declared without an inverse is unidirectional', function (assert) {
    const store = new Store();
    registerSchemas(store);

    const post = store.push<Post>({
      data: {
        type: 'post',
        id: '1',
        attributes: { title: 'Relationships' },
        relationships: {
          reviewers: {
            data: [
              { type: 'user', id: '1' },
              { type: 'user', id: '2' },
            ],
          },
        },
      },
      included: [
        { type: 'user', id: '1', attributes: { name: 'Chris' } },
        { type: 'user', id: '2', attributes: { name: 'Krystan' } },
      ],
    });
    const chris = store.peekRecord<User>('user', '1')!;
    const krystan = store.peekRecord<User>('user', '2')!;

    const reviewers = store.cache.getRemoteRelationship(keyOf(post), 'reviewers');
    assert.deepEqual(reviewers.data, [keyOf(chris), keyOf(krystan)], 'the post has its reviewers');
  });
});
