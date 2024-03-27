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

interface CreateUserType {
  id: string | null;
  $type: 'user';
  name: string | null;
  address: address | null;
  [ResourceType]: 'user';
}

module('Reads | object fields', function (hooks) {
  setupTest(hooks);

  test('we can use simple object fields with no `type`', function (assert) {
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
    const cachedResourceData = store.cache.peek<JsonApiResource>(identifier);

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
  });

  test('we can use simple object fields with a `type`', function (assert) {
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
      zip: 12345,
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
    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek<JsonApiResource>(identifier);
    assert.notStrictEqual(
      cachedResourceData?.attributes?.address,
      sourceAddress,
      'with transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.address,
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: 12345,
      },
      'the cache values are correct for the object field'
    );
    assert.deepEqual(
      sourceAddress,
      {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: 12345,
      },
      'we did not mutate the source array'
    );
  });
});
