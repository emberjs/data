import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations } from '@warp-drive/schema-record';

interface Address {
  street: string;
  city: string;
}

interface User {
  id: string;
  $type: 'user';
  name: string;
  addresses: Address[];
  [Type]: 'user';
}

module('SchemaArray | Iterable Behaviors', function (hooks) {
  setupTest(hooks);

  test('we can use `JSON.stringify` on a SchemaArray', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
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
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
        'stringify should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `JSON.stringify should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `[ ...record.addresses ]` on a SchemaArray', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
      },
    });

    try {
      const value = [...record.addresses] as Address[];
      assert.true(true, 'spread should not throw');
      assert.deepEqual(
        value,
        [record.addresses[0], record.addresses[1]],
        'spread should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `spread should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `for (const value of record.addresses)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
      },
    });

    try {
      const value = [] as Address[];

      for (const val of record.addresses) {
        value.push(val);
      }

      assert.true(true, 'for...of should not throw');
      assert.deepEqual(value, [record.addresses[0], record.addresses[1]], 'for...of should work');
    } catch (e: unknown) {
      assert.true(false, `for...of should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Array.from(record.addresses)` as expected', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
      },
    });

    try {
      const value = Array.from(record.addresses);
      assert.true(true, 'Array.from should not throw');
      assert.deepEqual(value, [record.addresses[0], record.addresses[1]], 'Array.from should work');
    } catch (e: unknown) {
      assert.true(false, `Array.from should not throw: ${(e as Error).message}`);
    }
  });
});
