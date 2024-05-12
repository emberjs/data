import Cache from '@ember-data/json-api';
import { serializePatch, serializeResources } from '@ember-data/json-api/request';
import type { NotificationType } from '@ember-data/store';
import Store from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { FieldSchema, LegacyAttributeField, LegacyRelationshipSchema } from '@warp-drive/core-types/schema/fields';
import type { ResourceObject } from '@warp-drive/core-types/spec/json-api-raw';
import { module, test } from '@warp-drive/diagnostic';

type FakeRecord = { [key: string]: unknown; destroy: () => void };
class TestStore extends Store {
  override createCache(wrapper: CacheCapabilitiesManager) {
    return new Cache(wrapper);
  }

  override instantiateRecord(identifier: StableRecordIdentifier) {
    const { id, lid, type } = identifier;
    const record: FakeRecord = { id, lid, type } as unknown as FakeRecord;
    Object.assign(record, (this.cache.peek(identifier) as ResourceObject).attributes);

    const token = this.notifications.subscribe(
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

  override teardownRecord(record: FakeRecord) {
    record.destroy();
  }
}

type AttributesSchema = Record<string, LegacyAttributeField>;
type RelationshipsSchema = Record<string, LegacyRelationshipSchema>;
type Schemas<T extends string> = Record<T, { attributes: AttributesSchema; relationships: RelationshipsSchema }>;
class TestSchema<T extends string> {
  declare schemas: Schemas<T>;
  constructor(schemas?: Schemas<T>) {
    this.schemas = schemas || ({} as Schemas<T>);
  }

  attributesDefinitionFor(identifier: { type: T }): AttributesSchema {
    return this.schemas[identifier.type]?.attributes || {};
  }

  _fieldsDefCache: Record<string, Map<string, FieldSchema>> = {};

  fields(identifier: { type: T }): Map<string, FieldSchema> {
    const { type } = identifier;
    let fieldDefs: Map<string, FieldSchema> | undefined = this._fieldsDefCache[type];

    if (fieldDefs === undefined) {
      fieldDefs = new Map();
      this._fieldsDefCache[type] = fieldDefs;

      const attributes = this.attributesDefinitionFor(identifier);
      const relationships = this.relationshipsDefinitionFor(identifier);

      for (const attr of Object.values(attributes)) {
        fieldDefs.set(attr.name, attr);
      }

      for (const rel of Object.values(relationships)) {
        fieldDefs.set(rel.name, rel);
      }
    }

    return fieldDefs;
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
                  { type: 'user', id: '2', lid: '@lid:user-2' } as StableRecordIdentifier,
                  { type: 'user', id: '3', lid: '@lid:user-3' } as StableRecordIdentifier,
                  { type: 'user', id: '4', lid: '@lid:user-4' } as StableRecordIdentifier,
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
                  { type: 'user', id: '3', lid: '@lid:user-3' } as StableRecordIdentifier,
                  { type: 'user', id: '4', lid: '@lid:user-4' } as StableRecordIdentifier,
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
                  { type: 'user', id: '3', lid: '@lid:user-3' } as StableRecordIdentifier,
                  { type: 'user', id: '2', lid: '@lid:user-2' } as StableRecordIdentifier,
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
