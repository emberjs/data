import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';
import type { ObjectValue } from '@warp-drive/core-types/json/raw';
import { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

import type Store from 'warp-drive__schema-record/services/store';

interface address {
  street: string;
  city: string;
  state: string;
  zip: string | number;
}

interface business {
  name: string;
  address?: address;
  addresses?: address[];
}
interface CreateUserType {
  id: string | null;
  $type: 'user';
  name: string | null;
  addresses: address[] | null;
  businesses: business[] | null;
  [Type]: 'user';
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
    assert.true(Array.isArray(record.addresses), 'we can access address array');
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
    const cachedResourceData = store.cache.peek(identifier);

    assert.notStrictEqual(
      cachedResourceData?.attributes?.addresses,
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

  test('we can nest schema objects within schema-array fields', function (assert) {
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
    schema.registerResource({
      identity: null,
      type: 'business',
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'address',
          kind: 'schema-object',
          type: 'address',
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
            name: 'businesses',
            type: 'business',
            kind: 'schema-array',
          },
        ],
      })
    );

    const sourceArray = [
      {
        name: 'Acme',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'NY',
          zip: '12345',
        },
      },
      {
        name: 'Globex',
        address: {
          street: '456 Elm St',
          city: 'Othertown',
          state: 'CA',
          zip: '54321',
        },
      },
    ];
    const record = store.createRecord<CreateUserType>('user', {
      name: 'Rey Skybarker',
      businesses: sourceArray,
    });

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Array.isArray(record.businesses), 'we can access businesses array');
    assert.propEqual(
      record.businesses?.slice(),
      [
        {
          name: 'Acme',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'NY',
            zip: '12345',
          },
        },
        {
          name: 'Globex',
          address: {
            street: '456 Elm St',
            city: 'Othertown',
            state: 'CA',
            zip: '54321',
          },
        },
      ],
      'We have the correct array members'
    );
    assert.strictEqual(record.businesses, record.businesses, 'We have a stable array reference');
    assert.notStrictEqual(record.businesses, sourceArray);

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.notStrictEqual(
      cachedResourceData?.attributes?.businesses,
      sourceArray,
      'with no transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.businesses,
      [
        {
          name: 'Acme',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'NY',
            zip: '12345',
          },
        },
        {
          name: 'Globex',
          address: {
            street: '456 Elm St',
            city: 'Othertown',
            state: 'CA',
            zip: '54321',
          },
        },
      ],
      'the cache values are correct for the array field'
    );
  });

  test('we can use schema-objects in schema-arrays with identity and type hash functions', function (assert) {
    type BusinessAddress = {
      type: 'business';
      name: string;
      zip: string;
    };

    type HomeAddress = {
      type: 'single-family-home';
      street: string;
    };

    type CondoAddress = {
      type: 'condominium-home';
      street: string;
      unit: number;
    };

    type Address = HomeAddress | BusinessAddress | CondoAddress;

    interface UserWithSourceKeys {
      id: string | null;
      $type: 'user';
      name: string | null;
      addresses: Address[];
      [Type]: 'user';
    }
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      identity: { kind: '@hash', type: '@computeAddressIdentity', name: null },
      type: 'fragment:address:business',
      fields: [
        {
          name: 'type',
          kind: 'field',
        },
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'zip',
          kind: 'field',
        },
      ],
    });
    schema.registerResource({
      identity: { kind: '@hash', type: '@computeAddressIdentity', name: null },
      type: 'fragment:address:single-family-home',
      fields: [
        {
          name: 'type',
          kind: 'field',
        },
        {
          name: 'street',
          kind: 'field',
        },
      ],
    });
    schema.registerResource({
      identity: { kind: '@hash', type: '@computeAddressIdentity', name: null },
      type: 'fragment:address:condominium-home',
      fields: [
        {
          name: 'type',
          kind: 'field',
        },
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'unit',
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
            sourceKey: 'user_addresses',
            type: '@computeAddressType',
            kind: 'schema-array',
            options: {
              polymorphic: true,
              key: '@hash',
              type: '@hash',
            },
          },
        ],
      })
    );
    function hashAddressIdentity<T extends object>(data: T, options: ObjectValue | null, prop: string | null): string {
      const newData = data as Address;
      return newData.type === 'business' ? newData.zip : newData.street;
    }
    hashAddressIdentity[Type] = '@computeAddressIdentity';
    function hashAddressType<T extends object>(data: T, options: ObjectValue | null, prop: string | null): string {
      const newData = data as Address;
      return `fragment:address:${newData.type}`;
    }
    hashAddressType[Type] = '@computeAddressType';
    schema.registerHashFn(hashAddressIdentity);
    schema.registerHashFn(hashAddressType);

    const record = store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
          user_addresses: [
            {
              type: 'business',
              name: 'AuditBoard',
              zip: '12345',
            },
          ],
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.step('^^ precursors ^^');

    assert.propEqual(
      record.addresses[0],
      { type: 'business', name: 'AuditBoard', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.addresses[0], record.addresses[0], 'We have a stable object reference');
    assert.strictEqual(
      record.addresses[0].type === 'business' && record.addresses[0]?.zip,
      '12345',
      'we can access zip'
    );

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.user_addresses,
      [
        {
          type: 'business',
          name: 'AuditBoard',
          zip: '12345',
        },
      ],
      'the cache values are correct for the field'
    );
    assert.step('^^ initial stability ^^');

    const originalAddress = record.addresses[0];

    // check what happens when we don't "change identity"
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_addresses: [
            {
              type: 'business',
              name: 'AuditBoard Inc.',
              zip: '12345',
            },
          ],
        },
      },
    });

    assert.propEqual(
      record.addresses[0],
      { type: 'business', name: 'AuditBoard Inc.', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.addresses[0], originalAddress, 'We have a stable object reference');
    assert.strictEqual(
      record.addresses[0].type === 'business' && record.addresses[0].zip,
      '12345',
      'we can access zip'
    );
    assert.step('^^ new payload with same values ^^');

    // check what happens when we DO "change identity"
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_addresses: [
            {
              type: 'business',
              name: 'AuditBoard Inc.',
              zip: '54321',
            },
          ],
        },
      },
    });

    assert.propEqual(
      record.addresses[0],
      { type: 'business', name: 'AuditBoard Inc.', zip: '54321' },
      'we can access address object'
    );
    assert.notStrictEqual(record.addresses[0], originalAddress, 'We changed object references');
    assert.strictEqual(record.addresses[0], record.addresses[0], 'We have a stable object reference');
    assert.strictEqual(
      record.addresses[0].type === 'business' && record.addresses[0].zip,
      '54321',
      'we can access zip'
    );
    const lastBusinessAddress = record.addresses[0];
    assert.step('^^ new payload with new identity ^^');

    // check what happens when we change type, we should change references
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_addresses: [
            {
              type: 'single-family-home',
              street: 'Sunset Hills',
            },
          ],
        },
      },
    });

    assert.propEqual(
      record.addresses[0],
      { type: 'single-family-home', street: 'Sunset Hills' },
      'we can access address object'
    );
    assert.notStrictEqual(record.addresses[0], lastBusinessAddress, 'We changed object references');
    assert.strictEqual(record.addresses[0], record.addresses[0], 'We have a stable object reference');
    assert.strictEqual(
      record.addresses[0].type === 'single-family-home' && record.addresses[0].street,
      'Sunset Hills',
      'we can access street'
    );
    assert.step('^^ new payload with new identity and new type ^^');

    const lastHomeAddress = record.addresses[0];

    // check what happens when we change type but have the same identity calc output, we should still change references
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_addresses: [
            {
              type: 'condominium-home',
              street: 'Sunset Hills',
              unit: 5,
            },
          ],
        },
      },
    });

    assert.propEqual(
      record.addresses[0],
      { type: 'condominium-home', street: 'Sunset Hills', unit: 5 },
      'we can access address object'
    );
    assert.notStrictEqual(record.addresses[0], lastHomeAddress, 'We changed object references');
    assert.strictEqual(record.addresses[0], record.addresses[0], 'We have a stable object reference');
    assert.strictEqual(
      record.addresses[0].type === 'condominium-home' && record.addresses[0].street,
      'Sunset Hills',
      'we can access street'
    );
    assert.step('^^ new payload with new type same identity ^^');

    assert.verifySteps([
      '^^ precursors ^^',
      '^^ initial stability ^^',
      '^^ new payload with same values ^^',
      '^^ new payload with new identity ^^',
      '^^ new payload with new identity and new type ^^',
      '^^ new payload with new type same identity ^^',
    ]);
  });
});
