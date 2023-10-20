import { rerender } from '@ember/test-helpers';

import type { SchemaRecord } from '@warp-drive/schema-record/record';
import type { FieldSchema, Transform } from '@warp-drive/schema-record/schema';
import { SchemaService } from '@warp-drive/schema-record/schema';
import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { StableRecordIdentifier } from '@ember-data/store/-types/q/identifier';

import { reactiveContext } from '../-utils/reactive-context';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
}

module('Reactivity | basic fields can receive remote updates', function (hooks) {
  setupRenderingTest(hooks);

  test('we can use simple fields with no `type`', async function (assert) {
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
    const fieldsMap = schema.schemas.get('user')!.fields;
    const fields: FieldSchema[] = [...fieldsMap.values()];

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');

    const { counters, fieldOrder } = await reactiveContext.call(this, record, fields);
    const nameIndex = fieldOrder.indexOf('name');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Pupatine', 'name is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Skybarker' },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.name, 2, 'nameCount is 1');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
  });

  test('we can use simple fields with a `type`', async function (assert) {
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

    const fieldsMap = schema.schemas.get('user')!.fields;
    const fields: FieldSchema[] = [...fieldsMap.values()];

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Pupatine',
          age: '3',
          netWorth: '1000000.01',
          coolometer: '100.000',
        },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.strictEqual(record.age, 3, 'age is accessible');
    assert.strictEqual(record.netWorth, 1_000_000.01, 'netWorth is accessible');
    assert.strictEqual(record.coolometer, 100, 'coolometer is accessible');
    assert.strictEqual(record.rank, 0, 'rank is accessible');

    const { counters, fieldOrder } = await reactiveContext.call(this, record, fields);
    const nameIndex = fieldOrder.indexOf('name');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.age, 1, 'ageCount is 1');
    assert.strictEqual(counters.netWorth, 1, 'netWorthCount is 1');
    assert.strictEqual(counters.coolometer, 1, 'coolometerCount is 1');
    assert.strictEqual(counters.rank, 1, 'rankCount is 1');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Pupatine', 'name is rendered');
    assert.dom(`li:nth-child(${nameIndex + 3})`).hasText('rank: 0', 'rank is rendered');
    assert.dom(`li:nth-child(${nameIndex + 5})`).hasText('age: 3', 'age is rendered');
    assert.dom(`li:nth-child(${nameIndex + 7})`).hasText('netWorth: 1000000.01', 'netWorth is rendered');
    assert.dom(`li:nth-child(${nameIndex + 9})`).hasText('coolometer: 100', 'coolometer is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
          age: '4',
          netWorth: '1000000.01',
          coolometer: '100.001',
          rank: '10',
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.strictEqual(record.age, 4, 'age is accessible');
    assert.strictEqual(record.netWorth, 1_000_000.01, 'netWorth is accessible');
    assert.strictEqual(record.coolometer, 100.001, 'coolometer is accessible');
    assert.strictEqual(record.rank, 10, 'rank is accessible');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.name, 2, 'nameCount is 2');
    assert.strictEqual(counters.age, 2, 'ageCount is 2');
    assert.strictEqual(counters.netWorth, 1, 'netWorthCount is 1');
    assert.strictEqual(counters.coolometer, 2, 'coolometerCount is 2');
    assert.strictEqual(counters.rank, 2, 'rankCount is 2');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${nameIndex + 3})`).hasText('rank: 10', 'rank is rendered');
    assert.dom(`li:nth-child(${nameIndex + 5})`).hasText('age: 4', 'age is rendered');
    assert.dom(`li:nth-child(${nameIndex + 7})`).hasText('netWorth: 1000000.01', 'netWorth is rendered');
    assert.dom(`li:nth-child(${nameIndex + 9})`).hasText('coolometer: 100.001', 'coolometer is rendered');
  });
});
