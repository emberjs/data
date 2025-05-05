import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { Checkout, registerDerivations, withDefaults } from '@warp-drive/schema-record';
import type { Editable, Legacy } from '@warp-drive/schema-record/-private';

import type Store from 'warp-drive__schema-record/services/store';

interface User {
  [Editable]: boolean;
  [Legacy]?: boolean;
  id: string | null;
  $type: 'user';
  name: string;
  [Type]: 'user';
  [Checkout](): Promise<User>;
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
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
        ],
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

    store.deleteRecord(record);

    const fetchedRecord = store.peekRecord('user', '1') as User;
    assert.ok(fetchedRecord, 'record still exists in store');
    assert.true(store.cache.isDeleted(recordIdentifierFor(fetchedRecord)), 'record is marked as deleted');
  });

  test('deleteRecord on an editable record marks both versions as deleted', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
        ],
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

    store.deleteRecord(editableRecord);
    await settled();

    const fetchedRecord = store.peekRecord('user', '1') as User;
    assert.ok(fetchedRecord, 'record still exists in store');
    assert.true(store.cache.isDeleted(recordIdentifierFor(fetchedRecord)), 'immutable record is marked as deleted');
  });

  test('destroyRecord removes a record from the store', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
        ],
      })
    );

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Skybarker' },
      },
    });

    assert.ok(store.peekRecord('user', '1'), 'record exists initially');

    // destroyRecord implementation
    store.deleteRecord(record);
    store.unloadRecord(record);

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
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
        ],
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

    // destroyRecord implementation
    store.deleteRecord(editableRecord);
    store.unloadRecord(editableRecord);

    const fetchedImmutableRecord = store.peekRecord('user', '1');
    assert.strictEqual(
      fetchedImmutableRecord,
      null,
      'immutable record is removed from the store after editable destroyRecord'
    );
  });

  test('unloadRecord removes a record from the store', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
        ],
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

    store.unloadRecord(user);

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
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
        ],
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

    assert.ok(editableRecord, 'editable record exists');

    store.unloadRecord(editableRecord);

    const fetchedImmutableRecord = store.peekRecord('user', '1');
    assert.strictEqual(
      fetchedImmutableRecord,
      null,
      'immutable record is removed from the store after editable unloadRecord'
    );
  });
});
