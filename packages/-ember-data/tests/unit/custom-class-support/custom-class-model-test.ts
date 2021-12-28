import settled from '@ember/test-helpers/settled';

import { module, test } from 'qunit';
import RSVP from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store, { recordIdentifierFor } from '@ember-data/store';
import type { Snapshot } from '@ember-data/store/-private';
import type CoreStore from '@ember-data/store/-private/system/core-store';
import type NotificationManager from '@ember-data/store/-private/system/record-notification-manager';
import type { RecordIdentifier, StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { RecordDataRecordWrapper } from '@ember-data/store/-private/ts-interfaces/record-data-record-wrapper';
import type {
  AttributesSchema,
  RelationshipsSchema,
} from '@ember-data/store/-private/ts-interfaces/record-data-schemas';
import type { SchemaDefinitionService } from '@ember-data/store/-private/ts-interfaces/schema-definition-service';

module('unit/model - Custom Class Model', function (hooks) {
  let store: CoreStore;
  class Person {
    constructor(public store: Store) {
      this.store = store;
    }
    save() {
      return this.store.saveRecord(this);
    }
  }

  class CustomStore extends Store {
    init() {
      super.init();
      this.registerSchemaDefinitionService({
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
    instantiateRecord(identifier, createOptions, recordDataFor, notificationManager) {
      return new Person(this);
    }
    teardownRecord(record) {}
  }
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        createRecord: () => RSVP.reject(),
      })
    );
    owner.register('serializer:application', JSONAPISerializer);
    owner.unregister('service:store');
  });

  test('notification manager', async function (assert) {
    assert.expect(7);
    let notificationCount = 0;
    let identifier;
    let recordData;
    let CreationStore = CustomStore.extend({
      createRecordDataFor() {
        let rd = this._super(...arguments);
        recordData = rd;
        return rd;
      },
      instantiateRecord(
        id: StableRecordIdentifier,
        createRecordArgs,
        recordDataFor,
        notificationManager: NotificationManager
      ): Object {
        identifier = id;
        notificationManager.subscribe(identifier, (passedId, key) => {
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
      },
    });
    this.owner.register('service:store', CreationStore);
    store = this.owner.lookup('service:store');
    store.push({ data: { id: '1', type: 'person', attributes: { name: 'chris' } } });
    recordData.storeWrapper.notifyHasManyChange(identifier.type, identifier.id, identifier.lid, 'key');
    recordData.storeWrapper.notifyBelongsToChange(identifier.type, identifier.id, identifier.lid, 'key');
    recordData.storeWrapper.notifyStateChange(identifier.type, identifier.id, identifier.lid, 'key');
    recordData.storeWrapper.notifyErrorsChange(identifier.type, identifier.id, identifier.lid, 'key');
    await settled();

    assert.strictEqual(notificationCount, 3, 'called notification callback');
  });

  test('record creation and teardown', function (assert) {
    assert.expect(5);
    let returnValue;
    let CreationStore = CustomStore.extend({
      instantiateRecord(identifier, createRecordArgs, recordDataFor, notificationManager) {
        assert.strictEqual(identifier.type, 'person', 'Identifier type passed in correctly');
        assert.deepEqual(createRecordArgs, { otherProp: 'unk' }, 'createRecordArg passed in');
        returnValue = {};
        return returnValue;
      },
      teardownRecord(record) {
        assert.strictEqual(record, person, 'Passed in person to teardown');
      },
    });
    this.owner.register('service:store', CreationStore);
    store = this.owner.lookup('service:store');
    let person = store.createRecord('person', { name: 'chris', otherProp: 'unk' });
    assert.strictEqual(returnValue, person, 'createRecord returns the instantiated record');
    assert.deepEqual(returnValue, person, 'record instantiating does not modify the returned value');
  });

  test('recordData lookup', function (assert) {
    assert.expect(1);
    let rd;
    let CreationStore = CustomStore.extend({
      instantiateRecord(identifier, createRecordArgs, recordDataFor, notificationManager) {
        rd = recordDataFor(identifier);
        assert.strictEqual(rd.getAttr('name'), 'chris', 'Can look up record data from recordDataFor');
        return {};
      },
    });
    this.owner.register('service:store', CreationStore);
    store = this.owner.lookup('service:store');
    let schema: SchemaDefinitionService = {
      attributesDefinitionFor(modelName: string): AttributesSchema {
        return {
          name: {
            type: 'string',
            options: {},
            name: 'name',
            kind: 'attribute',
          },
        };
      },
      relationshipsDefinitionFor(modelName: string): RelationshipsSchema {
        return {};
      },
      doesTypeExist() {
        return true;
      },
    };
    store.registerSchemaDefinitionService(schema);

    store.createRecord('person', { name: 'chris' });
  });

  test('attribute and relationship with custom schema definition', async function (assert) {
    assert.expect(17);
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
          return RSVP.resolve({ data: { type: 'person', id: '1' } });
        },
      })
    );
    this.owner.register('service:store', CustomStore);
    store = this.owner.lookup('service:store');
    let schema: SchemaDefinitionService = {
      attributesDefinitionFor(identifier: string | RecordIdentifier): AttributesSchema {
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
      relationshipsDefinitionFor(identifier: string | RecordIdentifier): RelationshipsSchema {
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
    let person = store.createRecord('person', { name: 'chris' });
    await person.save();
  });

  test('hasModelFor with custom schema definition', async function (assert) {
    assert.expect(4);
    this.owner.register('service:store', CustomStore);
    store = this.owner.lookup('service:store');
    let count = 0;
    let schema = {
      attributesDefinitionFor() {
        return {};
      },
      relationshipsDefinitionFor() {
        return {};
      },
      doesTypeExist(modelName: string) {
        if (count === 0) {
          assert.strictEqual(modelName, 'person', 'type passed in to the schema hooks');
        } else if (count === 1) {
          assert.strictEqual(modelName, 'boat', 'type passed in to the schema hooks');
        }
        count++;
        return modelName === 'person';
      },
    };
    store.registerSchemaDefinitionService(schema);
    assert.true(store._hasModelFor('person'), 'hasModelFor matches schema hook when true');
    assert.false(store._hasModelFor('boat'), 'hasModelFor matches schema hook when false');
  });

  test('store.saveRecord', async function (assert) {
    assert.expect(1);
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        createRecord: (store, type, snapshot) => {
          return RSVP.resolve({ data: { type: 'person', id: '7' } });
        },
      })
    );
    this.owner.register('service:store', CustomStore);
    store = this.owner.lookup('service:store');
    let person = store.createRecord('person', { name: 'chris' });
    let promisePerson = await store.saveRecord(person);
    assert.strictEqual(person, promisePerson, 'save promise resolves with the same record');
  });

  test('store.deleteRecord', async function (assert) {
    let rd: RecordDataRecordWrapper;
    assert.expect(9);
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        deleteRecord: (store, type, snapshot) => {
          assert.ok(true, 'adapter method called');
          return RSVP.resolve();
        },
      })
    );
    let CreationStore = CustomStore.extend({
      instantiateRecord(identifier, createRecordArgs, recordDataFor, notificationManager) {
        rd = recordDataFor(identifier);
        assert.false(rd.isDeleted!(), 'we are not deleted when we start');
        notificationManager.subscribe(identifier, (passedId, key) => {
          assert.strictEqual(key, 'state', 'state change to deleted has been notified');
          assert.true(recordDataFor(identifier).isDeleted(), 'we have been marked as deleted');
        });
        return {};
      },
      teardownRecord(record) {
        assert.strictEqual(record, person, 'Passed in person to teardown');
      },
    });
    this.owner.register('service:store', CreationStore);
    store = this.owner.lookup('service:store');
    let person = store.push({ data: { type: 'person', id: '1', attributes: { name: 'chris' } } });
    store.deleteRecord(person);
    assert.true(rd!.isDeleted!(), 'record has been marked as deleted');
    await store.saveRecord(person);
    assert.true(rd!.isDeletionCommitted!(), 'deletion has been commited');
  });

  test('record serialize', function (assert) {
    assert.expect(1);
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        createRecord: (store, type, snapshot) => {
          return RSVP.reject();
        },
      })
    );
    this.owner.register('service:store', CustomStore);
    store = this.owner.lookup('service:store');
    let schema: SchemaDefinitionService = {
      attributesDefinitionFor(identifier: string | RecordIdentifier): AttributesSchema {
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
      relationshipsDefinitionFor(identifier: string | RecordIdentifier): RelationshipsSchema {
        let modelName = (identifier as RecordIdentifier).type || identifier;
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

  test('relationshipReferenceFor belongsTo', async function (assert) {
    assert.expect(3);
    this.owner.register('service:store', CustomStore);
    store = this.owner.lookup('service:store');
    let schema: SchemaDefinitionService = {
      attributesDefinitionFor(modelName: string): AttributesSchema {
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
      relationshipsDefinitionFor(modelName: string): RelationshipsSchema {
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

  test('relationshipReferenceFor hasMany', async function (assert) {
    assert.expect(3);
    this.owner.register('service:store', CustomStore);
    store = this.owner.lookup('service:store');
    let schema: SchemaDefinitionService = {
      attributesDefinitionFor(modelName: string): AttributesSchema {
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
      relationshipsDefinitionFor(modelName: string): RelationshipsSchema {
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
});
