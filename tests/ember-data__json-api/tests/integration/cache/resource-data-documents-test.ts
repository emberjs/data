import Cache from '@ember-data/json-api';
import type { StructuredDataDocument, StructuredDocument } from '@ember-data/request';
import type { DocumentCacheOperation, NotificationType } from '@ember-data/store';
import Store from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import { isPrivateStore } from '@warp-drive/core/store/-private';
import type { PersistedResourceKey, RequestKey, ResourceKey } from '@warp-drive/core-types/identifier';
import { resourceSchema } from '@warp-drive/core-types/schema/fields';
import type { SingleResourceDataDocument } from '@warp-drive/core-types/spec/document';
import type { SingleResourceDocument } from '@warp-drive/core-types/spec/json-api-raw';
import { module, test } from '@warp-drive/diagnostic';

import { TestSchema } from '../../utils/schema';

type FakeRecord = { [key: string]: unknown; destroy: () => void };

class TestStore extends Store {
  createSchemaService() {
    const schema = new TestSchema();
    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        { name: 'name', kind: 'field' },
        { name: 'username', kind: 'field' },
      ],
    });
    return schema;
  }

  override createCache(wrapper: CacheCapabilitiesManager) {
    return new Cache(wrapper);
  }

  override instantiateRecord(identifier: ResourceKey) {
    const { id, lid, type } = identifier;
    const record: FakeRecord = { id, lid, type } as unknown as FakeRecord;
    Object.assign(record, this.cache.peek(identifier)!.attributes);

    const token = this.notifications.subscribe(identifier, (_: ResourceKey, kind: NotificationType, key?: string) => {
      if (kind === 'attributes' && key) {
        record[key] = this.cache.getAttr(identifier, key);
      }
    });

    record.destroy = () => {
      this.notifications.unsubscribe(token);
    };

    return record;
  }

  override teardownRecord(record: FakeRecord) {
    record.destroy();
  }
}

function asStructuredDocument<T>(doc: {
  request?: { url: string; cacheOptions?: { key?: string } };
  content: T;
}): StructuredDataDocument<T> {
  return doc as unknown as StructuredDataDocument<T>;
}

