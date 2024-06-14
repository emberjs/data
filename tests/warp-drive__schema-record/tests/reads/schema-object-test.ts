import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record/schema';

import type Store from 'warp-drive__schema-record/services/store';

type address = {
  street: string;
  city: string;
  state: string;
  zip: string | number;
};

interface CreateUserType {
  id: string | null;
  $type: 'user';
  name: string | null;
  address: address | null;
  [Type]: 'user';
}

module('Reads | schema-object fields', function (hooks) {
  setupTest(hooks);

  test('we can use schema-object fields', function (assert) {
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
            name: 'name',
            kind: 'field',
          },
          {
            name: 'address',
            type: 'address',
            kind: 'schema-object',
          },
        ],
      })
    );

    const sourceAddress: address = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'NY',
      zip: '12345',
    };
    const record = store.createRecord<CreateUserType>('user', { name: 'Rey Skybarker', address: sourceAddress });

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.deepEqual(
      record.address,
      { street: '123 Main St', city: 'Anytown', state: 'NY', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.notStrictEqual(record.address, sourceAddress);

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.notStrictEqual(
      cachedResourceData?.attributes?.address,
      sourceAddress,
      'with no transform we will still divorce the object reference'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.address,
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'the cache values are correct for the array field'
    );
    // @ts-expect-error
    assert.throws(() => record.address!.notField as unknown, /Field notField does not exist on schema object address/);
  });
});
