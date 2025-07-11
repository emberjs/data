import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

import type Store from 'warp-drive__schema-record/services/store';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
  [Type]: 'user';
}

module('Polaris | Create | basic fields', function (hooks) {
  setupTest(hooks);

  test('fields work when passed to createRecord', function (assert) {
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

    const record = store.createRecord<User>('user', { name: 'Rey Skybarker' });

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
  });

  test('id works when passed to createRecord', function (assert) {
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

    const record = store.createRecord<User>('user', { id: '1' });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, undefined, 'name is accessible');
  });

  test('attributes work when updated after createRecord', function (assert) {
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

    const record = store.createRecord<User>('user', {});
    assert.strictEqual(record.name, undefined, 'name is accessible');
    record.name = 'Rey Skybarker';
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
  });

  test('id works when updated after createRecord', function (assert) {
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

    const record = store.createRecord<User>('user', {});
    assert.strictEqual(record.id, null, 'id is accessible');
    record.id = '1';
    assert.strictEqual(record.id, '1', 'id is accessible');
  });

  test('we can create a new record with a pre-set lid', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    registerDerivations(store.schema);

    store.schema.registerResource(
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
    const lid = '@test/lid:user-chris-asdf-1234';
    const record = store.createRecord('user', { name: 'Chris' }, { lid: '@test/lid:user-chris-asdf-1234' });
    const identifier = recordIdentifierFor(record);
    assert.strictEqual(identifier.lid, lid, 'we used the custom lid');
  });

  test('createRecord does not return the primary record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    registerDerivations(store.schema);

    store.schema.registerResource(
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
    const record = store.createRecord('user', { name: 'Chris' });
    const identifier = recordIdentifierFor(record);
    const primaryRecord = store.peekRecord<User>(identifier);
    assert.ok(!!primaryRecord, 'we have a peekable primary record');
    assert.false(record === primaryRecord, 'the records should not be the same reference');
    const primaryIdentifier = recordIdentifierFor(primaryRecord);
    assert.true(identifier === primaryIdentifier, 'the records should have the same identifier reference');
  });

  test('the primary record is not editable', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    registerDerivations(store.schema);

    store.schema.registerResource(
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
    const record = store.createRecord<User>('user', { name: 'Chris' });
    const identifier = recordIdentifierFor(record);
    const primaryRecord = store.peekRecord<User>(identifier);

    try {
      primaryRecord!.name = 'James';
      assert.ok(false, 'we should error');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        'Cannot set name on user because the record is not editable',
        'we cannot mutate the primary record'
      );
    }

    assert.strictEqual(primaryRecord?.name, undefined, 'the primary record does not show the creation value');
  });

  test('the primary record is not included peekAll', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    registerDerivations(store.schema);

    store.schema.registerResource(
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
    store.createRecord<User>('user', { name: 'Chris' });

    const all = store.peekAll<User>('user');
    assert.strictEqual(all.length, 0, 'Our empty new record does not appear in the list of all records');
  });

  test('we can unload via the primary record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    registerDerivations(store.schema);

    store.schema.registerResource(
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
    const record = store.createRecord<User & { ___notifications: null | object }>('user', { name: 'Chris' });
    const identifier = recordIdentifierFor(record);
    const primaryRecord = store.peekRecord<User>(identifier);

    store.unloadRecord(primaryRecord);

    // peekRecord should now be `null`
    const peeked = store.peekRecord<User>(identifier);
    assert.strictEqual(peeked, null, 'we can no longer peek the record');
    const cacheEntry = store.cache.peek(identifier);
    assert.strictEqual(cacheEntry, null, 'there is no cache entry');

    // this check should become `$state.isDestroyed` once that is a thing
    assert.strictEqual(record.___notifications, null, 'the record was destroyed');
  });

  test('we can unload via the editable record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    registerDerivations(store.schema);

    store.schema.registerResource(
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
    const record = store.createRecord<User & { ___notifications: null | object }>('user', { name: 'Chris' });
    const identifier = recordIdentifierFor(record);

    store.unloadRecord(record);

    const primaryRecord = store.peekRecord<User>(identifier);
    assert.strictEqual(primaryRecord, null, 'the primary record no longer exists');
    const cacheEntry = store.cache.peek(identifier);
    assert.strictEqual(cacheEntry, null, 'there is no cache entry');

    // this check should become `$state.isDestroyed` once that is a thing
    assert.strictEqual(record.___notifications, null, 'the record was destroyed');
  });
});