module('Integration | @ember-data/json-api Cache.put(<ResourceDataDocument>)', function (hooks) {
  test('simple single resource documents are correctly managed', function (assert) {
    const store = new TestStore();

    const responseDocument = store.cache.put(
      asStructuredDocument({
        content: {
          data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
        },
      })
    );
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
      type: 'user',
      id: '1',
    }) as PersistedResourceKey;

    assert.equal(responseDocument.data, identifier, 'We were given the correct data back');
  });

  test('single resource documents are correctly cached', function (assert) {
    const store = new TestStore();

    const responseDocument = store.cache.put(
      asStructuredDocument({
        request: { url: 'https://api.example.com/v1/users/1' },
        content: {
          data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
        },
      })
    );
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
      type: 'user',
      id: '1',
    }) as PersistedResourceKey;
    const reqIdentifier = store.cacheKeyManager.getOrCreateDocumentIdentifier({
      method: 'GET',
      url: 'https://api.example.com/v1/users/1',
    })!;

    assert.equal(responseDocument.data, identifier, 'We were given the correct data back');

    const structuredDocument = store.cache.peekRequest(reqIdentifier);
    assert.deepEqual(
      structuredDocument as Partial<StructuredDocument<SingleResourceDocument>>,
      {
        request: { url: 'https://api.example.com/v1/users/1' },
        content: {
          lid: 'https://api.example.com/v1/users/1',
          data: identifier,
        },
      },
      'We got the cached structured document back'
    );
    const cachedResponse = store.cache.peek(reqIdentifier);
    assert.deepEqual(
      cachedResponse,
      {
        lid: 'https://api.example.com/v1/users/1',
        data: identifier,
      },
      'We got the cached response document back'
    );
  });

  test('data documents respect cacheOptions.key', function (assert) {
    const store = new TestStore();

    const responseDocument = store.cache.put(
      asStructuredDocument({
        request: { url: 'https://api.example.com/v1/users/1', cacheOptions: { key: 'user-1' } },
        content: {
          data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
        },
      })
    );
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
      type: 'user',
      id: '1',
    }) as PersistedResourceKey;
    const reqIdentifier = store.cacheKeyManager.getOrCreateDocumentIdentifier({
      method: 'GET',
      url: 'https://api.example.com/v1/users/1',
      cacheOptions: { key: 'user-1' },
    })!;
    assert.equal(reqIdentifier?.lid, 'user-1', 'respects cacheOptions.key');
    assert.equal(responseDocument.data, identifier, 'We were given the correct data back');

    const structuredDocument = store.cache.peekRequest(reqIdentifier);
    assert.deepEqual(
      structuredDocument as Partial<StructuredDocument<SingleResourceDocument>>,
      {
        request: { url: 'https://api.example.com/v1/users/1', cacheOptions: { key: 'user-1' } },
        content: {
          lid: 'user-1',
          data: identifier,
        },
      },
      'We got the cached structured document back'
    );

    const cachedResponse = store.cache.peek(reqIdentifier);
    assert.deepEqual(
      cachedResponse,
      {
        lid: 'user-1',
        data: identifier,
      },
      'We got the cached response document back'
    );
  });

  test("notifications are generated for create and update of the document's cache key", function (assert) {
    assert.expect(10);
    const store = new TestStore();
    const documentIdentifier = store.cacheKeyManager.getOrCreateDocumentIdentifier({
      url: '/api/v1/query?type=user&name=Chris&limit=1',
    })!;

    let isUpdating = false;
    store.notifications.subscribe('document', (identifier: RequestKey, type: DocumentCacheOperation) => {
      if (isUpdating) {
        assert.equal(type, 'updated', 'We were notified of an update');
        assert.equal(identifier, documentIdentifier, 'We were notified of the correct document');
      } else {
        assert.equal(type, 'added', 'We were notified of an add');
        assert.equal(identifier, documentIdentifier, 'We were notified of the correct document');
      }
    });

    store.notifications.subscribe(documentIdentifier, (identifier: RequestKey, type: DocumentCacheOperation) => {
      if (isUpdating) {
        assert.equal(type, 'updated', 'We were notified of an update');
        assert.equal(identifier, documentIdentifier, 'We were notified of the correct document');
      } else {
        assert.equal(type, 'added', 'We were notified of an add');
        assert.equal(identifier, documentIdentifier, 'We were notified of the correct document');
      }
    });

    isPrivateStore(store)._run(() => {
      const responseDocument = store.cache.put(
        asStructuredDocument({
          request: {
            url: '/api/v1/query?type=user&name=Chris&limit=1',
          },
          content: {
            data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
          },
        })
      );
      const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

      assert.equal(responseDocument.data, identifier, 'We were given the correct data back');
    });

    isUpdating = true;
    isPrivateStore(store)._run(() => {
      const responseDocument2 = store.cache.put(
        asStructuredDocument({
          request: {
            url: '/api/v1/query?type=user&name=Chris&limit=1',
          },
          content: {
            data: { type: 'user', id: '2', attributes: { name: 'Chris' } },
          },
        })
      );
      const identifier2 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      assert.equal(responseDocument2.data, identifier2, 'We were given the correct data back');
    });
  });

  test('resources are accessible via `peek`', function (assert) {
    const store = new TestStore();

    const responseDocument = store.cache.put(
      asStructuredDocument({
        content: {
          data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
        },
      })
    );
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.equal(responseDocument.data, identifier, 'We were given the correct data back');

    let resourceData = store.cache.peek(identifier);

    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'Chris' }, relationships: {} },
      'We can fetch from the cache'
    );

    const record = store.peekRecord<{ name: string | null }>(identifier);

    assert.equal(record?.name, 'Chris', 'record name is correct');

    store.cache.setAttr(identifier, 'name', 'James');
    resourceData = store.cache.peek(identifier);

    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'James' }, relationships: {} },
      'Resource Blob is kept updated in the cache after mutation'
    );

    store.cache.put(
      asStructuredDocument({
        content: {
          data: { type: 'user', id: '1', attributes: { username: '@runspired' } },
        },
      })
    );

    resourceData = store.cache.peek(identifier);
    assert.deepEqual(
      resourceData,
      {
        type: 'user',
        id: '1',
        lid: '@lid:user-1',
        attributes: { name: 'James', username: '@runspired' },
        relationships: {},
      },
      'Resource Blob is kept updated in the cache after additional put'
    );

    store.cache.rollbackAttrs(identifier);
    resourceData = store.cache.peek(identifier);
    assert.deepEqual(
      resourceData,
      {
        type: 'user',
        id: '1',
        lid: '@lid:user-1',
        attributes: { name: 'Chris', username: '@runspired' },
        relationships: {},
      },
      'Resource Blob is kept updated in the cache after rollback'
    );
  });

  test('single resource relationships are accessible via `peek`', function (assert) {
    const store = new TestStore();
    store.schema.registerResource(
      resourceSchema({
        legacy: true,
        identity: { kind: '@id', name: 'id' },
        type: 'user',
        fields: [
          { name: 'name', kind: 'attribute', type: null },
          {
            name: 'bestFriend',
            kind: 'belongsTo',
            type: 'user',
            options: {
              async: false,
              inverse: 'bestFriend',
            },
          },
          {
            name: 'worstEnemy',
            kind: 'belongsTo',
            type: 'user',
            options: {
              async: false,
              inverse: null,
            },
          },
          {
            name: 'friends',
            kind: 'hasMany',
            type: 'user',
            options: {
              async: false,
              inverse: 'friends',
            },
          },
        ],
      })
    );

    let responseDocument: SingleResourceDataDocument;
    isPrivateStore(store)._run(() => {
      responseDocument = store.cache.put(
        asStructuredDocument({
          content: {
            data: {
              type: 'user',
              id: '1',
              attributes: { name: 'Chris' },
              relationships: {
                bestFriend: {
                  data: { type: 'user', id: '2' },
                },
                worstEnemy: {
                  data: { type: 'user', id: '3' },
                },
                friends: {
                  data: [
                    { type: 'user', id: '2' },
                    { type: 'user', id: '3' },
                  ],
                },
              },
            },
            included: [
              {
                type: 'user',
                id: '2',
                attributes: { name: 'Wesley' },
                relationships: {
                  bestFriend: {
                    data: { type: 'user', id: '1' },
                  },
                  friends: {
                    data: [
                      { type: 'user', id: '1' },
                      { type: 'user', id: '3' },
                    ],
                  },
                },
              },
              {
                type: 'user',
                id: '3',
                attributes: { name: 'Rey' },
                relationships: {
                  bestFriend: {
                    data: null,
                  },
                  friends: {
                    data: [
                      { type: 'user', id: '1' },
                      { type: 'user', id: '2' },
                    ],
                  },
                },
              },
            ],
          },
        })
      );
    });
    const identifier1 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
    const identifier2 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
    const identifier3 = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '3' });

    assert.equal(responseDocument!.data, identifier1, 'We were given the correct data back');

    const resourceData1 = store.cache.peek(identifier1);
    const resourceData2 = store.cache.peek(identifier2);
    const resourceData3 = store.cache.peek(identifier3);

    assert.deepEqual(
      resourceData1,
      {
        type: 'user',
        id: '1',
        lid: '@lid:user-1',
        attributes: { name: 'Chris' },
        relationships: {
          bestFriend: {
            data: identifier2,
          },
          friends: {
            data: [identifier2, identifier3],
          },
          worstEnemy: {
            data: identifier3,
          },
        },
      },
      'We can fetch from the cache'
    );
    assert.deepEqual(
      resourceData2,
      {
        type: 'user',
        id: '2',
        lid: '@lid:user-2',
        attributes: { name: 'Wesley' },
        relationships: {
          bestFriend: {
            data: identifier1,
          },
          friends: {
            data: [identifier1, identifier3],
          },
        },
      },
      'We can fetch included data from the cache'
    );
    assert.deepEqual(
      resourceData3,
      {
        type: 'user',
        id: '3',
        lid: '@lid:user-3',
        attributes: { name: 'Rey' },
        relationships: {
          bestFriend: {
            data: null,
          },
          friends: {
            data: [identifier1, identifier2],
          },
        },
      },
      'We can fetch more included data from the cache'
    );
  });

  test('generated default values are retained', function (assert) {
    const store = new TestStore();
    let i = 0;

    store.schema.registerResource({
      identity: null,
      type: 'user',
      fields: [
        {
          name: 'name',
          kind: 'attribute' as const,
          type: null,
          options: {
            defaultValue: () => {
              i++;
              return `Name ${i}`;
            },
          },
        },
      ],
    });

    isPrivateStore(store)._run(() => {
      store.cache.put(
        asStructuredDocument({
          content: {
            data: {
              type: 'user',
              id: '1',
              attributes: {},
            },
          },
        })
      );
    });
    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    const name1 = store.cache.getAttr(identifier, 'name');
    assert.equal(name1, 'Name 1', 'The default value was generated');
    const name2 = store.cache.getAttr(identifier, 'name');
    assert.equal(name2, 'Name 1', 'The default value was cached');

    store.cache.setAttr(identifier, 'name', 'Chris');
    const name3 = store.cache.getAttr(identifier, 'name');
    assert.equal(name3, 'Chris', 'The value was updated');

    store.cache.setAttr(identifier, 'name', null);
    const name4 = store.cache.getAttr(identifier, 'name');
    assert.equal(name4, null, 'Null was set and maintained');

    store.cache.rollbackAttrs(identifier);
    const name5 = store.cache.getAttr(identifier, 'name');
    assert.equal(name5, 'Name 2', 'The default value was regenerated');

    isPrivateStore(store)._run(() => {
      store.cache.put(
        asStructuredDocument({
          content: {
            data: {
              type: 'user',
              id: '1',
              attributes: {
                name: 'Tomster',
              },
            },
          },
        })
      );
    });

    const name6 = store.cache.getAttr(identifier, 'name');
    assert.equal(name6, 'Tomster', 'The value was updated on put');
  });
});
