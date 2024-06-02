import EmberObject from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import {
  registerDerivations as registerLegacyDerivations,
  withDefaults as withLegacy,
} from '@ember-data/model/migration-support';
import { recordIdentifierFor } from '@ember-data/store';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { Type } from '@warp-drive/core-types/symbols';
import type { SchemaRecord } from '@warp-drive/schema-record/record';
import type { Transformation } from '@warp-drive/schema-record/schema';

import type Store from 'warp-drive__schema-record/services/store';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
}

module('Legacy | Create | basic fields', function (hooks) {
  setupTest(hooks);

  test('attributes work when passed to createRecord', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerLegacyDerivations(schema);

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
        ],
      })
    );

    const record = store.createRecord('user', { name: 'Rey Skybarker' }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
  });

  test('id works when passed to createRecord', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerLegacyDerivations(schema);

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
        ],
      })
    );

    const record = store.createRecord('user', { id: '1' }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, undefined, 'name is accessible');
  });

  test('attributes work when updated after createRecord', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerLegacyDerivations(schema);

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
        ],
      })
    );

    const record = store.createRecord('user', {}) as User;
    assert.strictEqual(record.name, undefined, 'name is accessible');
    record.name = 'Rey Skybarker';
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
  });

  test('id works when updated after createRecord', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerLegacyDerivations(schema);

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
        ],
      })
    );

    const record = store.createRecord('user', {}) as User;
    assert.strictEqual(record.id, null, 'id is accessible');
    record.id = '1';
    assert.strictEqual(record.id, '1', 'id is accessible');
  });
});
