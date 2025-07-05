import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { Type } from '@warp-drive/core-types/symbols';
import type { SchemaRecord, Transformation } from '@warp-drive/schema-record';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

import type Store from 'warp-drive__schema-record/services/store';

interface User {
  id: string | null;
  $type: 'user';
  rawNetWorth: string;
  netWorth: number;
  [Type]: 'user';
}

module('Reads | Alias fields', function (hooks) {
  setupTest(hooks);

  test('we can use simple fields with a `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;

    const FloatTransform: Transformation<string | number, number> = {
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
      [Type]: 'float',
    };

    schema.registerTransformation(FloatTransform);
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'rawNetWorth',
            kind: 'field',
          },
          {
            kind: 'alias',
            name: 'netWorth',
            type: null,
            options: {
              name: 'rawNetWorth',
              kind: 'field',
              type: 'float',
              options: { precision: 2 },
            },
          },
        ],
      })
    );

    const record = store.createRecord<User>('user', {
      rawNetWorth: '1000000.009',
    });
    const identifier = recordIdentifierFor(record);
    const resource = store.cache.peek(identifier)!;

    assert.strictEqual(record.rawNetWorth, '1000000.009', 'netWorth is accessible in raw form');
    assert.strictEqual(record.netWorth, 1_000_000.009, 'netWorth is accessible in numeric form');
    assert.strictEqual(
      store.cache.getAttr(identifier, 'rawNetWorth'),
      '1000000.009',
      'cache value for netWorth is correct'
    );
    const rawCache = store.cache.peek(identifier);
    const current = Object.assign({}, rawCache?.attributes);

    assert.false('netWorth' in current, 'not caching the alias field');
    assert.strictEqual(current.netWorth, undefined, 'not caching the alias field');
    assert.strictEqual(
      resource.attributes?.rawNetWorth,
      '1000000.009',
      'resource cache value for rawNetWorth is correct'
    );
    assert.strictEqual(resource.attributes?.netWorth, undefined, 'resource cache value for netWorth is correct');

    const record2 = store.createRecord<User>('user', {
      netWorth: 1_000_000.009,
    });
    const identifier2 = recordIdentifierFor(record2);
    const resource2 = store.cache.peek(identifier2)!;

    assert.strictEqual(record2.rawNetWorth, '1000000.01', 'netWorth is accessible in raw form');
    assert.strictEqual(record2.netWorth, 1_000_000.01, 'netWorth is accessible in numeric form');
    assert.strictEqual(
      store.cache.getAttr(identifier2, 'rawNetWorth'),
      '1000000.01',
      'cache value for netWorth is correct'
    );

    const rawCache2 = store.cache.peek(identifier2);
    const current2 = Object.assign({}, rawCache2?.attributes);
    assert.false('netWorth' in current2, 'not caching the alias field');
    assert.strictEqual(current2.netWorth, undefined, 'not caching the alias field');
    assert.strictEqual(
      resource2.attributes?.rawNetWorth,
      '1000000.01',
      'resource cache value for rawNetWorth is correct'
    );
    assert.strictEqual(resource2.attributes?.netWorth, undefined, 'resource cache value for netWorth is correct');
  });
});
