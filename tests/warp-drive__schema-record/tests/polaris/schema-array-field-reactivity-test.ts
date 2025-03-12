import { rerender } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { ObjectValue } from '@warp-drive/core-types/json/raw';
import { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

import { reactiveContext } from '../-utils/reactive-context';

interface address {
  street: string;
  city: string;
  state: string;
  zip: string | number;
}

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  addresses: Array<address | null> | null;
  favoriteNumbers: string[];
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
}

module('Reactivity | schema-array fields can receive remote updates', function (hooks) {
  setupRenderingTest(hooks);

  test('we can use simple fields with no `type`', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    function hashAddress<T extends object>(data: T, options: ObjectValue | null, prop: string | null): string {
      const newData = data as address;
      return `${newData.street}|${newData.city}|${newData.state}|${newData.zip}`;
    }
    hashAddress[Type] = 'address';
    schema.registerHashFn(hashAddress);
    schema.registerResource({
      identity: { name: 'fullAddress', kind: '@hash', type: 'address' },
      type: 'address',
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
        {
          name: 'state',
          kind: 'field',
        },
        {
          name: 'zip',
          kind: 'field',
        },
      ],
    });

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'favoriteNumbers',
            kind: 'array',
          },
          {
            name: 'addresses',
            type: 'address',
            kind: 'schema-array',
            options: { key: '@hash' },
          },
        ],
      })
    );

    const fields = schema.resource({ type: 'user' });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          favoriteNumbers: ['1', '2'],
          addresses: [
            { street: '123 Main St', city: 'Anytown', state: 'NY', zip: '12345' },
            { street: '456 Elm St', city: 'Anytown', state: 'NY', zip: '12345' },
          ],
        },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.deepEqual(record.favoriteNumbers, ['1', '2'], 'favoriteNumbers is accessible');
    assert.strictEqual(record.addresses?.length, 2, 'addresses is accessible');
    assert.strictEqual(record.addresses![0], record.addresses![0], 'addresses are stable by index');
    assert.strictEqual(record.addresses![1], record.addresses![1], 'addresses are stable by index');
    assert.notStrictEqual(
      record.addresses![1],
      record.addresses![0],
      'embeded SchemaRecord instances are not accidentally reused'
    );
    assert.strictEqual(record.addresses![0]!.street, '123 Main St', 'addresses are accessible');
    assert.strictEqual(record.addresses![1]!.street, '456 Elm St', 'addresses are accessible');

    const addressRecord0 = record.addresses![0]!;
    const addressRecord1 = record.addresses![1]!;

    const { counters, fieldOrder } = await reactiveContext(record, fields);
    const favoriteNumbersIndex = fieldOrder.indexOf('favoriteNumbers');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.favoriteNumbers, 1, 'favoriteNumbersCount is 1');
    assert.strictEqual(counters.addresses, 1, 'addressesCount is 1');

    assert
      .dom(`li:nth-child(${favoriteNumbersIndex + 1})`)
      .hasText('favoriteNumbers: 1,2', 'favoriteNumbers is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          favoriteNumbers: ['3', '4'],
          addresses: [
            { street: '123 Main St', city: 'Anytown', state: 'NY', zip: '12345' },
            { street: '678 Broadway St', city: 'Tinsletown', state: 'CA', zip: '54321' },
            { street: '911 Emergency St', city: 'Paradise', state: 'CA', zip: '90211' },
          ],
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.deepEqual(record.favoriteNumbers, ['3', '4'], 'favoriteNumbers is accessible');
    assert.strictEqual(record.addresses?.length, 3, 'addresses is accessible');
    assert.strictEqual(record.addresses![0], record.addresses![0], 'addresses are stable by index');
    assert.strictEqual(record.addresses![1], record.addresses![1], 'addresses are stable by index');
    assert.strictEqual(record.addresses![2], record.addresses![2], 'addresses are stable by index');
    assert.notStrictEqual(
      record.addresses![1],
      record.addresses![0],
      'embeded SchemaRecord instances are not accidentally reused'
    );
    assert.strictEqual(record.addresses![0]!.street, '123 Main St', 'addresses are accessible');
    assert.strictEqual(record.addresses![1]!.street, '678 Broadway St', 'addresses are accessible');
    assert.strictEqual(record.addresses![2]!.street, '911 Emergency St', 'addresses are accessible');
    assert.strictEqual(record.addresses![0], addressRecord0, 'addressRecord0 is stable');
    assert.notStrictEqual(record.addresses![1], addressRecord1, 'addressRecord1 is a new object');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.favoriteNumbers, 2, 'favoriteNumbersCount is 2');
    assert.strictEqual(counters.addresses, 2, 'addressesCount is 2');

    assert
      .dom(`li:nth-child(${favoriteNumbersIndex + 1})`)
      .hasText('favoriteNumbers: 3,4', 'favoriteNumbers is rendered');
  });
});
