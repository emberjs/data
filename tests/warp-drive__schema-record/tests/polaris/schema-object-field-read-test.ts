import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';
import type { ObjectValue } from '@warp-drive/core-types/json/raw';
import { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

import type Store from 'warp-drive__schema-record/services/store';

type address = {
  street: string;
  city: string;
  state: string;
  zip: string | number;
};

type business = {
  name: string;
  address?: address;
  addresses?: address[];
};

interface CreateUserType {
  id: string | null;
  $type: 'user';
  name: string | null;
  address: address | null;
  business: business | null;
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
    assert.propEqual(
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
    assert.throws(() => record.address!.notField as unknown, /No field named notField on address/);
  });

  test('we can use nested schema-object fields', function (assert) {
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
          type: 'address',
          kind: 'schema-object',
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
          {
            name: 'business',
            type: 'business',
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
    const sourceBusinessAddress: address = {
      street: '456 Elm St',
      city: 'Anytown',
      state: 'NY',
      zip: '12345',
    };
    const record = store.createRecord<CreateUserType>('user', {
      name: 'Rey Skybarker',
      address: sourceAddress,
      business: { name: 'Acme', address: sourceBusinessAddress },
    });

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.propEqual(
      record.address,
      { street: '123 Main St', city: 'Anytown', state: 'NY', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.notStrictEqual(record.address, sourceAddress);
    assert.strictEqual(record.business?.name, 'Acme');
    assert.propEqual(record.business?.address, { street: '456 Elm St', city: 'Anytown', state: 'NY', zip: '12345' });

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
      'the cache values are correct for the object field'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.business,
      {
        name: 'Acme',
        address: {
          street: '456 Elm St',
          city: 'Anytown',
          state: 'NY',
          zip: '12345',
        },
      },
      'the cache values are correct for a nested object field'
    );
    // @ts-expect-error
    assert.throws(() => record.address!.notField as unknown, /No field named notField on address/);
    // @ts-expect-error
    assert.throws(() => record.business!.address.notField as unknown, /No field named notField on address/);
  });

  test('we can nest schema-array fields inside a schema-object', function (assert) {
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
          name: 'addresses',
          type: 'address',
          kind: 'schema-array',
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
          {
            name: 'business',
            type: 'business',
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
    const sourceBusinessAddress1: address = {
      street: '456 Elm St',
      city: 'Anytown',
      state: 'NY',
      zip: '12345',
    };
    const sourceBusinessAddress2: address = {
      street: '789 Oak St',
      city: 'Sometown',
      state: 'NJ',
      zip: '23456',
    };
    const record = store.createRecord<CreateUserType>('user', {
      name: 'Rey Skybarker',
      address: sourceAddress,
      business: { name: 'Acme', addresses: [sourceBusinessAddress1, sourceBusinessAddress2] },
    });

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.propEqual(
      record.address,
      { street: '123 Main St', city: 'Anytown', state: 'NY', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.notStrictEqual(record.address, sourceAddress);
    assert.strictEqual(record.business?.name, 'Acme');
    assert.propEqual(record.business?.addresses, [
      { street: '456 Elm St', city: 'Anytown', state: 'NY', zip: '12345' },
      { street: '789 Oak St', city: 'Sometown', state: 'NJ', zip: '23456' },
    ]);
    assert.strictEqual(record.business?.addresses, record.business?.addresses, 'We have a stable array reference');
    // @ts-expect-error
    assert.throws(() => record.business!.addresses![0].notField as unknown, /No field named notField on address/);
  });

  test('we can use schema-object fields with sourceKeys', function (assert) {
    type Address = {
      zip: string;
    };
    interface UserWithSourceKeys {
      id: string | null;
      $type: 'user';
      name: string | null;
      address: Address | null;
      [Type]: 'user';
    }
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
            name: 'name',
            kind: 'field',
          },
          {
            name: 'address',
            sourceKey: 'user_address',
            type: 'address',
            kind: 'schema-object',
          },
        ],
      })
    );

    const record = store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
          user_address: {
            zip_code: '12345',
          },
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.propEqual(record.address, { zip: '12345' }, 'we can access address object');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(record.address?.zip, '12345', 'we can access zip');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.user_address,
      {
        zip_code: '12345',
      },
      'the cache values are correct for the array field'
    );
  });

  test('we can use schema-objects with identity and type hash functions', function (assert) {
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
      address: Address | null;
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
            name: 'address',
            sourceKey: 'user_address',
            type: '@computeAddressType',
            kind: 'schema-object',
            options: {
              polymorphic: true,
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
          user_address: {
            type: 'business',
            name: 'AuditBoard',
            zip: '12345',
          },
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.step('^^ precursors ^^');

    assert.propEqual(
      record.address,
      { type: 'business', name: 'AuditBoard', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(record.address?.type === 'business' && record.address.zip, '12345', 'we can access zip');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.user_address,
      {
        type: 'business',
        name: 'AuditBoard',
        zip: '12345',
      },
      'the cache values are correct for the field'
    );
    assert.step('^^ initial stability ^^');

    const originalAddress = record.address;

    // check what happens when we don't "change identity"
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'business',
            name: 'AuditBoard Inc.',
            zip: '12345',
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'business', name: 'AuditBoard Inc.', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.address, originalAddress, 'We have a stable object reference');
    assert.strictEqual(record.address?.type === 'business' && record.address.zip, '12345', 'we can access zip');
    assert.step('^^ new payload with same values ^^');

    // check what happens when we DO "change identity"
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'business',
            name: 'AuditBoard Inc.',
            zip: '54321',
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'business', name: 'AuditBoard Inc.', zip: '54321' },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, originalAddress, 'We changed object references');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(record.address?.type === 'business' && record.address.zip, '54321', 'we can access zip');
    const lastBusinessAddress = record.address;
    assert.step('^^ new payload with new identity ^^');

    // check what happens when we change type, we should change references
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'single-family-home',
            street: 'Sunset Hills',
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'single-family-home', street: 'Sunset Hills' },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, lastBusinessAddress, 'We changed object references');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(
      record.address?.type === 'single-family-home' && record.address.street,
      'Sunset Hills',
      'we can access street'
    );
    assert.step('^^ new payload with new identity and new type ^^');

    const lastHomeAddress = record.address;

    // check what happens when we change type but have the same identity calc output, we should still change references
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'condominium-home',
            street: 'Sunset Hills',
            unit: 5,
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'condominium-home', street: 'Sunset Hills', unit: 5 },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, lastHomeAddress, 'We changed object references');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(
      record.address?.type === 'condominium-home' && record.address.street,
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

  test('we can use schema-objects with identity hash function and type value path', function (assert) {
    type BusinessAddress = {
      type: 'business';
      special_type: 'fragment:address:business';
      name: string;
      zip: string;
    };

    type HomeAddress = {
      type: 'single-family-home';
      special_type: 'fragment:address:business';
      street: string;
    };

    type CondoAddress = {
      type: 'condominium-home';
      special_type: 'fragment:address:business';
      street: string;
      unit: number;
    };

    type Address = HomeAddress | BusinessAddress | CondoAddress;

    interface UserWithSourceKeys {
      id: string | null;
      $type: 'user';
      name: string | null;
      address: Address | null;
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
          name: 'special_type',
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
          name: 'special_type',
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
          name: 'special_type',
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
            name: 'address',
            sourceKey: 'user_address',
            type: 'type',
            kind: 'schema-object',
            options: {
              polymorphic: true,
              type: 'special_type',
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
    schema.registerHashFn(hashAddressIdentity);

    const record = store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
          user_address: {
            type: 'business',
            special_type: 'fragment:address:business',
            name: 'AuditBoard',
            zip: '12345',
          },
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.step('^^ precursors ^^');

    assert.propEqual(
      record.address,
      { type: 'business', special_type: 'fragment:address:business', name: 'AuditBoard', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(record.address?.type === 'business' && record.address.zip, '12345', 'we can access zip');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.user_address,
      {
        type: 'business',
        special_type: 'fragment:address:business',
        name: 'AuditBoard',
        zip: '12345',
      },
      'the cache values are correct for the field'
    );
    assert.step('^^ initial stability ^^');

    const originalAddress = record.address;

    // check what happens when we don't "change identity"
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'business',
            special_type: 'fragment:address:business',
            name: 'AuditBoard Inc.',
            zip: '12345',
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'business', special_type: 'fragment:address:business', name: 'AuditBoard Inc.', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.address, originalAddress, 'We have a stable object reference');
    assert.strictEqual(record.address?.type === 'business' && record.address.zip, '12345', 'we can access zip');
    assert.step('^^ new payload with same values ^^');

    // check what happens when we DO "change identity"
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'business',
            special_type: 'fragment:address:business',
            name: 'AuditBoard Inc.',
            zip: '54321',
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'business', special_type: 'fragment:address:business', name: 'AuditBoard Inc.', zip: '54321' },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, originalAddress, 'We changed object references');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(record.address?.type === 'business' && record.address.zip, '54321', 'we can access zip');
    const lastBusinessAddress = record.address;
    assert.step('^^ new payload with new identity ^^');

    // check what happens when we change type, we should change references
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'single-family-home',
            special_type: 'fragment:address:single-family-home',
            street: 'Sunset Hills',
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'single-family-home', special_type: 'fragment:address:single-family-home', street: 'Sunset Hills' },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, lastBusinessAddress, 'We changed object references');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(
      record.address?.type === 'single-family-home' && record.address.street,
      'Sunset Hills',
      'we can access street'
    );
    assert.step('^^ new payload with new identity and new type ^^');

    const lastHomeAddress = record.address;

    // check what happens when we change type but have the same identity calc output, we should still change references
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'condominium-home',
            special_type: 'fragment:address:condominium-home',
            street: 'Sunset Hills',
            unit: 5,
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      {
        type: 'condominium-home',
        special_type: 'fragment:address:condominium-home',
        street: 'Sunset Hills',
        unit: 5,
      },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, lastHomeAddress, 'We changed object references');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(
      record.address?.type === 'condominium-home' && record.address.street,
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

  test('we can use schema-objects with identity and type null', function (assert) {
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
      address: Address | null;
      [Type]: 'user';
    }
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      identity: null,
      type: 'business',
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
      identity: null,
      type: 'single-family-home',
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
      identity: null,
      type: 'condominium-home',
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
            name: 'address',
            sourceKey: 'user_address',
            type: null,
            kind: 'schema-object',
            options: {
              polymorphic: true,
            },
          },
        ],
      })
    );

    const record = store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
          user_address: {
            type: 'business',
            name: 'AuditBoard',
            zip: '12345',
          },
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.step('^^ precursors ^^');

    assert.propEqual(
      record.address,
      { type: 'business', name: 'AuditBoard', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(record.address?.type === 'business' && record.address.zip, '12345', 'we can access zip');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.user_address,
      {
        type: 'business',
        name: 'AuditBoard',
        zip: '12345',
      },
      'the cache values are correct for the field'
    );
    assert.step('^^ initial stability ^^');

    const originalAddress = record.address;

    // check what happens when we don't "change identity"
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'business',
            name: 'AuditBoard Inc.',
            zip: '12345',
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'business', name: 'AuditBoard Inc.', zip: '12345' },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, originalAddress, 'We changed the object reference');
    assert.strictEqual(record.address?.type === 'business' && record.address.zip, '12345', 'we can access zip');
    assert.step('^^ new payload with same values ^^');

    // check what happens when we DO "change identity"
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'business',
            name: 'AuditBoard Inc.',
            zip: '54321',
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'business', name: 'AuditBoard Inc.', zip: '54321' },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, originalAddress, 'We changed object references');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(record.address?.type === 'business' && record.address.zip, '54321', 'we can access zip');
    const lastBusinessAddress = record.address;
    assert.step('^^ new payload with new identity ^^');

    // check what happens when we change type, we should change references
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'single-family-home',
            street: 'Sunset Hills',
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'single-family-home', street: 'Sunset Hills' },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, lastBusinessAddress, 'We changed object references');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(
      record.address?.type === 'single-family-home' && record.address.street,
      'Sunset Hills',
      'we can access street'
    );
    assert.step('^^ new payload with new identity and new type ^^');

    const lastHomeAddress = record.address;

    // check what happens when we change type but have the same identity calc output, we should still change references
    store.push<UserWithSourceKeys>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          user_address: {
            type: 'condominium-home',
            street: 'Sunset Hills',
            unit: 5,
          },
        },
      },
    });

    assert.propEqual(
      record.address,
      { type: 'condominium-home', street: 'Sunset Hills', unit: 5 },
      'we can access address object'
    );
    assert.notStrictEqual(record.address, lastHomeAddress, 'We changed object references');
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(
      record.address?.type === 'condominium-home' && record.address.street,
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
