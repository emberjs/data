import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Cache from '@ember-data/json-api';
import Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { CollectionResourceDataDocument, StructuredDocument } from '@ember-data/types/cache/document';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import { DSModel } from '@ember-data/types/q/ds-model';
import type { CollectionResourceDocument } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import { JsonApiResource } from '@ember-data/types/q/record-data-json-api';
import { AttributesSchema, RelationshipsSchema } from '@ember-data/types/q/record-data-schemas';

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
  constructor(schemas: Schemas<T>) {
    this.schemas = schemas;
  }

  attributesDefinitionFor(identifier: { type: T }): AttributesSchema {
    return this.schemas[identifier.type]?.attributes || {};
  }

  relationshipsDefinitionFor(identifier: { type: T }): RelationshipsSchema {
    return this.schemas[identifier.type]?.relationships || {};
  }

  doesTypeExist(type: string) {
    return type === 'user';
  }
}

module('Integration | @ember-data/json-api Cache.put(<CollectionDataDocument>)', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', TestStore);
  });

  test('simple collection resource documents are correctly managed', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      content: {
        data: [
          { type: 'user', id: '1', attributes: { name: 'Chris' } },
          { type: 'user', id: '2', attributes: { name: 'Wesley' } },
        ],
      },
    } as StructuredDocument<CollectionResourceDocument>) as CollectionResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
    const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });

    assert.deepEqual(responseDocument.data, [identifier, identifier2], 'We were given the correct data back');
  });

  test('collection resource documents are correctly cached', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      request: { url: 'https://api.example.com/v1/users' },
      content: {
        data: [
          { type: 'user', id: '1', attributes: { name: 'Chris' } },
          { type: 'user', id: '2', attributes: { name: 'Wesley' } },
        ],
      },
    } as StructuredDocument<CollectionResourceDocument>) as CollectionResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
    const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });

    assert.deepEqual(responseDocument.data, [identifier, identifier2], 'We were given the correct data back');

    const structuredDocument = store.cache.peekRequest({ lid: 'https://api.example.com/v1/users' });
    assert.deepEqual(
      structuredDocument,
      {
        request: { url: 'https://api.example.com/v1/users' },
        content: {
          lid: 'https://api.example.com/v1/users',
          data: [identifier, identifier2],
        },
      },
      'We got the cached structured document back'
    );
    const cachedResponse = store.cache.peek({ lid: 'https://api.example.com/v1/users' });
    assert.deepEqual(
      cachedResponse,
      {
        lid: 'https://api.example.com/v1/users',
        data: [identifier, identifier2],
      },
      'We got the cached response document back'
    );
  });

  test('resources are accessible via `peek`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      content: {
        data: [{ type: 'user', id: '1', attributes: { name: 'Chris' } }],
      },
    } as StructuredDocument<CollectionResourceDocument>) as CollectionResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.deepEqual(responseDocument.data, [identifier], 'We were given the correct data back');

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
        data: [{ type: 'user', id: '1', attributes: { username: '@runspired' } }],
      },
    } as StructuredDocument<CollectionResourceDocument>);

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

  test('resource relationships are accessible via `peek`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

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

    let responseDocument: CollectionResourceDataDocument;
    store._run(() => {
      responseDocument = store.cache.put({
        content: {
          data: [
            {
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
          ],
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
      } as StructuredDocument<CollectionResourceDocument>) as CollectionResourceDataDocument;
    });
    const identifier1 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
    const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
    const identifier3 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' });

    assert.deepEqual(responseDocument!.data, [identifier1], 'We were given the correct data back');

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
