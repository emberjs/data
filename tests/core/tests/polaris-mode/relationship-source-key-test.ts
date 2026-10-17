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

function registerUser(store: InstanceType<typeof Store>) {
  store.schema.registerResource(
    withDefaults({
      type: 'user',
      fields: [
        { name: 'name', kind: 'field' },
        {
          name: 'bestFriend',
          sourceKey: 'best-friend',
          type: 'user',
          kind: 'resource',
          options: { async: false, inverse: 'bestFriend' },
        },
        {
          name: 'friends',
          sourceKey: 'best-friends',
          type: 'user',
          kind: 'collection',
          options: { async: false, inverse: 'friends' },
        },
      ],
    })
  );
}

function keyOf(record: User): ResourceKey {
  return recordIdentifierFor(record);
}

// The graph keys its edges by the field's cache key (`sourceKey` when set). These tests
// push a payload that only describes one side of each relationship and then read the
// other side straight from the cache, so they hold regardless of how the reactive layer
// exposes `resource` and `collection` fields.
module('Graph | resource and collection fields with sourceKey', function (hooks) {
  setupTest(hooks);

  test('a resource field keyed by sourceKey updates its inverse', function (assert) {
    const store = new Store();
    registerUser(store);

    const [Rey, Matt] = store.push<User>({
      data: [
        {
          type: 'user',
          id: '1',
          attributes: { name: 'Rey' },
          relationships: { 'best-friend': { data: { type: 'user', id: '2' } } },
        },
        { type: 'user', id: '2', attributes: { name: 'Matt' } },
      ],
    });

    const reyBestFriend = store.cache.getRemoteRelationship(keyOf(Rey), 'best-friend');
    assert.equal(reyBestFriend.data, keyOf(Matt), 'Rey has Matt as bestFriend');

    const mattBestFriend = store.cache.getRemoteRelationship(keyOf(Matt), 'best-friend');
    assert.equal(mattBestFriend.data, keyOf(Rey), 'the inverse is recorded under the sourceKey');
  });

  test('a collection field keyed by sourceKey updates its inverse', function (assert) {
    const store = new Store();
    registerUser(store);

    const [Rey, Matt, Wes] = store.push<User>({
      data: [
        {
          type: 'user',
          id: '1',
          attributes: { name: 'Rey' },
          relationships: {
            'best-friends': {
              data: [
                { type: 'user', id: '2' },
                { type: 'user', id: '3' },
              ],
            },
          },
        },
        { type: 'user', id: '2', attributes: { name: 'Matt' } },
        { type: 'user', id: '3', attributes: { name: 'Wes' } },
      ],
    });

    const reyFriends = store.cache.getRemoteRelationship(keyOf(Rey), 'best-friends');
    assert.deepEqual(reyFriends.data, [keyOf(Matt), keyOf(Wes)], 'Rey has Matt and Wes as friends');

    const mattFriends = store.cache.getRemoteRelationship(keyOf(Matt), 'best-friends');
    assert.deepEqual(mattFriends.data, [keyOf(Rey)], "Matt's inverse is recorded under the sourceKey");

    const wesFriends = store.cache.getRemoteRelationship(keyOf(Wes), 'best-friends');
    assert.deepEqual(wesFriends.data, [keyOf(Rey)], "Wes's inverse is recorded under the sourceKey");
  });

  test('a local mutation keyed by sourceKey updates its inverse', function (assert) {
    const store = new Store();
    registerUser(store);

    const [Rey, Matt, Wes] = store.push<User>({
      data: [
        {
          type: 'user',
          id: '1',
          attributes: { name: 'Rey' },
          relationships: { 'best-friend': { data: { type: 'user', id: '2' } } },
        },
        { type: 'user', id: '2', attributes: { name: 'Matt' } },
        { type: 'user', id: '3', attributes: { name: 'Wes' } },
      ],
    });

    store.cache.mutate({
      op: 'replaceRelatedRecord',
      record: keyOf(Rey),
      field: 'best-friend',
      value: keyOf(Wes),
    });

    assert.equal(
      store.cache.getRelationship(keyOf(Rey), 'best-friend').data,
      keyOf(Wes),
      'the local state of the relationship was updated'
    );
    assert.equal(
      store.cache.getRelationship(keyOf(Wes), 'best-friend').data,
      keyOf(Rey),
      'the new inverse was updated under the sourceKey'
    );
    assert.equal(
      store.cache.getRelationship(keyOf(Matt), 'best-friend').data,
      null,
      'the prior inverse was cleared under the sourceKey'
    );
    assert.equal(
      store.cache.getRemoteRelationship(keyOf(Matt), 'best-friend').data,
      keyOf(Rey),
      'the remote state of the prior inverse is unchanged'
    );
  });
});
