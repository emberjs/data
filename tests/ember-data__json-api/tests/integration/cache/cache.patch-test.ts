import Cache from '@ember-data/json-api';
import type { ImmutableRequestInfo } from '@ember-data/request';
import Store from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { AddResourceOperation } from '@warp-drive/core-types/cache/operations';
import type { PersistedResourceKey, ResourceKey } from '@warp-drive/core-types/identifier';
import type {
  CollectionResourceDataDocument,
  ResourceDataDocument,
  SingleResourceDataDocument,
} from '@warp-drive/core-types/spec/document';
import type { ExistingResourceObject } from '@warp-drive/core-types/spec/json-api-raw';
import type { Type } from '@warp-drive/core-types/symbols';
import { module, test, todo } from '@warp-drive/diagnostic';
import { instantiateRecord, registerDerivations, teardownRecord, withDefaults } from '@warp-drive/schema-record';

import type { ReactiveDocument } from '../../../../../warp-drive-packages/core/src/reactive';
import { TestSchema } from '../../utils/schema';

interface User {
  id: string;
  name: string;
  username: string;
  bestFriend: User | null;
  friends: User[];
  pets: Pet[];
  [Type]: 'user';
}

interface Pet {
  id: string;
  name: string;
  owner: User;
}

class TestStore extends Store {
  createSchemaService() {
    const schema = new TestSchema();
    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          { name: 'name', kind: 'field' },
          { name: 'username', kind: 'field' },
          {
            name: 'bestFriend',
            kind: 'belongsTo',
            type: 'user',
            options: { inverse: 'bestFriend', async: false, linksMode: true },
          },
          {
            name: 'friends',
            kind: 'hasMany',
            type: 'user',
            options: { inverse: 'friends', async: false, linksMode: true },
          },
          {
            name: 'pets',
            kind: 'hasMany',
            type: 'pet',
            options: { inverse: 'owner', async: false, linksMode: true },
          },
        ],
      })
    );
    schema.registerResource(
      withDefaults({
        type: 'pet',
        fields: [
          { name: 'name', kind: 'field' },
          {
            name: 'owner',
            kind: 'belongsTo',
            type: 'user',
            options: { inverse: 'pets', async: false, linksMode: true },
          },
        ],
      })
    );
    registerDerivations(schema);
    return schema;
  }

  createCache(wrapper: CacheCapabilitiesManager) {
    return new Cache(wrapper);
  }

  instantiateRecord(identifier: ResourceKey, createArgs: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown) {
    teardownRecord(record);
  }
}

function setupRecord<T extends string>(store: Store, record: ExistingResourceObject<T>): PersistedResourceKey<T>;
function setupRecord(store: Store, record: ExistingResourceObject): PersistedResourceKey {
  const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier(record);
  store.cache.patch({
    op: 'add',
    record: identifier,
    value: record,
  } satisfies AddResourceOperation);

  return identifier;
}

function setupDocument(store: Store, url: string, doc: ResourceDataDocument<ExistingResourceObject>) {
  const requestDoc = {
    request: {
      url,
      method: 'GET',
    } satisfies ImmutableRequestInfo,
    content: doc,
    response: new Response(null),
  };
  const identifier = store.cacheKeyManager.getOrCreateDocumentIdentifier(requestDoc.request);
  store.cache.put(requestDoc);
  if (identifier === null) {
    throw new Error(`Document identifier should not be null for the test`);
  }
  return identifier;
}

function asDoc<T>(doc: unknown): T {
  if (doc === null) {
    throw new Error(`Document should be an object`);
  }
  return doc as T;
}

