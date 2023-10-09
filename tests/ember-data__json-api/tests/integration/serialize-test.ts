import { module, test } from '@warp-drive/diagnostic';

import Cache from '@ember-data/json-api';
import { serializePatch, serializeResources } from '@ember-data/json-api/request';
import Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { CacheCapabilitiesManager } from '@ember-data/types/q/cache-store-wrapper';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiResource } from '@ember-data/types/q/record-data-json-api';
import type { AttributesSchema, RelationshipsSchema } from '@ember-data/types/q/record-data-schemas';

type FakeRecord = { [key: string]: unknown; destroy: () => void };
class TestStore extends Store {
  createCache(wrapper: CacheCapabilitiesManager) {
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

module('Integration | @ember-data/json-api/request', function (hooks) {
  let store: TestStore;
  hooks.beforeEach(function () {
    store = new TestStore();

    store.registerSchema(
      new TestSchema<'user'>({
        user: {
          attributes: {
            firstName: { kind: 'attribute', name: 'firstName', type: null },
            lastName: { kind: 'attribute', name: 'lastName', type: null },
          },
          relationships: {
            bestFriend: {
              kind: 'belongsTo',
              type: 'user',
              name: 'bestFriend',
              options: {
                async: false,
                inverse: 'bestFriend',
              },
            },
            worstEnemy: {
              kind: 'belongsTo',
              type: 'user',
              name: 'worstEnemy',
              options: {
                async: false,
                inverse: null,
              },
            },
            friends: {
              kind: 'hasMany',
              type: 'user',
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

    store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { firstName: 'Chris', lastName: 'Thoburn' },
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
          attributes: { firstName: 'Wesley', lastName: 'Thoburn' },
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
          attributes: { firstName: 'Rey', lastName: 'Skybarker' },
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
    });
  });

  module('serializePatch', function () {
    test('Correctly serializes only changed attributes and relationships', function (assert) {
      const user1Identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      store.cache.setAttr(user1Identifier, 'firstName', 'Christopher');

      let patch = serializePatch(store.cache, user1Identifier);
      assert.deepEqual(
        patch,
        {
          data: {
            type: 'user',
            id: '1',
            lid: '@lid:user-1',
            attributes: {
              firstName: 'Christopher',
            },
          },
        },
        'Correctly serializes changed attributes'
      );

      // set the attr back to initial state to remove it from diff
      store.cache.setAttr(user1Identifier, 'firstName', 'Chris');

      store._join(() => {
        // change a belongsTo relationship
        store.cache.mutate({
          op: 'replaceRelatedRecord',
          record: user1Identifier,
          field: 'bestFriend',
          value: null,
        });
      });

      patch = serializePatch(store.cache, user1Identifier);
      assert.equal(patch.data.attributes, undefined, 'Correctly serializes changed attributes when there are none');
      assert.deepEqual(
        patch,
        {
          data: {
            type: 'user',
            id: '1',
            lid: '@lid:user-1',
            relationships: {
              bestFriend: {
                data: null,
              },
            },
          },
        },
        'Correctly serializes changed belongsTo relationships'
      );
      store.cache.rollbackRelationships(user1Identifier);

      store._join(() => {
        // change a hasMany relationship
        store.cache.mutate({
          op: 'addToRelatedRecords',
          record: user1Identifier,
          field: 'friends',
          value: store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '4' }),
        });
      });

      patch = serializePatch(store.cache, user1Identifier);
      assert.equal(patch.data.relationships?.bestFriend, undefined, 'Correctly serializes rolled back relationships');
      assert.deepEqual(
        patch,
        {
          data: {
            type: 'user',
            id: '1',
            lid: '@lid:user-1',
            relationships: {
              friends: {
                data: [
                  { type: 'user', id: '2', lid: '@lid:user-2' },
                  { type: 'user', id: '3', lid: '@lid:user-3' },
                  { type: 'user', id: '4', lid: '@lid:user-4' },
                ],
              },
            },
          },
        },
        'Correctly serializes changed hasMany relationships'
      );

      store._join(() => {
        // change a hasMany relationship
        store.cache.mutate({
          op: 'removeFromRelatedRecords',
          record: user1Identifier,
          field: 'friends',
          value: store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' }),
        });
      });

      patch = serializePatch(store.cache, user1Identifier);
      assert.deepEqual(
        patch,
        {
          data: {
            type: 'user',
            id: '1',
            lid: '@lid:user-1',
            relationships: {
              friends: {
                data: [
                  { type: 'user', id: '3', lid: '@lid:user-3' },
                  { type: 'user', id: '4', lid: '@lid:user-4' },
                ],
              },
            },
          },
        },
        'Correctly serializes changed hasMany relationships'
      );

      store._join(() => {
        // change a hasMany relationship
        store.cache.mutate({
          op: 'replaceRelatedRecords',
          record: user1Identifier,
          field: 'friends',
          value: [
            store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' }),
            store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' }),
          ],
        });
      });

      patch = serializePatch(store.cache, user1Identifier);
      assert.deepEqual(
        patch,
        {
          data: {
            type: 'user',
            id: '1',
            lid: '@lid:user-1',
            relationships: {
              friends: {
                data: [
                  { type: 'user', id: '3', lid: '@lid:user-3' },
                  { type: 'user', id: '2', lid: '@lid:user-2' },
                ],
              },
            },
          },
        },
        'Correctly serializes changed hasMany relationships'
      );
    });
  });

  module('serializeResources', function () {
    test('Correctly serializes single resources', function (assert) {
      const payload = serializeResources(
        store.cache,
        store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' })
      );
      assert.deepEqual(payload, {
        data: {
          type: 'user',
          id: '1',
          lid: '@lid:user-1',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
          relationships: {
            bestFriend: {
              data: { type: 'user', id: '2', lid: '@lid:user-2' },
            },
            worstEnemy: {
              data: { type: 'user', id: '3', lid: '@lid:user-3' },
            },
            friends: {
              data: [
                { type: 'user', id: '2', lid: '@lid:user-2' },
                { type: 'user', id: '3', lid: '@lid:user-3' },
              ],
            },
          },
        },
      });
    });
    test('Correctly serializes multiple resources', function (assert) {
      const payload = serializeResources(store.cache, [
        store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' }),
        store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' }),
        store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' }),
      ]);
      assert.deepEqual(payload, {
        data: [
          {
            type: 'user',
            id: '1',
            lid: '@lid:user-1',
            attributes: {
              firstName: 'Chris',
              lastName: 'Thoburn',
            },
            relationships: {
              bestFriend: {
                data: { type: 'user', id: '2', lid: '@lid:user-2' },
              },
              worstEnemy: {
                data: { type: 'user', id: '3', lid: '@lid:user-3' },
              },
              friends: {
                data: [
                  { type: 'user', id: '2', lid: '@lid:user-2' },
                  { type: 'user', id: '3', lid: '@lid:user-3' },
                ],
              },
            },
          },
          {
            type: 'user',
            id: '2',
            lid: '@lid:user-2',
            attributes: {
              firstName: 'Wesley',
              lastName: 'Thoburn',
            },
            relationships: {
              bestFriend: {
                data: { type: 'user', id: '1', lid: '@lid:user-1' },
              },
              friends: {
                data: [
                  { type: 'user', id: '1', lid: '@lid:user-1' },
                  { type: 'user', id: '3', lid: '@lid:user-3' },
                ],
              },
            },
          },
          {
            type: 'user',
            id: '3',
            lid: '@lid:user-3',
            attributes: {
              firstName: 'Rey',
              lastName: 'Skybarker',
            },
            relationships: {
              bestFriend: {
                data: null,
              },
              friends: {
                data: [
                  { type: 'user', id: '1', lid: '@lid:user-1' },
                  { type: 'user', id: '2', lid: '@lid:user-2' },
                ],
              },
            },
          },
        ],
      });
    });
  });
});
