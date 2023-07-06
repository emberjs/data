import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Cache from '@ember-data/json-api';
import Store from '@ember-data/store';
import type { CacheOperation, NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { SingleResourceDataDocument, StructuredDocument } from '@ember-data/types/cache/document';
import type { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import type { DSModel } from '@ember-data/types/q/ds-model';
import type { SingleResourceDocument } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiResource } from '@ember-data/types/q/record-data-json-api';
import type { AttributesSchema, RelationshipsSchema } from '@ember-data/types/q/record-data-schemas';

type FakeRecord = { [key: string]: unknown; destroy: () => void };
class TestStore extends Store {
  createCache(wrapper: CacheStoreWrapper) {
    return new Cache(wrapper);
  }

  instantiateRecord(identifier: StableRecordIdentifier) {
    const { id, lid, type } = identifier;
    const record: FakeRecord = { id, lid, type } as unknown as FakeRecord;
    Object.assign(record, (this.cache.peek(identifier) as JsonApiResource).attributes);

    let token = this.notifications.subscribe(
      identifier,
      (_: StableRecordIdentifier, kind: NotificationType, key?: string) => {
        if (kind === 'attributes' && key) {
          record[key] = this.cache.getAttr(identifier, key);
        }
      }
    );

    record.destroy = () => {
      this.notifications.unsubscribe(token);
    };

    return record;
  }

  teardownRecord(record: FakeRecord) {
    record.destroy();
  }
}

type Schemas<T extends string> = Record<T, { attributes: AttributesSchema; relationships: RelationshipsSchema }>;
class TestSchema<T extends string> {
  declare schemas: Schemas<T>;
  constructor(schemas?: Schemas<T>) {
    this.schemas = schemas || ({} as Schemas<T>);
  }

  attributesDefinitionFor(identifier: { type: T }): AttributesSchema {
    return this.schemas[identifier.type]?.attributes || {};
  }

  relationshipsDefinitionFor(identifier: { type: T }): RelationshipsSchema {
    return this.schemas[identifier.type]?.relationships || {};
  }

  doesTypeExist(type: string) {
    return type in this.schemas ? true : Object.keys(this.schemas).length === 0 ? true : false;
  }
}

module('Integration | @ember-data/json-api Cache.put(<ResourceDataDocument>)', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', TestStore);
  });

  test('simple single resource documents are correctly managed', function (assert) {
    const store = this.owner.lookup('service:store') as unknown as Store;
    store.registerSchemaDefinitionService(new TestSchema());

    const responseDocument = store.cache.put({
      content: {
        data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
      },
    } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');
  });

  test('single resource documents are correctly cached', function (assert) {
    const store = this.owner.lookup('service:store') as unknown as Store;
    store.registerSchemaDefinitionService(new TestSchema());

    const responseDocument = store.cache.put({
      request: { url: 'https://api.example.com/v1/users/1' },
      content: {
        data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
      },
    } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');

    const structuredDocument = store.cache.peekRequest({ lid: 'https://api.example.com/v1/users/1' });
    assert.deepEqual(
      structuredDocument,
      {
        request: { url: 'https://api.example.com/v1/users/1' },
        content: {
          lid: 'https://api.example.com/v1/users/1',
          data: identifier,
        },
      },
      'We got the cached structured document back'
    );
    const cachedResponse = store.cache.peek({ lid: 'https://api.example.com/v1/users/1' });
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
    const store = this.owner.lookup('service:store') as unknown as Store;
    store.registerSchemaDefinitionService(new TestSchema());

    const responseDocument = store.cache.put({
      request: { url: 'https://api.example.com/v1/users/1', cacheOptions: { key: 'user-1' } },
      content: {
        data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
      },
    } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');

    const structuredDocument = store.cache.peekRequest({ lid: 'user-1' });
    const structuredDocument2 = store.cache.peekRequest({ lid: 'https://api.example.com/v1/users/1' });
    assert.strictEqual(structuredDocument2, null, 'we did not use the url as the key');
    assert.deepEqual(
      structuredDocument,
      {
        request: { url: 'https://api.example.com/v1/users/1', cacheOptions: { key: 'user-1' } },
        content: {
          lid: 'user-1',
          data: identifier,
        },
      },
      'We got the cached structured document back'
    );

    const cachedResponse = store.cache.peek({ lid: 'user-1' });
    const cachedResponse2 = store.cache.peek({ lid: 'https://api.example.com/v1/users/1' });
    assert.strictEqual(cachedResponse2, null, 'we did not use the url as the key');
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
    const store = this.owner.lookup('service:store') as unknown as Store;
    store.registerSchemaDefinitionService(new TestSchema());
    const documentIdentifier = store.identifierCache.getOrCreateDocumentIdentifier({
      url: '/api/v1/query?type=user&name=Chris&limit=1',
    })!;

    let isUpdating = false;
    store.notifications.subscribe('document', (identifier: StableDocumentIdentifier, type: CacheOperation) => {
      if (isUpdating) {
        assert.strictEqual(type, 'updated', 'We were notified of an update');
        assert.strictEqual(identifier, documentIdentifier, 'We were notified of the correct document');
      } else {
        assert.strictEqual(type, 'added', 'We were notified of an add');
        assert.strictEqual(identifier, documentIdentifier, 'We were notified of the correct document');
      }
    });

    store.notifications.subscribe(documentIdentifier, (identifier: StableDocumentIdentifier, type: CacheOperation) => {
      if (isUpdating) {
        assert.strictEqual(type, 'updated', 'We were notified of an update');
        assert.strictEqual(identifier, documentIdentifier, 'We were notified of the correct document');
      } else {
        assert.strictEqual(type, 'added', 'We were notified of an add');
        assert.strictEqual(identifier, documentIdentifier, 'We were notified of the correct document');
      }
    });

    store._run(() => {
      const responseDocument = store.cache.put({
        request: {
          url: '/api/v1/query?type=user&name=Chris&limit=1',
        },
        content: {
          data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
        },
      } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

      assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');
    });

    isUpdating = true;
    store._run(() => {
      const responseDocument2 = store.cache.put({
        request: {
          url: '/api/v1/query?type=user&name=Chris&limit=1',
        },
        content: {
          data: { type: 'user', id: '2', attributes: { name: 'Chris' } },
        },
      } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
      const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      assert.strictEqual(responseDocument2.data, identifier2, 'We were given the correct data back');
    });
  });

  test('resources are accessible via `peek`', function (assert) {
    const store = this.owner.lookup('service:store') as unknown as Store;
    store.registerSchemaDefinitionService(new TestSchema());

    const responseDocument = store.cache.put({
      content: {
        data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
      },
    } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');

    let resourceData = store.cache.peek(identifier);

    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'Chris' }, relationships: {} },
      'We can fetch from the cache'
    );

    const record = store.peekRecord(identifier) as DSModel;

    assert.strictEqual(record.name, 'Chris', 'record name is correct');

    store.cache.setAttr(identifier, 'name', 'James');
    resourceData = store.cache.peek(identifier);

    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'James' }, relationships: {} },
      'Resource Blob is kept updated in the cache after mutation'
    );

    store.cache.put({
      content: {
        data: { type: 'user', id: '1', attributes: { username: '@runspired' } },
      },
    } as StructuredDocument<SingleResourceDocument>);

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
    const store = this.owner.lookup('service:store') as unknown as Store;

    store.registerSchemaDefinitionService(
      new TestSchema<'user'>({
        user: {
          attributes: {
            name: { kind: 'attribute', name: 'name' },
          },
          relationships: {
            bestFriend: {
              kind: 'belongsTo',
              type: 'user',
              key: 'bestFriend',
              name: 'bestFriend',
              options: {
                async: false,
                inverse: 'bestFriend',
              },
            },
            worstEnemy: {
              kind: 'belongsTo',
              type: 'user',
              key: 'worstEnemy',
              name: 'worstEnemy',
              options: {
                async: false,
                inverse: null,
              },
            },
            friends: {
              kind: 'hasMany',
              type: 'user',
              key: 'friends',
              name: 'friends',
              options: {
                async: false,
                inverse: 'friends',
              },
            },
          },
        },
      })
    );

    let responseDocument: SingleResourceDataDocument;
    store._run(() => {
      responseDocument = store.cache.put({
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
      } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    });
    const identifier1 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
    const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
    const identifier3 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' });

    assert.strictEqual(responseDocument!.data, identifier1, 'We were given the correct data back');

    let resourceData1 = store.cache.peek(identifier1);
    let resourceData2 = store.cache.peek(identifier2);
    let resourceData3 = store.cache.peek(identifier3);

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
});
