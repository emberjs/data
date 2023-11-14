import EmberObject from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import {
  registerDerivations as registerLegacyDerivations,
  withFields as withLegacyFields,
} from '@ember-data/model/migration-support';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { JsonApiResource } from '@ember-data/store/-types/q/record-data-json-api';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { SchemaRecord } from '@warp-drive/schema-record/record';
import type { Transform } from '@warp-drive/schema-record/schema';
import { SchemaService } from '@warp-drive/schema-record/schema';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
}

module('Legacy | Reads | basic fields', function (hooks) {
  setupTest(hooks);

  test('we can use simple fields with no `type`', function (assert) {
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

    const record = store.createRecord('user', { name: 'Rey Skybarker' }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(
      (record.constructor as { modelName?: string }).modelName,
      'user',
      'constructor.modelName is accessible'
    );

    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');

    try {
      // @ts-expect-error intentionally accessing unknown field
      record.lastName;
      assert.ok(false, 'should error when accessing unknown field');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        'No field named lastName on user',
        'should error when accessing unknown field'
      );
    }
  });

  test('we can use simple fields with a `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerLegacyDerivations(schema);

    this.owner.register(
      'transform:float',
      class extends EmberObject {
        serialize() {
          assert.ok(false, 'unexpected legacy serialize');
        }
        deserialize(v: number | string | null) {
          assert.ok(false, 'unexpected legacy deserialize');
        }
      }
    );

    const FloatTransform: Transform<string | number, number> = {
      serialize(value: string | number, options: { precision?: number } | null, _record: SchemaRecord): never {
        assert.ok(false, 'unexpected serialize');
        throw new Error('unexpected serialize');
      },
      hydrate(value: string, _options: { precision?: number } | null, _record: SchemaRecord): number {
        assert.ok(false, 'unexpected hydrate');
        throw new Error('unexpected hydrate');
      },
      defaultValue(_options: { precision?: number } | null, _identifier: StableRecordIdentifier): string {
        assert.ok(false, 'unexpected defaultValue');
        throw new Error('unexpected defaultValue');
      },
    };

    schema.registerTransform('float', FloatTransform);

    schema.defineSchema('user', {
      legacy: true,
      fields: withLegacyFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
        {
          name: 'lastName',
          type: 'string',
          kind: 'attribute',
        },
        {
          name: 'rank',
          type: 'float',
          kind: 'attribute',
          options: { precision: 0, defaultValue: 0 },
        },
        {
          name: 'age',
          type: 'float',
          options: { precision: 0, defaultValue: 0 },
          kind: 'attribute',
        },
        {
          name: 'netWorth',
          type: 'float',
          options: { precision: 2, defaultValue: 0 },
          kind: 'attribute',
        },
        {
          name: 'coolometer',
          type: 'float',
          options: { defaultValue: 0 },
          kind: 'attribute',
        },
      ]),
    });

    const record = store.createRecord('user', {
      name: 'Rey Skybarker',
      age: 42,
      netWorth: 1_000_000.009,
      coolometer: 100.0,
    }) as User;
    const identifier = recordIdentifierFor(record);

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(
      (record.constructor as { modelName?: string }).modelName,
      'user',
      'constructor.modelName is accessible'
    );
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.strictEqual(record.age, 42, 'age is accessible');
    assert.strictEqual(record.netWorth, 1_000_000.009, 'netWorth is accessible');
    assert.strictEqual(record.coolometer, 100.0, 'coolometer is accessible');
    assert.strictEqual(record.rank, 0, 'rank is accessible');
    // @ts-expect-error intentionally have not typed the property on the record
    assert.strictEqual(record.lastName, undefined, 'lastName is accessible even though its transform does not exist');

    const resource = store.cache.peek(identifier) as JsonApiResource;

    assert.strictEqual(store.cache.getAttr(identifier, 'name'), 'Rey Skybarker', 'cache value for name is correct');
    assert.strictEqual(store.cache.getAttr(identifier, 'age'), 42, 'cache value for age is correct');
    assert.strictEqual(
      store.cache.getAttr(identifier, 'netWorth'),
      1_000_000.009,
      'cache value for netWorth is correct'
    );
    assert.strictEqual(store.cache.getAttr(identifier, 'coolometer'), 100.0, 'cache value for coolometer is correct');
    assert.strictEqual(store.cache.getAttr(identifier, 'rank'), 0, 'cache value for rank is correct');

    assert.strictEqual(resource.type, 'user', 'resource cache type is correct');
    assert.strictEqual(resource.id, null, 'resource cache id is correct');
    assert.strictEqual(resource.attributes?.name, 'Rey Skybarker', 'resource cache value for name is correct');
    assert.strictEqual(resource.attributes?.age, 42, 'resource cache value for age is correct');
    assert.strictEqual(resource.attributes?.netWorth, 1_000_000.009, 'resource cache value for netWorth is correct');
    assert.strictEqual(resource.attributes?.coolometer, 100.0, 'resource cache value for coolometer is correct');
    assert.strictEqual(resource.attributes?.rank, 0, 'resource cache value for rank is correct');
  });
});
