import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { JsonApiResource } from '@ember-data/store/-types/q/record-data-json-api';
import type { ResourceType } from '@warp-drive/core-types/symbols';
import type { Transform } from '@warp-drive/schema-record/schema';
import { registerDerivations, SchemaService, withFields } from '@warp-drive/schema-record/schema';

type address = {
  street: string;
  city: string;
  state: string;
  zip: string | number;
};
interface User {
  id: string;
  $type: 'user';
  name: string;
  address: address | null;
  [ResourceType]: 'user';
}
interface CreateUserType {
  id: string | null;
  $type: 'user';
  name: string | null;
  address: address | null;

  [ResourceType]: 'user';
}

module('Writes | object fields', function (hooks) {
  setupTest(hooks);

  test('we can update to a new object', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'field',
        },
        {
          name: 'address',
          type: null,
          kind: 'object',
        },
      ]),
    });

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
    assert.deepEqual(
      record.address,
      { street: '123 Main Street', city: 'Anytown', state: 'NY', zip: '12345' },
      'We have the correct address object'
    );
    const address = record.address;
    record.address = { street: '456 Elm Street', city: 'Sometown', state: 'NJ', zip: '23456' };
    assert.deepEqual(
      record.address,
      { street: '456 Elm Street', city: 'Sometown', state: 'NJ', zip: '23456' },
      'we have the correct Object members'
    );
    assert.strictEqual(address, record.address, 'Object reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek<JsonApiResource>(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.address,
      { street: '456 Elm Street', city: 'Sometown', state: 'NJ', zip: '23456' },
      'the cache values are correctly updated'
    );
  });

  test('we can update to null', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);
    schema.defineSchema('user', {
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'field',
        },
        {
          name: 'address',
          type: null,
          kind: 'object',
        },
      ]),
    });
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
    assert.deepEqual(
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
    const cachedResourceData = store.cache.peek<JsonApiResource>(identifier);
    assert.deepEqual(cachedResourceData?.attributes?.address, null, 'the cache values are correctly updated');
    record.address = {
      street: '123 Main Street',
      city: 'Anytown',
      state: 'NY',
      zip: '12345',
    };
    assert.deepEqual(
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
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);
    schema.defineSchema('user', {
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'field',
        },
        {
          name: 'address',
          type: null,
          kind: 'object',
        },
      ]),
    });
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
    assert.deepEqual(
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
    assert.deepEqual(
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
    const cachedResourceData = store.cache.peek<JsonApiResource>(identifier);
    assert.deepEqual(
      cachedResourceData?.attributes?.address,
      { street: '123 Main Street', city: 'Anytown', state: 'NJ', zip: '12345' },
      'the cache values are correctly updated'
    );
  });

  test('we can assign an object value to another record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);
    schema.defineSchema('user', {
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'field',
        },
        {
          name: 'address',
          type: null,
          kind: 'object',
        },
      ]),
    });
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
    assert.deepEqual(
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
    assert.deepEqual(
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
    const cachedResourceData = store.cache.peek<JsonApiResource>(identifier);
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

  test('we can edit simple object fields with a `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);
    schema.defineSchema('user', {
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'field',
        },
        {
          name: 'address',
          type: 'zip-string-from-int',
          kind: 'object',
        },
      ]),
    });

    const ZipStringFromIntTransform: Transform<address, address> = {
      serialize(value: address, options, _record): address {
        if (typeof value.zip === 'string') {
          return {
            street: value.street,
            city: value.city,
            state: value.state,
            zip: parseInt(value.zip),
          };
        }
        return value;
      },
      hydrate(value: address, _options, _record): address {
        return {
          street: value.street,
          city: value.city,
          state: value.state,
          zip: value.zip?.toString(),
        };
      },
      defaultValue(_options, _identifier) {
        assert.ok(false, 'unexpected defaultValue');
        throw new Error('unexpected defaultValue');
      },
    };
    schema.registerTransform('zip-string-from-int', ZipStringFromIntTransform);

    const sourceAddress = {
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
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'We have the correct object members'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.notStrictEqual(record.address, sourceAddress);
    const address = record.address;
    record.address = {
      street: '456 Elm St',
      city: 'Sometown',
      state: 'NJ',
      zip: '23456',
    };
    assert.deepEqual(
      record.address,
      {
        street: '456 Elm St',
        city: 'Sometown',
        state: 'NJ',
        zip: '23456',
      },
      'We have the correct object members'
    );
    assert.strictEqual(address, record.address, 'object reference does not change');
    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek<JsonApiResource>(identifier);
    assert.deepEqual(
      cachedResourceData?.attributes?.address,
      {
        street: '456 Elm St',
        city: 'Sometown',
        state: 'NJ',
        zip: 23456,
      },
      'the cache values are correct for the object field'
    );
    assert.deepEqual(
      sourceAddress,
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'we did not mutate the source object'
    );
  });

  test('we can edit single values in object fields with a `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);
    schema.defineSchema('user', {
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'field',
        },
        {
          name: 'address',
          type: 'zip-string-from-int',
          kind: 'object',
        },
      ]),
    });

    const ZipStringFromIntTransform: Transform<address, address> = {
      serialize(value: address, options, _record): address {
        if (typeof value.zip === 'string') {
          return {
            street: value.street,
            city: value.city,
            state: value.state,
            zip: parseInt(value.zip),
          };
        }
        return value;
      },
      hydrate(value: address, _options, _record): address {
        return {
          street: value.street,
          city: value.city,
          state: value.state,
          zip: value.zip?.toString(),
        };
      },
      defaultValue(_options, _identifier) {
        assert.ok(false, 'unexpected defaultValue');
        throw new Error('unexpected defaultValue');
      },
    };
    schema.registerTransform('zip-string-from-int', ZipStringFromIntTransform);

    const sourceAddress = {
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
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'We have the correct object members'
    );
    assert.strictEqual(record.address, record.address, 'We have a stable object reference');
    assert.notStrictEqual(record.address, sourceAddress);
    const address = record.address;
    record.address!.zip = '23456';

    assert.deepEqual(
      record.address,
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: '23456',
      },
      'We have the correct object members'
    );
    assert.strictEqual(address, record.address, 'object reference does not change');
    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek<JsonApiResource>(identifier);
    assert.deepEqual(
      cachedResourceData?.attributes?.address,
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: 23456,
      },
      'the cache values are correct for the object field'
    );
    assert.deepEqual(
      sourceAddress,
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: '12345',
      },
      'we did not mutate the source object'
    );
  });
});
