import settled from '@ember/test-helpers/settled';

import { module, test } from 'qunit';
import RSVP from 'rsvp';

import JSONAPIAdapter from 'ember-data/adapters/json-api';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';

type RecordDataRecordWrapper =
  import('@ember-data/store/-private/ts-interfaces/record-data-record-wrapper').RecordDataRecordWrapper;
type NotificationManager = import('@ember-data/store/-private/system/record-notification-manager').default;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type RecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').RecordIdentifier;
type CoreStore = import('@ember-data/store/-private/system/core-store').default;
type Snapshot = import('ember-data/-private').Snapshot;

let CustomStore, store, schemaDefinition;
if (CUSTOM_MODEL_CLASS) {
  module('unit/model - Custom Class Model', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      let { owner } = this;

      class Person {
        constructor(public store: CoreStore) {
          this.store = store;
        }
        save() {
          return this.store.saveRecord(this);
        }
      }
      schemaDefinition = {
        attributesDefinitionFor() {
          return {
            name: {
              type: 'string',
            },
          };
        },
        relationshipsDefinitionFor() {
          return {};
        },
        doesTypeExist() {
          return true;
        },
      };

      CustomStore = Store.extend({
        init() {
          this._super(...arguments);
          this.registerSchemaDefinitionService(schemaDefinition);
        },
        instantiateRecord(identifier, createOptions, recordDataFor, notificationManager) {
          return new Person(this);
        },
        teardownRecord(record) {},
      });

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
            assert.equal(passedId, identifier, 'passed the identifier to the callback');
            if (notificationCount === 1) {
              assert.equal(key, 'state', 'passed the key');
            } else if (notificationCount === 2) {
              assert.equal(key, 'errors', 'passed the key');
            } else if (notificationCount === 3) {
              assert.equal(key, 'relationships', 'passed the key');
            }
          });
          return { hi: 'igor' };
        },
      });
      this.owner.register('service:store', CreationStore);
      store = this.owner.lookup('service:store');
      store.push({ data: { id: '1', type: 'person', name: 'chris' } });
      recordData.storeWrapper.notifyHasManyChange(identifier.type, identifier.id, identifier.lid, 'key');
      recordData.storeWrapper.notifyBelongsToChange(identifier.type, identifier.id, identifier.lid, 'key');
      recordData.storeWrapper.notifyStateChange(identifier.type, identifier.id, identifier.lid, 'key');
      recordData.storeWrapper.notifyErrorsChange(identifier.type, identifier.id, identifier.lid, 'key');
      await settled();

      assert.equal(notificationCount, 3, 'called notification callback');
    });

    test('record creation and teardown', function (assert) {
      assert.expect(5);
      let returnValue;
      let CreationStore = CustomStore.extend({
        instantiateRecord(identifier, createRecordArgs, recordDataFor, notificationManager) {
          assert.equal(identifier.type, 'person', 'Identifier type passed in correctly');
          assert.deepEqual(createRecordArgs, { name: 'chris' }, 'createRecordArg passed in');
          returnValue = {};
          return returnValue;
        },
        teardownRecord(record) {
          assert.equal(record, person, 'Passed in person to teardown');
        },
      });
      this.owner.register('service:store', CreationStore);
      store = this.owner.lookup('service:store');
      let person = store.createRecord('person', { name: 'chris' });
      assert.equal(returnValue, person, 'createRecord returns the instantiated record');
      assert.deepEqual(returnValue, person, 'record instantiating does not modify the returned value');
    });

    test('recordData lookup', function (assert) {
      assert.expect(1);
      let rd;
      let CreationStore = CustomStore.extend({
        instantiateRecord(identifier, createRecordArgs, recordDataFor, notificationManager) {
          rd = recordDataFor(identifier);
          assert.equal(rd.getAttr('name'), 'chris', 'Can look up record data from recordDataFor');
          return {};
        },
      });
      this.owner.register('service:store', CreationStore);
      store = this.owner.lookup('service:store');
      let schema = {
        attributesDefinitionFor(modelName: string) {
          return {
            name: {
              type: 'string',
              key: 'name',
              name: 'name',
              kind: 'attribute',
            },
          };
        },
        relationshipsDefinitionFor(modelName: string) {
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
      assert.expect(18);
      this.owner.register(
        'adapter:application',
        JSONAPIAdapter.extend({
          shouldBackgroundReloadRecord: () => false,
          createRecord: (store, type, snapshot: Snapshot) => {
            let count = 0;
            snapshot.eachAttribute((attr, attrDef) => {
              if (count === 0) {
                assert.equal(attr, 'name', 'attribute key is correct');
                assert.deepEqual(attrDef, { type: 'string', key: 'name', name: 'name' }, 'attribute def matches schem');
              } else if (count === 1) {
                assert.equal(attr, 'age', 'attribute key is correct');
                assert.deepEqual(attrDef, { type: 'number', key: 'age', name: 'age' }, 'attribute def matches schem');
              }
              count++;
            });
            count = 0;
            snapshot.eachRelationship((rel, relDef) => {
              if (count === 0) {
                assert.equal(rel, 'boats', 'relationship key is correct');
                assert.deepEqual(
                  relDef,
                  {
                    type: 'ship',
                    kind: 'hasMany',
                    inverse: null,
                    options: {},
                    key: 'boats',
                  },
                  'relationships def matches schem'
                );
              } else if (count === 1) {
                assert.equal(rel, 'house', 'relationship key is correct');
                assert.deepEqual(
                  relDef,
                  { type: 'house', kind: 'belongsTo', inverse: null, options: {}, key: 'house', name: 'house' },
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
      let schema = {
        attributesDefinitionFor(identifier: string | RecordIdentifier) {
          if (typeof identifier === 'string') {
            assert.equal(identifier, 'person', 'type passed in to the schema hooks');
          } else {
            assert.equal(identifier.type, 'person', 'type passed in to the schema hooks');
          }
          return {
            name: {
              type: 'string',
              key: 'name',
              name: 'name',
            },
            age: {
              type: 'number',
              key: 'age',
              name: 'age',
            },
          };
        },
        relationshipsDefinitionFor(identifier: string | RecordIdentifier) {
          if (typeof identifier === 'string') {
            assert.equal(identifier, 'person', 'type passed in to the schema hooks');
          } else {
            assert.equal(identifier.type, 'person', 'type passed in to the schema hooks');
          }
          return {
            boats: {
              type: 'ship',
              kind: 'hasMany',
              inverse: null,
              options: {},
              key: 'boats',
            },
            house: {
              type: 'house',
              kind: 'belongsTo',
              inverse: null,
              options: {},
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
            assert.equal(modelName, 'person', 'type passed in to the schema hooks');
          } else if (count === 1) {
            assert.equal(modelName, 'boat', 'type passed in to the schema hooks');
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
      assert.equal(person, promisePerson, 'save promise resolves with the same record');
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
            assert.equal(key, 'state', 'state change to deleted has been notified');
            assert.true(recordDataFor(identifier).isDeleted(), 'we have been marked as deleted');
          });
          return {};
        },
        teardownRecord(record) {
          assert.equal(record, person, 'Passed in person to teardown');
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
      let schema = {
        attributesDefinitionFor(identifier: string | RecordIdentifier) {
          let modelName = (identifier as RecordIdentifier).type || identifier;
          if (modelName === 'person') {
            return {
              name: {
                type: 'string',
                key: 'name',
                name: 'name',
              },
            };
          } else if (modelName === 'house') {
            return {
              address: {
                type: 'string',
              },
            };
          }
        },
        relationshipsDefinitionFor(identifier: string | RecordIdentifier) {
          let modelName = (identifier as RecordIdentifier).type || identifier;
          if (modelName === 'person') {
            return {
              house: {
                type: 'house',
                kind: 'belongsTo',
                inverse: null,
                options: {},
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
      let schema = {
        attributesDefinitionFor(modelName: string) {
          if (modelName === 'person') {
            return {
              name: {
                type: 'string',
                key: 'name',
                name: 'name',
              },
            };
          } else if (modelName === 'house') {
            return {
              address: {
                type: 'string',
              },
            };
          }
        },
        relationshipsDefinitionFor(modelName: string) {
          if (modelName === 'person') {
            return {
              house: {
                type: 'house',
                kind: 'belongsTo',
                inverse: null,
                options: {},
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
      store.push({
        data: {
          type: 'person',
          id: '7',
          attributes: { name: 'chris' },
          relationships: { house: { data: { type: 'house', id: '1' } } },
        },
      });
      let relationship = store.relationshipReferenceFor({ type: 'person', id: '7' }, 'house');
      assert.equal(relationship.id(), '1', 'house relationship id found');
      assert.equal(relationship.type, 'house', 'house relationship type found');
      assert.equal(relationship.parent.id(), '7', 'house relationship parent found');
    });

    test('relationshipReferenceFor hasMany', async function (assert) {
      assert.expect(3);
      this.owner.register('service:store', CustomStore);
      store = this.owner.lookup('service:store');
      let schema = {
        attributesDefinitionFor(modelName: string) {
          if (modelName === 'person') {
            return {
              name: {
                type: 'string',
                key: 'name',
                name: 'name',
              },
            };
          } else if (modelName === 'house') {
            return {
              address: {
                type: 'string',
              },
            };
          }
        },
        relationshipsDefinitionFor(modelName: string) {
          if (modelName === 'person') {
            return {
              house: {
                type: 'house',
                kind: 'hasMany',
                inverse: null,
                options: {},
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
      store.push({
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
      let relationship = store.relationshipReferenceFor({ type: 'person', id: '7' }, 'house');
      assert.deepEqual(relationship.ids(), ['1', '2'], 'relationship found');
      assert.equal(relationship.type, 'house', 'house relationship type found');
      assert.equal(relationship.parent.id(), '7', 'house relationship parent found');
    });
  });
}
