import { rerender } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

import { reactiveContext } from '../-utils/reactive-context';

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}
interface User {
  id: string | null;
  $type: 'user';
  name: string;
  favoriteNumbers: string[];
  address: Address;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
}

module('Reactivity | schema object fields can receive remote updates', function (hooks) {
  setupRenderingTest(hooks);

  test('we can use simple fields with no `type`', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      identity: null,
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
            name: 'address',
            kind: 'schema-object',
            type: 'address',
          },
        ],
      })
    );
    const resource = schema.resource({ type: 'user' });
    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'NY',
            zip: '12345',
          },
        },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.propEqual(
      record.address,
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'address is accessible'
    );

    const { counters } = await reactiveContext(record, resource);
    // TODO: actually render the address object and verify
    // const addressIndex = fieldOrder.indexOf('address');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.address, 1, 'addressCount is 1');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          address: {
            street: '456 Elm St',
            city: 'Anytown',
            state: 'NJ',
            zip: '23456',
          },
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.propEqual(
      record.address,
      {
        street: '456 Elm St',
        city: 'Anytown',
        state: 'NJ',
        zip: '23456',
      },
      'address is accessible'
    );

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.address, 2, 'addressCount is 2');
  });

  test('we can use simple fields with sourceKeys', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      identity: null,
      type: 'address',
      fields: [
        {
          name: 'zip',
          sourceKey: 'zip_code',
          kind: 'field',
        },
      ],
    });
    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'address',
            sourceKey: 'user_address',
            kind: 'schema-object',
            type: 'address',
          },
        ],
      })
    );
    const resource = schema.resource({ type: 'user' });
    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            zip_code: 90219,
          },
        },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.propEqual(
      record.address,
      {
        zip: 90219,
      },
      'address is accessible'
    );

    const { counters } = await reactiveContext(record, resource);
    // TODO: actually render the address object and verify
    // const addressIndex = fieldOrder.indexOf('address');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.address, 1, 'addressCount is 1');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            zip_code: 90210,
          },
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.propEqual(
      record.address,
      {
        zip: 90210,
      },
      'address is accessible'
    );

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.address, 2, 'addressCount is 2');
  });
});
