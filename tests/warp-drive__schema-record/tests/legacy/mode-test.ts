import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import { adapterFor, LegacyNetworkHandler, serializeRecord, serializerFor } from '@ember-data/legacy-compat';
import type { Snapshot } from '@ember-data/legacy-compat/-private';
import type Errors from '@ember-data/model/-private/errors';
import type RecordState from '@ember-data/model/-private/record-state';
import {
  registerDerivations as registerLegacyDerivations,
  withFields as withLegacyFields,
} from '@ember-data/model/migration-support';
import RequestManager from '@ember-data/request';
import Store, { CacheHandler } from '@ember-data/store';
import { Editable, Legacy } from '@warp-drive/schema-record/record';
import { registerDerivations, SchemaService, withFields } from '@warp-drive/schema-record/schema';

interface User {
  [Legacy]: boolean;
  [Editable]: boolean;
  hasDirtyAttributes: boolean;
  isDeleted: boolean;
  isEmpty: boolean;
  isError: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  isNew: boolean;
  isSaving: boolean;
  isValid: boolean;
  dirtyType: string;
  adapterError: unknown;
  deleteRecord(): void;
  id: string | null;
  $type: 'user';
  name: string;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
  fullName: string;
  bestFriend: unknown;
  currentState: RecordState;
  isDestroying: boolean;
  isDestroyed: boolean;
  errors: Errors;
  unloadRecord(): void;
  _createSnapshot(): Snapshot;
  serialize(): Record<string, unknown>;
  save(): Promise<User>;
  changedAttributes(): Record<string, [unknown, unknown]>;
  rollbackAttributes(): void;
  reload(): Promise<User>;
  destroyRecord(): Promise<User>;
}

