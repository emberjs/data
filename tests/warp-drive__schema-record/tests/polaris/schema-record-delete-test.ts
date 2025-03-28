import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import type Store from '@ember-data/store';
import { CacheHandler } from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { Checkout,registerDerivations, withDefaults } from '@warp-drive/schema-record';
import type { Editable, Legacy } from '@warp-drive/schema-record/-private';

interface User {
  [Editable]: boolean;
  [Legacy]?: boolean;
  id: string | null;
  $type: 'user';
  name: string;
  [Type]: 'user';
  [Checkout](): Promise<User>;
  deleteRecord(): void;
  destroyRecord(): Promise<User>;
  unloadRecord(): void;
  isDeleted: boolean;
}

module('SchemaRecord | Polaris | Delete Operations', function (hooks) {
  setupTest(hooks);

  test('deleteRecord marks a record as deleted', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [{ name: 'name', kind: 'field' }],
      })
    );

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Skywalker' },
      },
    });

    assert.ok(store.peekRecord('user', '1'), 'record exists initially');

    record.deleteRecord();

    const fetchedRecord = store.peekRecord('user', '1');
    assert.true(record.isDeleted, 'record is marked as deleted');
    assert.ok(fetchedRecord, 'record still exists in store');
  });

  test('deleteRecord on an editable record marks both versions as deleted', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [{ name: 'name', kind: 'field' }],
      })
    );

    const immutableRecord = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Skywalker' },
      },
    });

    const editableRecord = await immutableRecord[Checkout]();

    assert.ok(store.peekRecord('user', '1'), 'record exists initially');

    editableRecord.deleteRecord();

    const fetchedRecord = store.peekRecord('user', '1');
    assert.true(editableRecord.isDeleted, 'editable record is marked as deleted');
    assert.true(immutableRecord.isDeleted, 'immutable record is marked as deleted');
    assert.ok(fetchedRecord, 'record still exists in store');
  });

  test('destroyRecord removes a record from the store', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [{ name: 'name', kind: 'field' }],
      })
    );

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Skywalker' },
      },
    });

    assert.ok(store.peekRecord('user', '1'), 'record exists initially');

    await record.destroyRecord();

    const fetchedRecord = store.peekRecord('user', '1');
    assert.strictEqual(fetchedRecord, null, 'record is removed from the store after destroyRecord');
  });

  test('destroyRecord on an editable record cleans up both versions', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [{ name: 'name', kind: 'field' }],
      })
    );

    const immutableRecord = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Skywalker' },
      },
    });

    const editableRecord = await immutableRecord[Checkout]();

    assert.ok(store.peekRecord('user', '1'), 'record exists initially');

    await editableRecord.destroyRecord();

    const fetchedImmutableRecord = store.peekRecord('user', '1');
    assert.strictEqual(fetchedImmutableRecord, null, 'immutable record is removed from the store after editable destroyRecord');
  });

  test('unloadRecord removes a record from the store', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [{ name: 'name', kind: 'field' }],
      })
    );

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Skywalker' },
      },
    });

    const user = store.peekRecord('user', '1');

    assert.ok(user, 'record exists initially');

    user.unloadRecord();

    const fetchedRecord = store.peekRecord('user', '1');
    assert.strictEqual(fetchedRecord, null, 'record is removed from the store after unloadRecord');
  });

  test('unloadRecord on an editable record cleans up both versions', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [{ name: 'name', kind: 'field' }],
      })
    );

    const immutableRecord = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Skywalker' },
      },
    });

    const editableRecord = await immutableRecord[Checkout]() as User;

    if (typeof editableRecord.unloadRecord !== 'function') {
      assert.ok(false, 'unloadRecord method is not available on the editable record');
      return;
    }

    assert.ok(store.peekRecord('user', '1'), 'record exists initially');

    assert.ok(editableRecord, 'editable record exists');
    assert.strictEqual(typeof editableRecord.unloadRecord, 'function', 'unloadRecord is a function on editable record');

    try {
      editableRecord.unloadRecord();
    } catch (error) {
      assert.step(`Error: ${error.message}`);
    }

    const fetchedImmutableRecord = store.peekRecord('user', '1');
    assert.strictEqual(fetchedImmutableRecord, null, 'immutable record is removed from the store after editable unloadRecord');

    assert.verifySteps([]);
  });
});