import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { adapterFor, cleanup, normalize, pushPayload, serializeRecord, serializerFor } from '@ember-data/legacy-compat';
import type { Snapshot } from '@ember-data/legacy-compat/-private';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';
import { DEBUG } from '@warp-drive/build-config/env';
import type { Cache } from '@warp-drive/core-types/cache';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';

import { TestSchema } from '../../utils/schema';

module('unit/model - Custom Class Model', function (hooks: NestedHooks) {
  class Person {
    declare store: Store;
    constructor(store: Store) {
      this.store = store;
    }
    // these types aren't correct but we don't have a registry to help
    // make them correct yet
    save(): Promise<this> {
      return this.store.saveRecord(this);
    }
  }

  class TestStore extends Store {
    createSchemaService() {
      const schema = new TestSchema();
      schema.registerResource({
        identity: { name: 'id', kind: '@id' },
        type: 'person',
        fields: [
          {
            name: 'name',
            kind: 'attribute',
            type: null,
          },
        ],
      });
      return schema;
    }

    adapterFor = adapterFor;
    serializerFor = serializerFor;
    pushPayload = pushPayload;
    normalize = normalize;
    serializeRecord = serializeRecord;

    destroy() {
      cleanup.call(this);
      super.destroy();
    }
  }

  class CustomStore extends TestStore {
    instantiateRecord(identifier: StableRecordIdentifier, createOptions) {
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
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        createRecord: () => Promise.reject(),
      })
    );
    owner.register('serializer:application', JSONAPISerializer);
    // @ts-expect-error missing type
    owner.unregister('service:store');
  });

  test('notification manager', function (assert) {
    assert.expect(7);
    let notificationCount = 0;
    let identifier: StableRecordIdentifier;
    class CreationStore extends TestStore {
      instantiateRecord(id: StableRecordIdentifier, createRecordArgs): object {
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
    const capabilities = store._instanceCache._storeWrapper;
    store.push({ data: { id: '1', type: 'person', attributes: { name: 'chris' } } });
    // emulate this happening within a single push
    store._join(() => {
      capabilities.notifyChange(identifier, 'relationships', 'key');
      capabilities.notifyChange(identifier, 'relationships', 'key');
      capabilities.notifyChange(identifier, 'state');
      capabilities.notifyChange(identifier, 'errors');
    });

    assert.strictEqual(notificationCount, 3, 'called notification callback');
  });

  test('record creation and teardown', function (assert) {
    assert.expect(5);
    let returnValue: unknown;
    class CreationStore extends TestStore {
      instantiateRecord(identifier: StableRecordIdentifier, createRecordArgs) {
        assert.strictEqual(identifier.type, 'person', 'Identifier type passed in correctly');
        assert.deepEqual(createRecordArgs, { name: 'chris', otherProp: 'unk' }, 'createRecordArg passed in');
        returnValue = {};
        return returnValue;
      }
      teardownRecord(record) {
        assert.strictEqual(record, person, 'Passed in person to teardown');
      }
    }
    this.owner.register('service:store', CreationStore);
    const store = this.owner.lookup('service:store') as Store;
    const person = store.createRecord('person', { name: 'chris', otherProp: 'unk' }) as Record<string, unknown>;
    assert.strictEqual(returnValue, person, 'createRecord returns the instantiated record');
    assert.deepEqual(returnValue, person, 'record instantiating does not modify the returned value');
  });

  test('fields with custom schema definition', async function (assert) {
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
        createRecord: (store, type, snapshot: Snapshot) => {
          let count = 0;
          assert.verifySteps(
            DEBUG
              ? ['TestSchema:fields', 'TestSchema:fields', 'TestSchema:hasResource', 'TestSchema:hasResource']
              : ['TestSchema:fields', 'TestSchema:fields'],
            'serialization of record for save'
          );
          assert.step('Adapter:createRecord');
          snapshot.eachAttribute((attr, attrDef) => {
            if (count === 0) {
              assert.step('Adapter:createRecord:attr:name');
              assert.strictEqual(attr, 'name', 'attribute key is correct');
              assert.deepEqual(
                attrDef,
                { kind: 'attribute', type: 'string', options: {}, name: 'name' },
                'attribute def matches schema'
              );
            } else if (count === 1) {
              assert.step('Adapter:createRecord:attr:age');
              assert.strictEqual(attr, 'age', 'attribute key is correct');
              assert.deepEqual(
                attrDef,
                { kind: 'attribute', type: 'number', options: {}, name: 'age' },
                'attribute def matches schema'
              );
            }
            count++;
          });
          count = 0;
          snapshot.eachRelationship((rel, relDef) => {
            if (count === 0) {
              assert.step('Adapter:createRecord:rel:boats');
              assert.strictEqual(rel, 'boats', 'relationship key is correct');
              assert.deepEqual(
                relDef,
                {
                  type: 'ship',
                  kind: 'hasMany',
                  options: {
                    inverse: null,
                    async: false,
                  },
                  name: 'boats',
                },
                'relationships def matches schema'
              );
            } else if (count === 1) {
              assert.step('Adapter:createRecord:rel:house');
              assert.strictEqual(rel, 'house', 'relationship key is correct');
              assert.deepEqual(
                relDef,
                {
                  type: 'house',
                  kind: 'belongsTo',
                  options: { inverse: null, async: false },
                  name: 'house',
                },
                'relationship def matches schema'
              );
            }
            count++;
          });
          assert.verifySteps([
            'Adapter:createRecord',
            'TestSchema:fields',
            'Adapter:createRecord:attr:name',
            'Adapter:createRecord:attr:age',
            'TestSchema:fields',
            'Adapter:createRecord:rel:boats',
            'Adapter:createRecord:rel:house',
          ]);
          return Promise.resolve({ data: { type: 'person', id: '1' } });
        },
      })
    );

    this.owner.register('service:store', CustomStore);
    const store = this.owner.lookup('service:store') as CustomStore;
    store.schema._assert = assert;
    store.schema.registerResource({
      identity: { name: 'id', kind: '@id' },
      type: 'person',
      fields: [
        {
          type: 'string',
          kind: 'attribute',
          options: {},
          name: 'name',
        },
        {
          type: 'number',
          kind: 'attribute',
          options: {},
          name: 'age',
        },
        {
          type: 'ship',
          kind: 'hasMany',
          options: {
            inverse: null,
            async: false,
          },
          name: 'boats',
        },
        {
          type: 'house',
          kind: 'belongsTo',
          options: {
            inverse: null,
            async: false,
          },
          name: 'house',
        },
      ],
    });

    assert.verifySteps(['TestSchema:registerResource'], 'initial population of schema');
    const person = store.createRecord('person', { name: 'chris' }) as Person;
    assert.verifySteps(['TestSchema:fields', 'TestSchema:fields'], 'population of record on create');
    await person.save();
    assert.verifySteps(
      DEBUG
        ? [
            'TestSchema:hasResource',
            'TestSchema:hasResource',
            'TestSchema:hasResource',
            'TestSchema:fields',
            'TestSchema:fields',
            'TestSchema:fields',
          ]
        : ['TestSchema:hasResource', 'TestSchema:fields', 'TestSchema:fields', 'TestSchema:fields'],
      'update of record on save completion'
    );
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
    const person = store.createRecord('person', { name: 'chris' });
    const promisePerson = await store.saveRecord(person);
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
    class CreationStore extends TestStore {
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
    const person = store.push({ data: { type: 'person', id: '1', attributes: { name: 'chris' } } });
    store.deleteRecord(person);
    assert.true(rd.isDeleted(ident!), 'record has been marked as deleted');
    await store.saveRecord(person);
    assert.true(rd.isDeletionCommitted(ident!), 'deletion has been committed');
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
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          return Promise.reject();
        },
      })
    );

    this.owner.register('service:store', CustomStore);
    const store = this.owner.lookup('service:store') as CustomStore;
    store.schema.registerResources([
      {
        identity: { name: 'id', kind: '@id' },
        type: 'person',
        fields: [
          {
            type: 'house',
            kind: 'belongsTo',
            options: {
              inverse: null,
              async: true,
            },
            name: 'house',
          },
          {
            type: 'string',
            kind: 'attribute',
            options: {},
            name: 'name',
          },
        ],
      },
      {
        identity: { name: 'id', kind: '@id' },
        type: 'house',
        fields: [
          {
            type: 'string',
            kind: 'attribute',
            options: {},
            name: 'address',
          },
        ],
      },
    ]);

    const person = store.push({
      data: {
        type: 'person',
        id: '7',
        attributes: { name: 'chris' },
        relationships: { house: { data: { type: 'house', id: '1' } } },
      },
    });
    const serialized = store.serializeRecord(person, { includeId: true });
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
});