module('Legacy Mode', function (hooks) {
  setupRenderingTest(hooks);

  test('we can create a record in legacy mode', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(record[Legacy], 'record is in legacy mode');
    assert.true(record[Editable], 'record is editable');

    try {
      record.$type;
      assert.ok(false, 'record.$type should throw');
    } catch (e) {
      assert.strictEqual((e as Error).message, 'No field named $type on user', 'record.$type throws');
    }
  });

  test('records not in legacy mode do not set their constructor modelName value to their type', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: false,
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'field',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.false(record[Legacy], 'record is in legacy mode');

    try {
      (record.constructor as { modelName?: string }).modelName;
      assert.ok(false, 'record.constructor.modelName should throw');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        'Cannot access record.constructor.modelName on non-Legacy Schema Records.',
        'record.constructor.modelName throws'
      );
    }
    assert.strictEqual(record.constructor.name, 'SchemaRecord<user>', 'it has a useful constructor name');
  });

  test('records in legacy mode set their constructor modelName value to the correct type', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.true(record[Legacy], 'record is in legacy mode');
    assert.strictEqual(
      (record.constructor as { modelName?: string }).modelName,
      'user',
      'record constructor modelName is correct'
    );

    assert.strictEqual(record.constructor.name, 'Record<user>', 'it has a useful constructor name');
  });

  test('records not in legacy mode can access values with type "field"', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: false,
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'field',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.false(record[Legacy], 'record is NOT in legacy mode');
    assert.strictEqual(record.$type, 'user', '$type is accessible');

    assert.strictEqual(record.name, 'Rey Pupatine', 'can access name field');
  });

  test('records in legacy mode cannot access values with type "field"', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'field',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.true(record[Legacy], 'record is in legacy mode');

    try {
      record.name;
      assert.ok(false, 'record.name should throw');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        "Assertion Failed: SchemaRecord.name is not available in legacy mode because it has type 'field'",
        'record.name throws'
      );
    }
  });

  test('records in legacy mode cannot access derivations', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'firstName',
          type: null,
          kind: 'attribute',
        },
        {
          name: 'lastName',
          type: null,
          kind: 'attribute',
        },
        {
          name: 'fullName',
          type: 'concat',
          options: { fields: ['firstName', 'lastName'], separator: ' ' },
          kind: 'derived',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          firstName: 'Rey',
          lastName: 'Pupatine',
        },
      },
    }) as User;

    assert.true(record[Legacy], 'record is in legacy mode');

    try {
      record.fullName;
      assert.ok(false, 'record.fullName should throw');
    } catch (e) {
      // FIXME:
      assert.strictEqual(
        (e as Error).message,
        "Assertion Failed: SchemaRecord.fullName is not available in legacy mode because it has type 'derived'",
        'record.fullName throws'
      );
    }
  });

  test('records in legacy mode cannot access resources', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
        {
          name: 'bestFriend',
          type: 'user',
          kind: 'resource',
          options: { inverse: 'bestFriend', async: true },
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          bestFriend: {
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey',
          },
          relationships: {
            bestFriend: {
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    }) as User;

    assert.true(record[Legacy], 'record is in legacy mode');

    try {
      record.bestFriend;
      assert.ok(false, 'record.bestFriend should throw');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        "Assertion Failed: SchemaRecord.bestFriend is not available in legacy mode because it has type 'resource'",
        'record.bestFriend throws'
      );
    }
  });

  test('we can access errors', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    try {
      const errors = record.errors;
      assert.ok(true, 'record.errors should be available');

      const errors2 = record.errors;
      assert.strictEqual(errors, errors2, 'record.errors should be stable');
    } catch (e) {
      assert.ok(false, `record.errors should be available: ${(e as Error).message}`);
    }
  });

  test('we can access currentState', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    try {
      const currentState = record.currentState;
      assert.ok(true, 'record.currentState should be available');

      const currentState2 = record.currentState;
      assert.strictEqual(currentState, currentState2, 'record.currentState should be stable');

      assert.strictEqual(currentState.stateName, 'root.loaded.saved', 'currentState.stateName is correct');
    } catch (e) {
      assert.ok(false, `record.currentState should be available: ${(e as Error).message}`);
    }
  });

  test('we can use unloadRecord', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    try {
      record.unloadRecord();
      assert.ok(true, 'record.unloadRecord should be available');
      const recordAgain = store.peekRecord('user', '1');
      assert.strictEqual(recordAgain, null, 'record is unloaded');
    } catch (e) {
      assert.ok(false, `record.unloadRecord should be available: ${(e as Error).message}`);
    }
  });

  test('we can use deleteRecord', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    record.deleteRecord();
    assert.true(record.isDeleted, 'state flag is updated');
    assert.strictEqual(record.currentState.stateName, 'root.deleted.uncommitted', 'state is updated');
  });

  test('we can use _createSnapshot', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    const snapshot = record._createSnapshot();
    assert.ok(snapshot, 'snapshot is created');
    assert.strictEqual(snapshot.id, '1', 'snapshot id is correct');
    assert.strictEqual(snapshot.modelName, 'user', 'snapshot modelName is correct');
    assert.strictEqual(snapshot.attributes().name, 'Rey Pupatine', 'snapshot attribute is correct');
  });

  test('we can access state flags', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.strictEqual(record.dirtyType, '', 'dirtyType is correct');
    assert.strictEqual(record.adapterError, null, 'adapterError is correct');
    assert.false(record.hasDirtyAttributes, 'hasDirtyAttributes is correct');
    assert.false(record.isDeleted, 'isDeleted is correct');
    assert.false(record.isEmpty, 'isEmpty is correct');
    assert.false(record.isError, 'isError is correct');
    assert.true(record.isLoaded, 'isLoaded is correct');
    assert.false(record.isLoading, 'isReloading is correct');
    assert.false(record.isNew, 'isNew is correct');
    assert.false(record.isSaving, 'isSaving is correct');
    assert.true(record.isValid, 'isValid is correct');
  });

  test('we can access object lifecycle flags', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    // FIXME: Is this assertion correct?
    assert.false(record.isDestroying, 'isDestroying is correct');
    assert.false(record.isDestroyed, 'isDestroyed is correct');
  });

  test('we can serialize', function (assert) {
    this.owner.register(
      'serializer:user',
      class UserSerializer {
        serialize(snapshot: Snapshot) {
          assert.step('serialize');
          return {
            type: snapshot.modelName,
            id: snapshot.id,
            attributes: snapshot.attributes(),
          };
        }
        static create() {
          return new this();
        }
      }
    );
    const store = this.owner.lookup('service:store') as Store;

    // @ts-expect-error
    store.serializerFor = serializerFor;
    // @ts-expect-error
    store.serializeRecord = function () {
      assert.step('serializeRecord');
      // @ts-expect-error
      return serializeRecord.apply(this, arguments);
    };
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    const serialized = record.serialize();

    assert.verifySteps(['serializeRecord', 'serialize']);
    assert.deepEqual(
      serialized,
      {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Rey Pupatine',
        },
      },
      'We serialized'
    );
  });

  test('we can reload', async function (assert) {
    this.owner.register(
      'adapter:user',
      class UserAdapter {
        findRecord(_store: Store, _schema: unknown, snapshot: Snapshot) {
          assert.step('findRecord');
          return {
            data: {
              type: 'user',
              id: '1',
              attributes: { name: 'Rey Skybarker' },
            },
          };
        }
        static create() {
          return new this();
        }
      }
    );

    const store = this.owner.lookup('service:store') as Store;
    // @ts-expect-error
    store.adapterFor = adapterFor;
    // @ts-expect-error
    store.serializerFor = serializerFor;
    store.requestManager = new RequestManager();
    store.requestManager.useCache(CacheHandler);
    store.requestManager.use([LegacyNetworkHandler]);
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.strictEqual(record.name, 'Rey Pupatine', 'name is initialized');

    await record.reload();

    assert.strictEqual(record.name, 'Rey Skybarker', 'name is updated');
    assert.verifySteps(['findRecord']);
  });

  test('we can rollbackAttributes', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    record.name = 'Rey Skybarker';
    assert.true(record.hasDirtyAttributes, 'hasDirtyAttributes is correct');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is updated');
    assert.strictEqual(record.dirtyType, 'updated', 'dirtyType is correct');
    assert.deepEqual(
      record.changedAttributes(),
      { name: ['Rey Pupatine', 'Rey Skybarker'] },
      'changedAttributes is correct'
    );

    record.rollbackAttributes();

    assert.false(record.hasDirtyAttributes, 'hasDirtyAttributes is correct');
    assert.strictEqual(record.dirtyType, '', 'dirtyType is correct');
    assert.deepEqual(record.changedAttributes(), {}, 'changedAttributes is correct');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is updated');
  });

  test('we can save', async function (assert) {
    this.owner.register(
      'adapter:user',
      class UserAdapter {
        updateRecord(_store: Store, _schema: unknown, snapshot: Snapshot) {
          assert.step('updateRecord');
          return {
            data: {
              type: snapshot.modelName,
              id: snapshot.id,
              attributes: snapshot.attributes(),
            },
          };
        }
        static create() {
          return new this();
        }
      }
    );

    const store = this.owner.lookup('service:store') as Store;
    // @ts-expect-error
    store.adapterFor = adapterFor;
    // @ts-expect-error
    store.serializerFor = serializerFor;
    store.requestManager = new RequestManager();
    store.requestManager.useCache(CacheHandler);
    store.requestManager.use([LegacyNetworkHandler]);
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    record.name = 'Rey Skybarker';
    assert.true(record.hasDirtyAttributes, 'hasDirtyAttributes is correct');
    assert.strictEqual(record.dirtyType, 'updated', 'dirtyType is correct');
    assert.deepEqual(
      record.changedAttributes(),
      { name: ['Rey Pupatine', 'Rey Skybarker'] },
      'changedAttributes is correct'
    );

    await record.save();

    assert.false(record.hasDirtyAttributes, 'hasDirtyAttributes is correct');
    assert.strictEqual(record.dirtyType, '', 'dirtyType is correct');
    assert.deepEqual(record.changedAttributes(), {}, 'changedAttributes is correct');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is updated');
    assert.verifySteps(['updateRecord']);
  });

  test('we can destroyRecord', async function (assert) {
    this.owner.register(
      'adapter:user',
      class UserAdapter {
        deleteRecord(_store: Store, _schema: unknown, snapshot: Snapshot) {
          assert.step('deleteRecord');
          return {
            data: null,
          };
        }
        static create() {
          return new this();
        }
      }
    );

    const store = this.owner.lookup('service:store') as Store;
    // @ts-expect-error
    store.adapterFor = adapterFor;
    // @ts-expect-error
    store.serializerFor = serializerFor;
    store.requestManager = new RequestManager();
    store.requestManager.useCache(CacheHandler);
    store.requestManager.use([LegacyNetworkHandler]);
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    const promise = record.destroyRecord();

    assert.true(record.isDeleted, 'state flag is updated');

    await promise;

    assert.true(record.isDestroyed, 'state flag is updated');
    assert.true(record.isDestroying, 'state flag is updated');
    assert.strictEqual(store.peekRecord('user', '1'), null, 'record is unloaded');
    assert.verifySteps(['deleteRecord']);
  });
});
