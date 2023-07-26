import { module, test } from 'qunit';

import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import type { Snapshot } from '@ember-data/legacy-compat/-private';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { Cache } from '@ember-data/types/q/cache';
import type { RecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { AttributesSchema, RelationshipsSchema } from '@ember-data/types/q/record-data-schemas';
import type { SchemaService } from '@ember-data/types/q/schema-service';

module('unit/model - Custom Class Model', function (hooks: NestedHooks) {
  class Person {
    constructor(public store: Store) {
      this.store = store;
    }
    // these types aren't correct but we don't have a registry to help
    // make them correct yet
    save(): Promise<this> {
      return this.store.saveRecord(this) as Promise<this>;
    }
  }

  class CustomStore extends Store {
    constructor(args: Record<string, unknown>) {
      super(args);
      this.registerSchema({
        attributesDefinitionFor() {
          let schema: AttributesSchema = {};
          schema.name = {
            kind: 'attribute',
            options: {},
            type: 'string',
            name: 'name',
          };
          return schema;
        },
        relationshipsDefinitionFor() {
          return {};
        },
        doesTypeExist() {
          return true;
        },
      });
    }
    instantiateRecord(identifier, createOptions) {
      return new Person(this);
    }
    teardownRecord(record) {}
  }
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        createRecord: () => Promise.reject(),
      })
    );
    owner.register('serializer:application', JSONAPISerializer);
    // @ts-expect-error missing type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    owner.unregister('service:store');
  });

  test('notification manager', function (assert) {
    assert.expect(7);
    let notificationCount = 0;
    let identifier: StableRecordIdentifier;
    class CreationStore extends CustomStore {
      instantiateRecord(id: StableRecordIdentifier, createRecordArgs): Object {
        identifier = id;
        this.notifications.subscribe(identifier, (passedId, key) => {
          notificationCount++;
          assert.strictEqual(passedId, identifier, 'passed the identifier to the callback');
          if (notificationCount === 1) {
            assert.strictEqual(key, 'state', 'passed the key');
          } else if (notificationCount === 2) {
            assert.strictEqual(key, 'errors', 'passed the key');
          } else if (notificationCount === 3) {
            assert.strictEqual(key, 'relationships', 'passed the key');
          }
        });
        return { hi: 'igor' };
      }
    }
    this.owner.register('service:store', CreationStore);
    const store = this.owner.lookup('service:store') as Store;
    const storeWrapper = store._instanceCache._storeWrapper;
    store.push({ data: { id: '1', type: 'person', attributes: { name: 'chris' } } });
    // emulate this happening within a single push
    store._join(() => {
      storeWrapper.notifyChange(identifier, 'relationships', 'key');
      storeWrapper.notifyChange(identifier, 'relationships', 'key');
      storeWrapper.notifyChange(identifier, 'state');
      storeWrapper.notifyChange(identifier, 'errors');
    });

    assert.strictEqual(notificationCount, 3, 'called notification callback');
  });

  test('record creation and teardown', function (assert) {
    assert.expect(5);
    let returnValue: unknown;
    class CreationStore extends CustomStore {
      instantiateRecord(identifier: StableRecordIdentifier, createRecordArgs) {
        assert.strictEqual(identifier.type, 'person', 'Identifier type passed in correctly');
        assert.deepEqual(createRecordArgs, { otherProp: 'unk' }, 'createRecordArg passed in');
        returnValue = {};
        return returnValue;
      }
      teardownRecord(record) {
        assert.strictEqual(record, person, 'Passed in person to teardown');
      }
    }
    this.owner.register('service:store', CreationStore);
    const store = this.owner.lookup('service:store') as Store;
    let person = store.createRecord('person', { name: 'chris', otherProp: 'unk' }) as Record<string, unknown>;
    assert.strictEqual(returnValue, person, 'createRecord returns the instantiated record');
    assert.deepEqual(returnValue, person, 'record instantiating does not modify the returned value');
  });

  test('attribute and relationship with custom schema definition', async function (assert) {
    assert.expect(18);
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        createRecord: (store, type, snapshot: Snapshot) => {
          let count = 0;
          snapshot.eachAttribute((attr, attrDef) => {
            if (count === 0) {
              assert.strictEqual(attr, 'name', 'attribute key is correct');
              assert.deepEqual(
                attrDef,
                { kind: 'attribute', type: 'string', options: {}, name: 'name' },
                'attribute def matches schem'
              );
            } else if (count === 1) {
              assert.strictEqual(attr, 'age', 'attribute key is correct');
              assert.deepEqual(
                attrDef,
                { kind: 'attribute', type: 'number', options: {}, name: 'age' },
                'attribute def matches schem'
              );
            }
            count++;
          });
          count = 0;
          snapshot.eachRelationship((rel, relDef) => {
            if (count === 0) {
              assert.strictEqual(rel, 'boats', 'relationship key is correct');
              assert.deepEqual(
                relDef,
                {
                  type: 'ship',
                  kind: 'hasMany',
                  options: {
                    inverse: null,
                  },
                  name: 'boats',
                  key: 'boats',
                },
                'relationships def matches schem'
              );
            } else if (count === 1) {
              assert.strictEqual(rel, 'house', 'relationship key is correct');
              assert.deepEqual(
                relDef,
                { type: 'house', kind: 'belongsTo', options: { inverse: null }, key: 'house', name: 'house' },
                'relationship def matches schem'
              );
            }
            count++;
          });
          return Promise.resolve({ data: { type: 'person', id: '1' } });
        },
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-shadow
    class CustomStore extends Store {
      instantiateRecord(identifier, createOptions) {
        return new Person(this);
      }
      teardownRecord(record) {}
    }
    this.owner.register('service:store', CustomStore);
    const store = this.owner.lookup('service:store') as Store;
    let schema: SchemaService = {
      attributesDefinitionFor(identifier: RecordIdentifier | { type: string }): AttributesSchema {
        if (typeof identifier === 'string') {
          assert.strictEqual(identifier, 'person', 'type passed in to the schema hooks');
        } else {
          assert.strictEqual(identifier.type, 'person', 'type passed in to the schema hooks');
        }
        return {
          name: {
            type: 'string',
            kind: 'attribute',
            options: {},
            name: 'name',
          },
          age: {
            type: 'number',
            kind: 'attribute',
            options: {},
            name: 'age',
          },
        };
      },
      relationshipsDefinitionFor(identifier: RecordIdentifier | { type: string }): RelationshipsSchema {
        if (typeof identifier === 'string') {
          assert.strictEqual(identifier, 'person', 'type passed in to the schema hooks');
        } else {
          assert.strictEqual(identifier.type, 'person', 'type passed in to the schema hooks');
        }
        return {
          boats: {
            type: 'ship',
            kind: 'hasMany',
            options: {
              inverse: null,
            },
            key: 'boats',
            name: 'boats',
          },
          house: {
            type: 'house',
            kind: 'belongsTo',
            options: {
              inverse: null,
            },
            key: 'house',
            name: 'house',
          },
        };
      },
      doesTypeExist() {
        return true;
      },
    };
    store.registerSchemaDefinitionService(schema);
    let person = store.createRecord('person', { name: 'chris' }) as Person;
    await person.save();
  });

  test('store.saveRecord', async function (assert) {
    assert.expect(1);
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        createRecord: (store, type, snapshot) => {
          return Promise.resolve({ data: { type: 'person', id: '7' } });
        },
      })
    );
    this.owner.register('service:store', CustomStore);
    const store = this.owner.lookup('service:store') as Store;
    let person = store.createRecord('person', { name: 'chris' });
    let promisePerson = await store.saveRecord(person);
    assert.strictEqual(person, promisePerson, 'save promise resolves with the same record');
  });

  test('store.deleteRecord', async function (assert) {
    let ident: StableRecordIdentifier;
    assert.expect(10);
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        deleteRecord: (store, type, snapshot) => {
          assert.ok(true, 'adapter method called');
          return Promise.resolve();
        },
      })
    );
    const subscribedValues: string[] = [];
    class CreationStore extends CustomStore {
      instantiateRecord(identifier: StableRecordIdentifier, createRecordArgs) {
        ident = identifier;
        assert.false(this.cache.isDeleted(identifier), 'we are not deleted when we start');
        this.notifications.subscribe(identifier, (passedId, key: string) => {
          subscribedValues.push(key);
          assert.true(this.cache.isDeleted(identifier), 'we have been marked as deleted');
        });
        return {};
      }
      teardownRecord(record) {
        assert.strictEqual(record, person, 'Passed in person to teardown');
      }
    }
    this.owner.register('service:store', CreationStore);
    const store = this.owner.lookup('service:store') as unknown as Store;
    const rd: Cache = store.cache;
    let person = store.push({ data: { type: 'person', id: '1', attributes: { name: 'chris' } } });
    store.deleteRecord(person);
    assert.true(rd.isDeleted(ident!), 'record has been marked as deleted');
    await store.saveRecord(person);
    assert.true(rd.isDeletionCommitted(ident!), 'deletion has been commited');
    assert.strictEqual(subscribedValues.length, 3, 'we received the proper notifications');
    // TODO this indicates our implementation could likely be more efficient
    assert.deepEqual(subscribedValues, ['state', 'removed', 'state'], 'state change to deleted has been notified');
  });

  test('record serialize', function (assert) {
    assert.expect(1);
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        createRecord: (store, type, snapshot) => {
          return Promise.reject();
        },
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-shadow
    class CustomStore extends Store {
      instantiateRecord(identifier, createOptions) {
        return new Person(this);
      }
      teardownRecord(record) {}
    }
    this.owner.register('service:store', CustomStore);
    const store = this.owner.lookup('service:store') as Store;
    let schema: SchemaService = {
      attributesDefinitionFor(identifier: RecordIdentifier | { type: string }): AttributesSchema {
        let modelName = (identifier as RecordIdentifier).type || identifier;
        if (modelName === 'person') {
          return {
            name: {
              type: 'string',
              kind: 'attribute',
              options: {},
              name: 'name',
            },
          };
        } else if (modelName === 'house') {
          return {
            address: {
              type: 'string',
              kind: 'attribute',
              options: {},
              name: 'address',
            },
          };
        } else {
          return {};
        }
      },
      relationshipsDefinitionFor(identifier: RecordIdentifier | { type: string }): RelationshipsSchema {
        let modelName = (identifier as RecordIdentifier).type || identifier;
        if (modelName === 'person') {
          return {
            house: {
              type: 'house',
              kind: 'belongsTo',
              options: {
                inverse: null,
                async: true,
              },
              key: 'house',
              name: 'house',
            },
          };
        } else {
          return {};
        }
      },
      doesTypeExist() {
        return true;
      },
    };
    store.registerSchemaDefinitionService(schema);
    let person = store.push({
      data: {
        type: 'person',
        id: '7',
        attributes: { name: 'chris' },
        relationships: { house: { data: { type: 'house', id: '1' } } },
      },
    });
    let serialized = store.serializeRecord(person, { includeId: true });
    assert.deepEqual(
      {
        data: {
          id: '7',
          type: 'people',
          attributes: {
            name: 'chris',
          },
          relationships: {
            house: {
              data: {
                type: 'houses',
                id: '1',
              },
            },
          },
        },
      },
      serialized,
      'serializes record correctly'
    );
  });

  /*
  TODO determine if there's any validity to keeping these
  tes('relationshipReferenceFor belongsTo', async function (assert) {
    assert.expect(3);
    this.owner.register('service:store', CustomStore);
    store = this.owner.lookup('service:store') as unknown as Store;
    let schema: SchemaDefinitionService = {
      attributesDefinitionFor({ type: modelName }: { type: string }): AttributesSchema {
        if (modelName === 'person') {
          return {
            name: {
              type: 'string',
              kind: 'attribute',
              options: {},
              name: 'name',
            },
          };
        } else if (modelName === 'house') {
          return {
            address: {
              type: 'string',
              kind: 'attribute',
              options: {},
              name: 'address',
            },
          };
        } else {
          return {};
        }
      },
      relationshipsDefinitionFor({ type: modelName }: { type: string }): RelationshipsSchema {
        if (modelName === 'person') {
          return {
            house: {
              type: 'house',
              kind: 'belongsTo',
              options: {
                inverse: null,
              },
              key: 'house',
              name: 'house',
            },
          };
        } else {
          return {};
        }
      },
      doesTypeExist() {
        return true;
      },
    };
    store.registerSchemaDefinitionService(schema);
    store.push({
      data: {
        type: 'house',
        id: '1',
        attributes: { address: 'boat' },
      },
    });
    let person = store.push({
      data: {
        type: 'person',
        id: '7',
        attributes: { name: 'chris' },
        relationships: { house: { data: { type: 'house', id: '1' } } },
      },
    });
    let identifier = recordIdentifierFor(person);
    let relationship = store.relationshipReferenceFor({ type: 'person', id: '7', lid: identifier.lid }, 'house');
    assert.strictEqual(relationship.id(), '1', 'house relationship id found');
    assert.strictEqual(relationship.type, 'house', 'house relationship type found');
    assert.strictEqual(relationship.parent.id(), '7', 'house relationship parent found');
  });

  tes('relationshipReferenceFor hasMany', async function (assert) {
    assert.expect(3);
    this.owner.register('service:store', CustomStore);
    store = this.owner.lookup('service:store') as unknown as Store;
    let schema: SchemaDefinitionService = {
      attributesDefinitionFor({ type: modelName }: { type: string }): AttributesSchema {
        if (modelName === 'person') {
          return {
            name: {
              type: 'string',
              kind: 'attribute',
              options: {},
              name: 'name',
            },
          };
        } else if (modelName === 'house') {
          return {
            address: {
              type: 'string',
              kind: 'attribute',
              options: {},
              name: 'address',
            },
          };
        } else {
          return {};
        }
      },
      relationshipsDefinitionFor({ type: modelName }: { type: string }): RelationshipsSchema {
        if (modelName === 'person') {
          return {
            house: {
              type: 'house',
              kind: 'hasMany',
              options: {
                inverse: null,
              },
              key: 'house',
              name: 'house',
            },
          };
        } else {
          return {};
        }
      },
      doesTypeExist() {
        return true;
      },
    };
    store.registerSchemaDefinitionService(schema);
    store.push({
      data: {
        type: 'house',
        id: '1',
        attributes: { address: 'boat' },
      },
    });
    let person = store.push({
      data: {
        type: 'person',
        id: '7',
        attributes: { name: 'chris' },
        relationships: {
          house: {
            data: [
              { type: 'house', id: '1' },
              { type: 'house', id: '2' },
            ],
          },
        },
      },
    });
    let identifier = recordIdentifierFor(person);
    let relationship = store.relationshipReferenceFor({ type: 'person', id: '7', lid: identifier.lid }, 'house');
    assert.deepEqual(relationship.ids(), ['1', '2'], 'relationship found');
    assert.strictEqual(relationship.type, 'house', 'house relationship type found');
    assert.strictEqual(relationship.parent.id(), '7', 'house relationship parent found');
  });
  */
});
