import Cache from '@ember-data/json-api';
import Store from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { StableExistingRecordIdentifier, StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { Type } from '@warp-drive/core-types/symbols';
import { module, test } from '@warp-drive/diagnostic';
import { instantiateRecord, registerDerivations, teardownRecord, withDefaults } from '@warp-drive/schema-record';

import { TestSchema } from '../../utils/schema';

interface User {
  id: string;
  name: string;
  username: string;
  friends: User[];
  [Type]: 'user';
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
            name: 'friends',
            kind: 'hasMany',
            type: 'user',
            options: { inverse: 'friends', async: false, linksMode: true },
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

  instantiateRecord(identifier: StableRecordIdentifier, createArgs: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown) {
    teardownRecord(record);
  }
}

module('Integration | <JSONAPICache>.patch', function () {
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
    };
    const identifier = store.identifierCache.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier as StableExistingRecordIdentifier,
      value: user,
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');
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
    };
    const identifier = store.identifierCache.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier as StableExistingRecordIdentifier,
      value: user,
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');

    cache.patch({
      op: 'remove',
      record: identifier as StableExistingRecordIdentifier,
    });

    const removedRecord = store.peekRecord(identifier);
    assert.equal(removedRecord, null, 'The record is removed from the cache');
  });

  test('We can update a resource in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const user = {
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
    };
    const identifier = store.identifierCache.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier as StableExistingRecordIdentifier,
      value: user,
    });
    const user2 = {
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
    };
    const identifier2 = store.identifierCache.getOrCreateRecordIdentifier(user2);
    cache.patch({
      op: 'add',
      record: identifier2 as StableExistingRecordIdentifier,
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
      record: identifier as StableExistingRecordIdentifier,
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
    };
    const identifier = store.identifierCache.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier as StableExistingRecordIdentifier,
      value: user,
    });

    const record = store.peekRecord<User>(identifier);
    assert.equal(record?.name, 'John Doe', 'The name is correct');
    assert.equal(record?.username, 'johndoe', 'The username is correct');
    assert.equal(record?.id, '1', 'The id is correct');

    cache.patch({
      op: 'update',
      record: identifier as StableExistingRecordIdentifier,
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
    };
    const identifier = store.identifierCache.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier as StableExistingRecordIdentifier,
      value: user,
    });
    const user2 = {
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
    };
    const identifier2 = store.identifierCache.getOrCreateRecordIdentifier(user2);
    cache.patch({
      op: 'add',
      record: identifier2 as StableExistingRecordIdentifier,
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
      record: identifier as StableExistingRecordIdentifier,
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

  test('We can add to a resource relationship in the cache', function (assert) {});

  test('We can remove from a resource relationship in the cache', function (assert) {});

  test('We can add to a collection relationship in the cache', function (assert) {
    const store = new TestStore();
    const cache = store.cache;
    const user = {
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
    };
    const identifier = store.identifierCache.getOrCreateRecordIdentifier(user);
    cache.patch({
      op: 'add',
      record: identifier as StableExistingRecordIdentifier,
      value: user,
    });
    const user2 = {
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
    };
    const identifier2 = store.identifierCache.getOrCreateRecordIdentifier(user2);
    cache.patch({
      op: 'add',
      record: identifier2 as StableExistingRecordIdentifier,
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
      op: 'add',
      record: identifier as StableExistingRecordIdentifier,
      field: 'friends',
      value: identifier2 as StableExistingRecordIdentifier,
    });

    assert.equal(record?.friends?.length, 1, 'The friends collection has an entry');
    assert.equal(record2?.friends?.length, 1, 'The inverse friends collection has an entry');
  });

  test('We can remove from a collection relationship in the cache', function (assert) {});

  test('We can add to a collection relationship in the cache with an index', function (assert) {});

  test('We can remove from a collection relationship in the cache with an index', function (assert) {});

  test('We can add to data on a single resource document in the cache', function (assert) {});

  test('We can remove from data on a single resource document in the cache', function (assert) {});

  test('We can add to data on a collection resource document in the cache', function (assert) {});

  test('We can remove from data on a collection resource document in the cache', function (assert) {});

  test('We can add to data on a collection resource document in the cache with an index', function (assert) {});

  test('We can remove from data on a collection resource document in the cache with an index', function (assert) {});

  test('We can add to included on a resource document in the cache', function (assert) {});

  test('We can remove from included on a single resource document in the cache', function (assert) {});
});
