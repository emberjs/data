import type { SchemaRecord } from '@warp-drive/schema-record/record';
import type { Transform } from '@warp-drive/schema-record/schema';
import { SchemaService } from '@warp-drive/schema-record/schema';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { StableRecordIdentifier } from '@warp-drive/core';
import type { JsonApiResource } from '@ember-data/store/-types/q/record-data-json-api';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
}

module('Reads | basic fields', function (hooks) {
  setupTest(hooks);

  test('we can use simple fields with no `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);

    schema.defineSchema('user', [
      {
        name: 'name',
        type: null,
        kind: 'attribute',
      },
    ]);

    const record = store.createRecord('user', { name: 'Rey Skybarker' }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');

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

    const FloatTransform: Transform<string | number, number> = {
      serialize(value: string | number, options: { precision?: number } | null, _record: SchemaRecord): string {
        return typeof value === 'number'
          ? value.toFixed(options?.precision ?? 3)
          : Number(value).toFixed(options?.precision ?? 3);
      },
      hydrate(value: string, _options: { precision?: number } | null, _record: SchemaRecord): number {
        if (value === undefined || value === null) {
          return 0;
        }
        return Number(value);
      },
      defaultValue(_options: { precision?: number } | null, _identifier: StableRecordIdentifier): string {
        const v = 0;
        return v.toFixed(_options?.precision ?? 3);
      },
    };

    schema.registerTransform('float', FloatTransform);

    schema.defineSchema('user', [
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
        options: { precision: 0 },
      },
      {
        name: 'age',
        type: 'float',
        options: { precision: 0 },
        kind: 'attribute',
      },
      {
        name: 'netWorth',
        type: 'float',
        options: { precision: 2 },
        kind: 'attribute',
      },
      {
        name: 'coolometer',
        type: 'float',
        kind: 'attribute',
      },
    ]);

    const record = store.createRecord('user', {
      name: 'Rey Skybarker',
      age: 42,
      netWorth: 1_000_000.009,
      coolometer: '100.0',
    }) as User;
    const identifier = recordIdentifierFor(record);

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.strictEqual(record.age, 42, 'age is accessible');
    assert.strictEqual(record.netWorth, 1_000_000.01, 'netWorth is accessible');
    assert.strictEqual(record.coolometer, 100, 'coolometer is accessible');
    assert.strictEqual(record.rank, 0, 'rank is accessible');

    try {
      // @ts-expect-error intentionally have not typed the property on the record
      record.lastName;
      assert.ok(false, 'should error when accessing a field with an unknown transform');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        `No 'string' transform defined for use by user.lastName`,
        'should error when accessing unknown field transform'
      );
    }

    const resource = store.cache.peek(identifier) as JsonApiResource;

    assert.strictEqual(store.cache.getAttr(identifier, 'name'), 'Rey Skybarker', 'cache value for name is correct');
    assert.strictEqual(store.cache.getAttr(identifier, 'age'), '42', 'cache value for age is correct');
    assert.strictEqual(
      store.cache.getAttr(identifier, 'netWorth'),
      '1000000.01',
      'cache value for netWorth is correct'
    );
    assert.strictEqual(
      store.cache.getAttr(identifier, 'coolometer'),
      '100.000',
      'cache value for coolometer is correct'
    );
    assert.strictEqual(store.cache.getAttr(identifier, 'rank'), '0', 'cache value for rank is correct');

    assert.strictEqual(resource.type, 'user', 'resource cache type is correct');
    assert.strictEqual(resource.id, null, 'resource cache id is correct');
    assert.strictEqual(resource.attributes?.name, 'Rey Skybarker', 'resource cache value for name is correct');
    assert.strictEqual(resource.attributes?.age, '42', 'resource cache value for age is correct');
    assert.strictEqual(resource.attributes?.netWorth, '1000000.01', 'cresource ache value for netWorth is correct');
    assert.strictEqual(resource.attributes?.coolometer, '100.000', 'resource cache value for coolometer is correct');
    assert.strictEqual(resource.attributes?.rank, '0', 'resource cache value for rank is correct');
  });
});
