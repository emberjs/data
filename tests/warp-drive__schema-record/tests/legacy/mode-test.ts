import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import type { Snapshot } from '@ember-data/legacy-compat/-private';
import type Errors from '@ember-data/model/-private/errors';
import type RecordState from '@ember-data/model/-private/record-state';
import { registerDerivations, withFields } from '@ember-data/model/migration-support';
import type Store from '@ember-data/store';
import { Editable, Legacy } from '@warp-drive/schema-record/record';
import { SchemaService } from '@warp-drive/schema-record/schema';

interface User {
  [Legacy]: boolean;
  [Editable]: boolean;
  isDeleted: boolean;
  deleteRecord(): void;
  id: string | null;
  $type: 'user';
  name: string;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
  currentState: RecordState;
  isDestroying: boolean;
  isDestroyed: boolean;
  errors: Errors;
  unloadRecord(): void;
  _createSnapshot(): Snapshot;
}

module('Legacy Mode', function (hooks) {
  setupRenderingTest(hooks);

  test('we can create a record in legacy mode', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withFields([
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
      fields: [
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ],
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
        'No field named constructor on user',
        'record.constructor.modelName throws'
      );
    }
  });

  test('records in legacy mode set their constructor modelName value to the correct type', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withFields([
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
  });

  test('we can access errors', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withFields([
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
      assert.true(errors === errors2, 'record.errors should be stable');
    } catch (e) {
      assert.ok(false, `record.errors should be available: ${(e as Error).message}`);
    }
  });

  test('we can access currentState', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withFields([
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
      assert.true(currentState === currentState2, 'record.currentState should be stable');

      assert.strictEqual(currentState.stateName, 'root.loaded.saved', 'currentState.stateName is correct');
    } catch (e) {
      assert.ok(false, `record.currentState should be available: ${(e as Error).message}`);
    }
  });

  test('we can use unloadRecord', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withFields([
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
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withFields([
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
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withFields([
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
});