module('Integration | <JSONAPICache>.patch', function () {
  todo('We can remove a document from the cache', function (assert) {
    assert.ok(true, 'Implement this once we have a way to teardown reactive documents');
  });

  test('We can add a resource to the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const user = {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
    } as const;
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier,
      value: user,
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
  });

  test('We can perform bulk operations on the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const user = {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
    } as const;
    const user2 = {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
        username: 'chris',
      },
    } as const;
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier(user);
    const identifier2 = store.cacheKeyManager.getOrCreateRecordIdentifier(user2);

    cache.patch([
      {
        op: 'add',
        record: identifier,
        value: user,
      },
      {
        op: 'add',
        record: identifier2,
        value: user2,
      },
    ]);

    const record = store.peekRecord<User>(identifier);
    const record2 = store.peekRecord<User>(identifier2);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
    assert.equal(record2?.name, 'Chris', 'The name is correct');
    assert.equal(record2?.username, 'chris', 'The username is correct');
    assert.equal(record2?.id, '2', 'The id is correct');
  });

  test('We can remove a resource from the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const user = {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
    } as const;
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier,
      value: user,
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');

    cache.patch({
      op: 'remove',
      record: identifier,
    });

    const removedRecord = store.peekRecord(identifier);
    assert.equal(removedRecord, null, 'The record is removed from the cache');
  });

  test('We can update a resource in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
    assert.equal(record?.friends?.length, 0, 'The friends collection is empty');
    const record2 = store.peekRecord<User>(identifier2);
    assert.equal(record2?.name, 'Chris', 'The name is correct');
    assert.equal(record2?.id, '2', 'The id is correct');
    assert.equal(record2?.friends?.length, 0, 'The inverse friends collection is empty');

    cache.patch({
      op: 'update',
      record: identifier,
      value: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Jane Doe',
        },
        relationships: {
          friends: {
            data: [
              {
                id: '2',
                type: 'user',
              },
            ],
          },
        },
      },
    });

    const updatedRecord = store.peekRecord<User>(identifier);
    assert.equal(updatedRecord?.name, 'Jane Doe', 'The name is updated');
    assert.equal(updatedRecord?.username, 'johndoe', 'The username is the same');

    assert.equal(record?.friends?.length, 1, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
  });

  test('We can update a single resource field (an attribute) in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const user = {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
    } as const;
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier,
      value: user,
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');

    cache.patch({
      op: 'update',
      record: identifier,
      field: 'name',
      value: 'Jane Doe',
    });

    const updatedRecord = store.peekRecord<User>(identifier);
    assert.equal(updatedRecord?.name, 'Jane Doe', 'The name is updated');
    assert.equal(updatedRecord?.username, 'johndoe', 'The username is the same');
  });

  test('We can update a single resource field (a relationship) in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const user = {
      id: '1',
      type: 'user' as const,
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    };
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier,
      value: user,
    });
    const user2 = {
      id: '2',
      type: 'user' as const,
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    };
    const identifier2 = store.cacheKeyManager.getOrCreateRecordIdentifier(user2);
    cache.patch({
      op: 'add',
      record: identifier2,
      value: user2,
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
    assert.equal(record?.friends?.length, 0, 'The friends collection is empty');
    const record2 = store.peekRecord<User>(identifier2);
    assert.equal(record2?.name, 'Chris', 'The name is correct');
    assert.equal(record2?.id, '2', 'The id is correct');
    assert.equal(record2?.friends?.length, 0, 'The inverse friends collection is empty');

    cache.patch({
      op: 'update',
      record: identifier,
      field: 'friends',
      value: {
        data: [
          {
            id: '2',
            type: 'user',
          },
        ],
      },
    });

    assert.equal(record?.friends?.length, 1, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
  });

  test('We can add to a resource relationship in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        bestFriend: {
          data: null,
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        bestFriend: {
          data: null,
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
    assert.equal(record?.bestFriend, null, 'The bestFriend is empty');
    const record2 = store.peekRecord<User>(identifier2);
    assert.equal(record2?.name, 'Chris', 'The name is correct');
    assert.equal(record2?.id, '2', 'The id is correct');
    assert.equal(record2?.bestFriend, null, 'The inverse bestFriend is empty');

    cache.patch({
      op: 'add',
      record: identifier,
      field: 'bestFriend',
      value: identifier2,
    });

    assert.equal(record?.bestFriend, record2, 'The bestFriend is set');
    assert.equal(record2?.bestFriend, record, 'The inverse bestFriend is set');
  });

  test('We can remove from a resource relationship in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        bestFriend: {
          data: { id: '2', type: 'user' },
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        bestFriend: {
          data: { id: '1', type: 'user' },
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');

    const record2 = store.peekRecord<User>(identifier2);
    assert.equal(record2?.name, 'Chris', 'The name is correct');
    assert.equal(record2?.id, '2', 'The id is correct');

    assert.equal(record?.bestFriend, record2, 'The bestFriend is set');
    assert.equal(record2?.bestFriend, record, 'The inverse bestFriend is set');

    cache.patch({
      op: 'remove',
      record: identifier,
      field: 'bestFriend',
      value: identifier2,
    });

    assert.equal(record?.bestFriend, null, 'The bestFriend is empty');
    assert.equal(record2?.bestFriend, null, 'The inverse bestFriend is empty');
  });

  test('We can add to a collection relationship in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
    assert.equal(record?.friends?.length, 0, 'The friends collection is empty');
    const record2 = store.peekRecord<User>(identifier2);
    assert.equal(record2?.name, 'Chris', 'The name is correct');
    assert.equal(record2?.id, '2', 'The id is correct');
    assert.equal(record2?.friends?.length, 0, 'The inverse friends collection is empty');

    cache.patch({
      op: 'add',
      record: identifier,
      field: 'friends',
      value: identifier2,
    });

    assert.equal(record?.friends?.length, 1, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
  });

  test('We can add multiple to a collection relationship in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });
    const identifier3 = setupRecord(store, {
      id: '3',
      type: 'user',
      attributes: {
        name: 'Wes',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
    assert.equal(record?.friends?.length, 0, 'The friends collection is empty');
    const record2 = store.peekRecord<User>(identifier2);
    assert.equal(record2?.name, 'Chris', 'The name is correct');
    assert.equal(record2?.id, '2', 'The id is correct');
    assert.equal(record2?.friends?.length, 0, 'The inverse friends collection is empty');
    const record3 = store.peekRecord<User>(identifier3);
    assert.equal(record3?.name, 'Wes', 'The name is correct');
    assert.equal(record3?.id, '3', 'The id is correct');
    assert.equal(record3?.friends?.length, 0, 'The inverse friends collection is empty');

    cache.patch({
      op: 'add',
      record: identifier,
      field: 'friends',
      value: [identifier2, identifier3],
    });

    assert.equal(record?.friends?.length, 2, 'The friends collection has two entries');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 1, 'The inverse friends collection has an entry');
  });

  test('We can add to a collection relationship in the cache with an index', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '2',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier3 = setupRecord(store, {
      id: '3',
      type: 'user',
      attributes: {
        name: 'Wes',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });
    const identifier4 = setupRecord(store, {
      id: '4',
      type: 'user',
      attributes: {
        name: 'Rey',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });
    const identifier5 = setupRecord(store, {
      id: '5',
      type: 'user',
      attributes: {
        name: 'Shen',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    const record2 = store.peekRecord<User>(identifier2);
    const record3 = store.peekRecord<User>(identifier3);
    const record4 = store.peekRecord<User>(identifier4);
    const record5 = store.peekRecord<User>(identifier5);
    assert.equal(record?.friends?.length, 1, 'The friends collection is not empty');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection is not empty');
    assert.equal(record3?.friends?.length, 0, 'The friends collection is empty');
    assert.equal(record4?.friends?.length, 0, 'The inverse friends collection is empty');
    assert.equal(record5?.friends?.length, 0, 'The inverse friends collection is empty');

    cache.patch({
      op: 'add',
      record: identifier,
      field: 'friends',
      value: identifier3,
      index: 0,
    });

    assert.equal(record?.friends?.length, 2, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 1, 'The friends collection has an entry');
    assert.equal(record4?.friends?.length, 0, 'The inverse friends collection is empty');
    assert.equal(record5?.friends?.length, 0, 'The inverse friends collection is empty');
    assert.equal(
      record?.friends?.map((friend) => friend.id).join(','),
      '3,2',
      'The friends collection is in the right order'
    );

    cache.patch({
      op: 'add',
      record: identifier,
      field: 'friends',
      value: [identifier4, identifier5],
      index: 1,
    });

    assert.equal(record?.friends?.length, 4, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record4?.friends?.length, 1, 'The inverse friends collection is not empty');
    assert.equal(record5?.friends?.length, 1, 'The inverse friends collection is not empty');
    assert.equal(
      record?.friends?.map((friend) => friend.id).join(','),
      '3,4,5,2',
      'The friends collection is in the right order'
    );
  });

  test('We can add multiple to a collection relationship in the cache with an index', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '2',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier3 = setupRecord(store, {
      id: '3',
      type: 'user',
      attributes: {
        name: 'Wes',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });
    const identifier4 = setupRecord(store, {
      id: '4',
      type: 'user',
      attributes: {
        name: 'Shen',
      },
      relationships: {
        friends: {
          data: [],
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
    assert.equal(record?.friends?.length, 1, 'The friends collection starts with an entry');
    const record2 = store.peekRecord<User>(identifier2);
    assert.equal(record2?.name, 'Chris', 'The name is correct');
    assert.equal(record2?.id, '2', 'The id is correct');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection starts with an entry');
    const record3 = store.peekRecord<User>(identifier3);
    assert.equal(record3?.name, 'Wes', 'The name is correct');
    assert.equal(record3?.id, '3', 'The id is correct');
    assert.equal(record3?.friends?.length, 0, 'The inverse friends collection is empty');
    const record4 = store.peekRecord<User>(identifier4);
    assert.equal(record4?.name, 'Shen', 'The name is correct');
    assert.equal(record4?.id, '4', 'The id is correct');
    assert.equal(record4?.friends?.length, 0, 'The inverse friends collection is empty');

    cache.patch({
      op: 'add',
      record: identifier,
      field: 'friends',
      value: [identifier3, identifier4],
      index: 0,
    });

    assert.equal(record?.friends?.length, 3, 'The friends collection has two entries');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record4?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(
      record?.friends?.map((friend) => friend.id).join(','),
      '3,4,2',
      'The friends collection is in the right order'
    );
  });

  test('We can remove from a collection relationship in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '2',
              type: 'user',
            },
            {
              id: '3',
              type: 'user',
            },
            {
              id: '4',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier3 = setupRecord(store, {
      id: '3',
      type: 'user',
      attributes: {
        name: 'Wes',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier4 = setupRecord(store, {
      id: '4',
      type: 'user',
      attributes: {
        name: 'Rey',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    const record2 = store.peekRecord<User>(identifier2);
    const record3 = store.peekRecord<User>(identifier3);
    const record4 = store.peekRecord<User>(identifier4);

    assert.equal(record?.friends?.length, 3, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record4?.friends?.length, 1, 'The inverse friends collection is not empty');
    assert.equal(
      record?.friends?.map((friend) => friend.id).join(','),
      '2,3,4',
      'The friends collection is in the right order'
    );

    cache.patch({
      op: 'remove',
      record: identifier,
      field: 'friends',
      value: identifier3,
    });

    assert.equal(record?.friends?.length, 2, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 0, 'The friends collection has an entry');
    assert.equal(record4?.friends?.length, 1, 'The inverse friends collection is empty');
    assert.equal(
      record?.friends?.map((friend) => friend.id).join(','),
      '2,4',
      'The friends collection is in the right order'
    );
  });

  test('We can remove multiple from a collection relationship in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '2',
              type: 'user',
            },
            {
              id: '3',
              type: 'user',
            },
            {
              id: '4',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier3 = setupRecord(store, {
      id: '3',
      type: 'user',
      attributes: {
        name: 'Wes',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier4 = setupRecord(store, {
      id: '4',
      type: 'user',
      attributes: {
        name: 'Rey',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
    assert.equal(record?.friends?.length, 3, 'The friends collection is not empty');
    const record2 = store.peekRecord<User>(identifier2);
    assert.equal(record2?.name, 'Chris', 'The name is correct');
    assert.equal(record2?.id, '2', 'The id is correct');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection is not empty');
    const record3 = store.peekRecord<User>(identifier3);
    assert.equal(record3?.name, 'Wes', 'The name is correct');
    assert.equal(record3?.id, '3', 'The id is correct');
    assert.equal(record3?.friends?.length, 1, 'The inverse friends collection is not empty');
    const record4 = store.peekRecord<User>(identifier4);
    assert.equal(record4?.name, 'Rey', 'The name is correct');
    assert.equal(record4?.id, '4', 'The id is correct');
    assert.equal(record4?.friends?.length, 1, 'The inverse friends collection is not empty');

    cache.patch({
      op: 'remove',
      record: identifier,
      field: 'friends',
      value: [identifier3, identifier4],
    });

    assert.equal(record?.friends?.length, 1, 'The friends collection has one entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has one entry');
    assert.equal(record3?.friends?.length, 0, 'The friends collection is empty');
    assert.equal(record4?.friends?.length, 0, 'The inverse friends collection is empty');
  });

  test('We can remove from a collection relationship in the cache with an index', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '3',
              type: 'user',
            },
            {
              id: '4',
              type: 'user',
            },
            {
              id: '5',
              type: 'user',
            },
            {
              id: '2',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier3 = setupRecord(store, {
      id: '3',
      type: 'user',
      attributes: {
        name: 'Wes',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier4 = setupRecord(store, {
      id: '4',
      type: 'user',
      attributes: {
        name: 'Rey',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier5 = setupRecord(store, {
      id: '5',
      type: 'user',
      attributes: {
        name: 'Shen',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    const record2 = store.peekRecord<User>(identifier2);
    const record3 = store.peekRecord<User>(identifier3);
    const record4 = store.peekRecord<User>(identifier4);
    const record5 = store.peekRecord<User>(identifier5);

    assert.equal(record?.friends?.length, 4, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record4?.friends?.length, 1, 'The inverse friends collection is not empty');
    assert.equal(record5?.friends?.length, 1, 'The inverse friends collection is not empty');
    assert.equal(
      record?.friends?.map((friend) => friend.id).join(','),
      '3,4,5,2',
      'The friends collection is in the right order'
    );

    cache.patch({
      op: 'remove',
      record: identifier,
      field: 'friends',
      value: identifier4,
      index: 1,
    });

    assert.equal(record?.friends?.length, 3, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 1, 'The friends collection has an entry');
    assert.equal(record4?.friends?.length, 0, 'The inverse friends collection is empty');
    assert.equal(record5?.friends?.length, 1, 'The inverse friends collection is empty');
    assert.equal(
      record?.friends?.map((friend) => friend.id).join(','),
      '3,5,2',
      'The friends collection is in the right order'
    );
  });

  test('We can remove multiple from a collection relationship in the cache with an index', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const identifier = setupRecord(store, {
      id: '1',
      type: 'user',
      attributes: {
        name: 'John Doe',
        username: 'johndoe',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '3',
              type: 'user',
            },
            {
              id: '4',
              type: 'user',
            },
            {
              id: '5',
              type: 'user',
            },
            {
              id: '2',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier3 = setupRecord(store, {
      id: '3',
      type: 'user',
      attributes: {
        name: 'Wes',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier4 = setupRecord(store, {
      id: '4',
      type: 'user',
      attributes: {
        name: 'Rey',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });
    const identifier5 = setupRecord(store, {
      id: '5',
      type: 'user',
      attributes: {
        name: 'Shen',
      },
      relationships: {
        friends: {
          data: [
            {
              id: '1',
              type: 'user',
            },
          ],
        },
      },
    });

    const record = store.peekRecord<User>(identifier);
    const record2 = store.peekRecord<User>(identifier2);
    const record3 = store.peekRecord<User>(identifier3);
    const record4 = store.peekRecord<User>(identifier4);
    const record5 = store.peekRecord<User>(identifier5);

    assert.equal(record?.friends?.length, 4, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record4?.friends?.length, 1, 'The inverse friends collection is not empty');
    assert.equal(record5?.friends?.length, 1, 'The inverse friends collection is not empty');
    assert.equal(
      record?.friends?.map((friend) => friend.id).join(','),
      '3,4,5,2',
      'The friends collection is in the right order'
    );

    cache.patch({
      op: 'remove',
      record: identifier,
      field: 'friends',
      value: [identifier4, identifier5],
      index: 1,
    });

    assert.equal(record?.friends?.length, 2, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
    assert.equal(record3?.friends?.length, 1, 'The friends collection has an entry');
    assert.equal(record4?.friends?.length, 0, 'The inverse friends collection is empty');
    assert.equal(record5?.friends?.length, 0, 'The inverse friends collection is empty');
    assert.equal(
      record?.friends?.map((friend) => friend.id).join(','),
      '3,2',
      'The friends collection is in the right order'
    );
  });

  test('We can add to data on a single resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/user/1', {
      data: null,
    });
    const userIdentifier = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Wesley',
      },
    });
    const user = store.peekRecord<User>(userIdentifier);
    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User | null>;
    const cacheDocument = store.cache.peek(documentIdentifier);

    assert.equal(user?.name, 'Wesley', 'The name is correct');
    assert.equal(reactiveDocument.data, null, 'The document has no resource');
    assert.equal(
      asDoc<SingleResourceDataDocument>(cacheDocument).data,
      null,
      'The document has no resource in the cache'
    );
    assert.equal(
      asDoc<SingleResourceDataDocument>(cacheDocument).included?.length,
      undefined,
      'The document has no included resources in the cache'
    );

    store.cache.patch({
      op: 'add',
      record: documentIdentifier,
      field: 'data',
      value: userIdentifier,
    });

    assert.equal(reactiveDocument.data, user, 'The reactive document has the resource');
    assert.equal(
      asDoc<SingleResourceDataDocument>(cacheDocument).data,
      userIdentifier,
      'The cache document has the resource'
    );
    assert.equal(
      asDoc<SingleResourceDataDocument>(cacheDocument).included?.length,
      undefined,
      'The document has no included resources in the cache'
    );
  });

  test('We can remove from data on a single resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/user/1', {
      data: {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Wesley',
        },
      },
      included: [],
    });
    const userIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
      id: '2',
      type: 'user',
    } as const) as PersistedResourceKey;
    const user = store.peekRecord<User>(userIdentifier);
    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User | null>;
    const cacheDocument = store.cache.peek(documentIdentifier);

    assert.equal(user?.name, 'Wesley', 'The name is correct');
    assert.equal(reactiveDocument.data, user, 'The document has the resource');
    assert.equal(
      asDoc<SingleResourceDataDocument>(cacheDocument).data,
      userIdentifier,
      'The document has the resource in the cache'
    );
    assert.equal(
      asDoc<SingleResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    store.cache.patch({
      op: 'remove',
      record: documentIdentifier,
      field: 'data',
      value: userIdentifier,
    });

    assert.equal(reactiveDocument.data, null, 'The reactive document has no resource');
    assert.equal(asDoc<SingleResourceDataDocument>(cacheDocument).data, null, 'The cache document has no resource');
    assert.equal(
      asDoc<SingleResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
  });

  test('We can add to data on a collection resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const user2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Wesley',
      },
      relationships: {
        pets: {
          data: [],
        },
      },
    });

    store.cache.patch({
      op: 'add',
      record: documentIdentifier,
      field: 'data',
      value: user2,
    });

    assert.equal(reactiveDocument.data?.length, 2, 'The document has two resources');
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      2,
      'The document has two resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
    assert.equal(reactiveDocument.data?.[0]?.id, '1', 'The document has the right resource');
    assert.equal(reactiveDocument.data?.[1]?.id, '2', 'The document has the right resource');
  });

  test('We can add multiple to data on a collection resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const user2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Wesley',
      },
    });
    const user3 = setupRecord(store, {
      id: '3',
      type: 'user',
      attributes: {
        name: 'Rey',
      },
    });

    store.cache.patch({
      op: 'add',
      record: documentIdentifier,
      field: 'data',
      value: [user2, user3],
    });

    assert.equal(reactiveDocument.data?.length, 3, 'The document has two resources');
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      3,
      'The document has three resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
    assert.equal(reactiveDocument.data?.[0]?.id, '1', 'The document has the right resource');
    assert.equal(reactiveDocument.data?.[1]?.id, '2', 'The document has the right resource');
    assert.equal(reactiveDocument.data?.[2]?.id, '3', 'The document has the right resource');
  });

  test('We can add to data on a collection resource document in the cache with an index', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const user2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Wesley',
      },
      relationships: {
        pets: {
          data: [],
        },
      },
    });

    store.cache.patch({
      op: 'add',
      record: documentIdentifier,
      field: 'data',
      value: user2,
      index: 0,
    });

    assert.equal(reactiveDocument.data?.length, 2, 'The document has two resources');
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      2,
      'The document has two resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
    assert.equal(reactiveDocument.data?.[0]?.id, '2', 'The document has the right resource');
    assert.equal(reactiveDocument.data?.[1]?.id, '1', 'The document has the right resource');
  });

  test('We can add multiple to data on a collection resource document in the cache with an index', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const user2 = setupRecord(store, {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Wesley',
      },
    });
    const user3 = setupRecord(store, {
      id: '3',
      type: 'user',
      attributes: {
        name: 'Rey',
      },
    });

    store.cache.patch({
      op: 'add',
      record: documentIdentifier,
      field: 'data',
      value: [user2, user3],
      index: 0,
    });

    assert.equal(reactiveDocument.data?.length, 3, 'The document has two resources');
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      3,
      'The document has three resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
    assert.equal(reactiveDocument.data?.[0]?.id, '2', 'The document has the right resource');
    assert.equal(reactiveDocument.data?.[1]?.id, '3', 'The document has the right resource');
    assert.equal(reactiveDocument.data?.[2]?.id, '1', 'The document has the right resource');
  });

  test('We can remove from data on a collection resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
        {
          id: '2',
          type: 'user',
          attributes: {
            name: 'Wesley',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 2, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      2,
      'The document has two resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const user2 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '2' } as const);

    store.cache.patch({
      op: 'remove',
      record: documentIdentifier,
      field: 'data',
      value: user2,
    });

    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
    assert.equal(reactiveDocument.data?.[0]?.id, '1', 'The document has the right resource');
  });

  test('We can remove multiple from data on a collection resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
        {
          id: '2',
          type: 'user',
          attributes: {
            name: 'Wesley',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 2, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      2,
      'The document has two resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const user1 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '1' } as const);
    const user2 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '2' } as const);

    store.cache.patch({
      op: 'remove',
      record: documentIdentifier,
      field: 'data',
      value: [user1, user2],
    });

    assert.equal(reactiveDocument.data?.length, 0, 'The document has no resources');
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      0,
      'The document has no resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
  });

  test('We can remove from data on a collection resource document in the cache with an index', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
        {
          id: '2',
          type: 'user',
          attributes: {
            name: 'Wesley',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 2, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      2,
      'The document has two resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const user2 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '2' } as const);

    store.cache.patch({
      op: 'remove',
      record: documentIdentifier,
      field: 'data',
      value: user2,
      index: 1,
    });

    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
    assert.equal(reactiveDocument.data?.[0]?.id, '1', 'The document has the right resource');
  });

  test('We can remove multiple from data on a collection resource document in the cache with an index', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
        {
          id: '2',
          type: 'user',
          attributes: {
            name: 'Wesley',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 2, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      2,
      'The document has two resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const user1 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '1' } as const);
    const user2 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '2' } as const);

    store.cache.patch({
      op: 'remove',
      record: documentIdentifier,
      field: 'data',
      value: [user1, user2],
      index: 0,
    });

    assert.equal(reactiveDocument.data?.length, 0, 'The document has no resources');
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      0,
      'The document has no resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
  });

  test('We can add to included on a resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const pet1 = setupRecord(store, {
      id: '1',
      type: 'pet',
      attributes: {
        name: 'Rey',
      },
    });

    store.cache.patch({
      op: 'add',
      record: documentIdentifier,
      field: 'included',
      value: pet1,
    });

    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      1,
      'The document has one included resources in the cache'
    );
  });

  test('We can add multiple to included on a resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );

    const pet1 = setupRecord(store, {
      id: '1',
      type: 'pet',
      attributes: {
        name: 'Rey',
      },
    });
    const pet2 = setupRecord(store, {
      id: '2',
      type: 'pet',
      attributes: {
        name: 'Shen',
      },
    });

    store.cache.patch({
      op: 'add',
      record: documentIdentifier,
      field: 'included',
      value: [pet1, pet2],
    });

    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      2,
      'The document has two included resources in the cache'
    );
  });

  test('We can remove from included on a resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [
        {
          id: '1',
          type: 'pet',
          attributes: {
            name: 'Rey',
          },
        },
        {
          id: '2',
          type: 'pet',
          attributes: {
            name: 'Shen',
          },
        },
      ],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      2,
      'The document has two included resources in the cache'
    );

    const pet1 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'pet', id: '1' } as const);
    const pet2 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'pet', id: '2' } as const);

    store.cache.patch({
      op: 'remove',
      record: documentIdentifier,
      field: 'included',
      value: [pet1],
    });

    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      1,
      'The document has one included resources in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.[0],
      pet2,
      'The document has the right included resource'
    );
  });

  test('We can remove multiple from included on a resource document in the cache', function (assert) {
    const store = new TestStore();
    const documentIdentifier = setupDocument(store, '/api/v1/users', {
      data: [
        {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            pets: {
              data: [],
            },
          },
        },
      ],
      included: [
        {
          id: '1',
          type: 'pet',
          attributes: {
            name: 'Rey',
          },
        },
        {
          id: '2',
          type: 'pet',
          attributes: {
            name: 'Shen',
          },
        },
      ],
    });

    const reactiveDocument = store._instanceCache.getDocument(documentIdentifier) as ReactiveDocument<User[]>;
    assert.equal(reactiveDocument.data?.length, 1, 'The document has one resource');

    const cacheDocument = store.cache.peek(documentIdentifier);
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      2,
      'The document has two included resources in the cache'
    );

    const pet1 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'pet', id: '1' } as const);
    const pet2 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'pet', id: '2' } as const);

    store.cache.patch({
      op: 'remove',
      record: documentIdentifier,
      field: 'included',
      value: [pet1, pet2],
    });

    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).data?.length,
      1,
      'The document has one resource in the cache'
    );
    assert.equal(
      asDoc<CollectionResourceDataDocument>(cacheDocument).included?.length,
      0,
      'The document has no included resources in the cache'
    );
  });
});
