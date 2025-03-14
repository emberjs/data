import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations } from '@warp-drive/schema-record';

interface User {
  id: string;
  $type: 'user';
  name: string;
  qualities: string[];
  [Type]: 'user';
}

module('ManagedArray | Iterable Behaviors', function (hooks) {
  setupTest(hooks);

  test('we can use `JSON.stringify` on a ManagedArray', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'qualities',
          kind: 'array',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          qualities: ['smart', 'funny', 'cool'],
        },
      },
    });

    try {
      const serialized = JSON.stringify(record);
      assert.true(true, 'JSON.stringify should not throw');

      const value = JSON.parse(serialized) as object;
      assert.deepEqual(
        value,
        {
          id: '1',
          name: 'Wesley Thoburn',
          qualities: ['smart', 'funny', 'cool'],
        },
        'stringify should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `JSON.stringify should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `[ ...record.qualties ]` on a ManagedArray', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'qualities',
          kind: 'array',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          qualities: ['smart', 'funny', 'cool'],
        },
      },
    });

    try {
      const value = [...record.qualities] as string[];
      assert.true(true, 'spread should not throw');
      assert.arrayStrictEquals(
        value,
        ['smart', 'funny', 'cool'],
        'spread should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `spread should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `for (const value of record.qualities)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'qualities',
          kind: 'array',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          qualities: ['smart', 'funny', 'cool'],
        },
      },
    });

    try {
      const value = [] as string[];

      for (const val of record.qualities) {
        value.push(val);
      }

      assert.true(true, 'for...of should not throw');
      assert.arrayStrictEquals(value, ['smart', 'funny', 'cool'], 'for...of should work');
    } catch (e: unknown) {
      assert.true(false, `for...of should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Array.from(record.qualities)` as expected', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'qualities',
          kind: 'array',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          qualities: ['smart', 'funny', 'cool'],
        },
      },
    });

    try {
      const value = Array.from(record.qualities);
      assert.true(true, 'Array.from should not throw');
      assert.arrayStrictEquals(value, ['smart', 'funny', 'cool'], 'Array.from should work');
    } catch (e: unknown) {
      assert.true(false, `Array.from should not throw: ${(e as Error).message}`);
    }
  });
});
