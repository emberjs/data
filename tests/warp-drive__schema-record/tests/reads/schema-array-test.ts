import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { JsonApiResource } from '@ember-data/store/-types/q/record-data-json-api';
import type { ResourceType } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record/schema';

interface address {
  street: string;
  city: string;
  state: string;
  zip: string | number;
}

interface CreateUserType {
  id: string | null;
  $type: 'user';
  name: string | null;
  addresses: address[] | null;
  [ResourceType]: 'user';
}

module('Reads | schema-array fields', function (hooks) {
  setupTest(hooks);

  test('we can use simple schema-array fields', function (assert) {
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
            name: 'addresses',
            type: 'address',
            kind: 'schema-array',
          },
        ],
      })
    );

    const sourceArray = [
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      {
        street: '456 Elm St',
        city: 'Othertown',
        state: 'CA',
        zip: '54321',
      },
    ];
    const record = store.createRecord<CreateUserType>('user', {
      name: 'Rey Skybarker',
      addresses: sourceArray,
    });

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Array.isArray(record.addresses), 'we can access favoriteNumber array');
    assert.propContains(
      record.addresses?.slice(),
      [
        {
          street: '123 Main St',
          city: 'Anytown',
          state: 'NY',
          zip: '12345',
        },
        {
          street: '456 Elm St',
          city: 'Othertown',
          state: 'CA',
          zip: '54321',
        },
      ],
      'We have the correct array members'
    );
    assert.strictEqual(record.addresses, record.addresses, 'We have a stable array reference');
    assert.notStrictEqual(record.addresses, sourceArray);

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek<JsonApiResource>(identifier);

    assert.notStrictEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      sourceArray,
      'with no transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.addresses,
      [
        {
          street: '123 Main St',
          city: 'Anytown',
          state: 'NY',
          zip: '12345',
        },
        {
          street: '456 Elm St',
          city: 'Othertown',
          state: 'CA',
          zip: '54321',
        },
      ],
      'the cache values are correct for the array field'
    );
  });
});
