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

type business = {
  name: string;
  address?: address;
  addresses?: address[];
}
interface User {
  id: string;
  $type: 'user';
  name: string;
  address: address | null;
  business: business | null;
  [Type]: 'user';
}

module('Writes | schema-object fields', function (hooks) {
  setupTest(hooks);

  test('we can update to a new object', function (assert) {
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
            kind: 'schema-object',
            type: 'address',
          },
        ],
      })
    );

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Pupatine',
          address: {
            street: '123 Main Street',
            city: 'Anytown',
            state: 'NY',
            zip: '12345',
          },
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.propEqual(
      record.address,
      { street: '123 Main Street', city: 'Anytown', state: 'NY', zip: '12345' },
      'We have the correct address object'
    );
    const address = record.address;
    record.address = { street: '456 Elm Street', city: 'Sometown', state: 'NJ', zip: '23456' };
    assert.propEqual(
      record.address,
      { street: '456 Elm Street', city: 'Sometown', state: 'NJ', zip: '23456' },
      'we have the correct Object members'
    );
    assert.strictEqual(address, record.address, 'Object reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.address,
      { street: '456 Elm Street', city: 'Sometown', state: 'NJ', zip: '23456' },
      'the cache values are correctly updated'
    );
  });

  test('we can update to null', function (assert) {
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
            kind: 'schema-object',
            type: 'address',
          },
        ],
      })
    );
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Pupatine',
          address: {
            street: '123 Main Street',
            city: 'Anytown',
            state: 'NY',
            zip: '12345',
          },
        },
      },
    });
    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.propEqual(
      record.address,
      {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'We have the correct address object'
    );
    record.address = null;
    assert.strictEqual(record.address, null, 'The object is correctly set to null');
    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);
    assert.deepEqual(cachedResourceData?.attributes?.address, null, 'the cache values are correctly updated');
    record.address = {
      street: '123 Main Street',
      city: 'Anytown',
      state: 'NY',
      zip: '12345',
    };
    assert.propEqual(
      record.address,
      {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'We have the correct address object'
    );
  });

  test('we can update a single value in the object', function (assert) {
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
            kind: 'schema-object',
            type: 'address',
          },
        ],
      })
    );
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Pupatine',
          address: { street: '123 Main Street', city: 'Anytown', state: 'NY', zip: '12345' },
        },
      },
    });
    assert.propEqual(
      record.address,
      {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'We have the correct address object'
    );
    const address = record.address;
    record.address!.state = 'NJ';
    assert.propEqual(
      record.address,
      {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'NJ',
        zip: '12345',
      },
      'We have the correct address object'
    );
    assert.strictEqual(address, record.address, 'Object reference does not change');
    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);
    assert.deepEqual(
      cachedResourceData?.attributes?.address,
      { street: '123 Main Street', city: 'Anytown', state: 'NJ', zip: '12345' },
      'the cache values are correctly updated'
    );
  });

  test('we can assign an object value to another record', function (assert) {
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
            kind: 'schema-object',
            type: 'address',
          },
        ],
      })
    );
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Pupatine',
          address: {
            street: '123 Main Street',
            city: 'Anytown',
            state: 'NY',
            zip: '12345',
          },
        },
      },
    });
    const record2 = store.push<User>({
      data: {
        type: 'user',
        id: '2',
        attributes: { name: 'Luke Skybarker' },
      },
    });
    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.strictEqual(record2.id, '2', 'id is accessible');
    assert.strictEqual(record2.$type, 'user', '$type is accessible');
    assert.strictEqual(record2.name, 'Luke Skybarker', 'name is accessible');
    assert.propEqual(
      record.address,
      {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'We have the correct address object'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    const address = record.address;
    record2.address = record.address;
    assert.propEqual(
      record2.address,
      {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'We have the correct address object'
    );

    assert.strictEqual(address, record.address, 'Object reference does not change');
    assert.notStrictEqual(address, record2.address, 'We have a new object reference');
    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record2);
    const cachedResourceData = store.cache.peek(identifier);
    assert.deepEqual(
      cachedResourceData?.attributes?.address,
      {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'the cache values are correctly updated'
    );
  });

  test('throws errors when trying to set non-schema fields', function (assert) {
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
            kind: 'schema-object',
            type: 'address',
          },
        ],
      })
    );
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Pupatine',
          address: {
            street: '123 Main Street',
            city: 'Anytown',
            state: 'NY',
            zip: '12345',
          },
        },
      },
    });
    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.propEqual(
      record.address,
      {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'We have the correct address object'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.throws(() => {
      //@ts-expect-error
      record.address!.notAField = 'This should throw';
    }, /There is no field named notAField on address/);
    assert.throws(() => {
      record.address = {
        street: '456 Elm Street',
        city: 'Sometown',
        state: 'NJ',
        zip: '23456',
        //@ts-expect-error
        notAField: 'This should throw',
      };
    }, /Field notAField does not exist on schema object address/);
  });

  test('we can edit nested schema-object fields', function (assert) {
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
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
          address: sourceAddress,
          business: { name: 'Acme', address: sourceBusinessAddress },
        },
      },
    });
    
    assert.strictEqual(record.id, '1', 'id is accessible');
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
    record.business!.address = { street: '789 Oak St', city: 'Sometown', state: 'NJ', zip: '23456' };
    assert.propEqual(
      record.business?.address,
      { street: '789 Oak St', city: 'Sometown', state: 'NJ', zip: '23456' },
      'we can access nested address object'
    );
    assert.strictEqual(record.business?.address, record.business?.address, 'We have a stable object reference');
    // Test that the data entered teh cache properly
    const cachedResourceData2 = store.cache.peek(identifier);
    assert.deepEqual(
      cachedResourceData2?.attributes?.business,
      {
        name: 'Acme',
        address: {
          street: '789 Oak St',
          city: 'Sometown',
          state: 'NJ',
          zip: '23456',
        },
      },
      'the cache values are correct for a nested object field'
    );
  });

  test('we can edit nested nest schema-array fields inside a schema-object', function (assert) {
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
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
          address: sourceAddress,
          business: { name: 'Acme', addresses: [sourceBusinessAddress1, sourceBusinessAddress2] },
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.propEqual(
      record.address,
      { street: '123 Main St', city: 'Anytown', state: 'NY', zip: '12345' },
      'we can access address object'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.strictEqual(record.business?.name, 'Acme');
    assert.propEqual(record.business?.addresses, [
      { street: '456 Elm St', city: 'Anytown', state: 'NY', zip: '12345' },
      { street: '789 Oak St', city: 'Sometown', state: 'NJ', zip: '23456' },
    ]);
    assert.strictEqual(record.business?.addresses, record.business?.addresses, 'We have a stable array reference');
    record.business!.addresses![0] = { street: '123 Main St', city: 'Anytown', state: 'NY', zip: '12345' };
    assert.propEqual(
      record.business?.addresses,
      [
        { street: '123 Main St', city: 'Anytown', state: 'NY', zip: '12345' },
        { street: '789 Oak St', city: 'Sometown', state: 'NJ', zip: '23456' },
      ],
      'we can access nested address object'
    );
    assert.strictEqual(record.business?.addresses, record.business?.addresses, 'We have a stable array reference');
    // Test that the data entered teh cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);
    assert.deepEqual(
      cachedResourceData?.attributes?.business,
      {
        name: 'Acme',
        addresses: [
          { street: '123 Main St', city: 'Anytown', state: 'NY', zip: '12345' },
          { street: '789 Oak St', city: 'Sometown', state: 'NJ', zip: '23456' },
        ],
      },
      'the cache values are correct for a nested object field'
    );

  });

});
