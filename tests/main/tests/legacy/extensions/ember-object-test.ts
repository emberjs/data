import { module, test } from 'qunit';

import JSONAPICache from '@ember-data/json-api';
import { DEBUG } from '@warp-drive/build-config/env';
import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import { instantiateRecord, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import type { Type } from '@warp-drive/core-types/symbols';
import { EmberObjectExtension, type WithEmberObject } from '@warp-drive/legacy/compat/extensions';
import { registerDerivations, withDefaults } from '@warp-drive/legacy/model/migration-support';

class TestStore extends Store {
  requestManager = new RequestManager().use([Fetch]).useCache(CacheHandler);

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: ResourceKey, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}

module('Legacy | Extensions | EmberObject', function () {
  test('We can add ember-object extension to an object via a field', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberObjectExtension);
    store.schema.registerResources([
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'field',
            name: 'name',
          },
          {
            kind: 'object',
            name: 'address',
          },
          {
            kind: 'object',
            name: 'businessAddress',
            options: {
              objectExtensions: ['ember-object'],
            },
          },
        ],
      }),
    ]);
    interface Address {
      street: string;
    }
    interface User {
      id: string;
      name: string;
      address: Address;
      businessAddress: WithEmberObject<Address>;
      [Type]: 'user';
    }
    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          address: {
            street: 'Crowell',
          },
          businessAddress: {
            street: 'Hunter Mill',
          },
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');
    assert.strictEqual(user1.address?.street, 'Crowell');
    assert.strictEqual(user1.businessAddress?.street, 'Hunter Mill');

    // we expect an error since not in schema
    try {
      // @ts-expect-error
      user1.address.get('street');
      assert.ok(false, 'we should fail');
    } catch (e) {
      assert.strictEqual((e as Error).message, 'user1.address.get is not a function');
    }

    // we should not error since in the schema, nor should we have a type error
    assert.strictEqual(user1.businessAddress.get('street'), 'Hunter Mill', 'get works');
  });

  test('We can add ember-object extension to a schema-object via a field', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberObjectExtension);
    store.schema.registerResources([
      {
        type: 'fragment:address',
        identity: null,
        fields: [
          {
            kind: 'field',
            name: 'street',
          },
        ],
      },
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'field',
            name: 'name',
          },
          {
            kind: 'schema-object',
            name: 'address',
            type: 'fragment:address',
          },
          {
            kind: 'schema-object',
            name: 'businessAddress',
            type: 'fragment:address',
            options: {
              objectExtensions: ['ember-object'],
            },
          },
        ],
      }),
    ]);
    interface Address {
      street: string;
    }
    interface User {
      id: string;
      name: string;
      address: Address;
      businessAddress: WithEmberObject<Address>;
      [Type]: 'user';
    }
    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          address: {
            street: 'Crowell',
          },
          businessAddress: {
            street: 'Hunter Mill',
          },
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');
    assert.strictEqual(user1.address?.street, 'Crowell');
    assert.strictEqual(user1.businessAddress?.street, 'Hunter Mill');

    // we expect an error since not in schema
    try {
      // @ts-expect-error
      user1.address.get('street');
      assert.ok(false, 'we should fail');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        DEBUG ? 'No field named get on fragment:address' : 'user1.address.get is not a function'
      );
    }

    // we should not error since in the schema, nor should we have a type error
    assert.strictEqual(user1.businessAddress.get('street'), 'Hunter Mill', 'get works');
  });

  test('We can add ember-object extension to a schema-object via a schema-array field', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberObjectExtension);
    store.schema.registerResources([
      {
        type: 'fragment:address',
        identity: null,
        fields: [
          {
            kind: 'field',
            name: 'street',
          },
        ],
      },
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'field',
            name: 'name',
          },
          {
            kind: 'schema-object',
            name: 'address',
            type: 'fragment:address',
          },
          {
            kind: 'schema-array',
            name: 'businessAddresses',
            type: 'fragment:address',
            options: {
              objectExtensions: ['ember-object'],
            },
          },
        ],
      }),
    ]);
    interface Address {
      street: string;
    }
    interface User {
      id: string;
      name: string;
      address: Address;
      businessAddresses: Array<WithEmberObject<Address>>;
      [Type]: 'user';
    }
    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          address: {
            street: 'Crowell',
          },
          businessAddresses: [
            {
              street: 'Hunter Mill',
            },
          ],
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');
    assert.strictEqual(user1.address?.street, 'Crowell');
    assert.strictEqual(user1.businessAddresses?.at(0)?.street, 'Hunter Mill');

    // we expect an error since not in schema
    try {
      // @ts-expect-error
      user1.address.get('street');
      assert.ok(false, 'we should fail');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        DEBUG ? 'No field named get on fragment:address' : 'user1.address.get is not a function'
      );
    }

    // we should not error since in the schema, nor should we have a type error
    assert.strictEqual(user1.businessAddresses?.at(0)?.get('street'), 'Hunter Mill', 'get works');
  });

  test('We can add ember-object extension to a schema-object via an object-schema', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberObjectExtension);
    store.schema.registerResources([
      {
        type: 'fragment:address',
        identity: null,
        fields: [
          {
            kind: 'field',
            name: 'street',
          },
        ],
        objectExtensions: ['ember-object'],
      },
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'field',
            name: 'name',
          },
          {
            kind: 'schema-object',
            name: 'address',
            type: 'fragment:address',
          },
        ],
      }),
    ]);
    interface Address {
      street: string;
    }
    interface User {
      id: string;
      name: string;
      address: WithEmberObject<Address>;
      [Type]: 'user';
    }
    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          address: {
            street: 'Crowell',
          },
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');

    // we should not error since in the schema, nor should we have a type error
    assert.strictEqual(user1.address.get('street'), 'Crowell', 'get works');
  });

  test('We can add ember-object extension to a resource via a legacy-resource-schema', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberObjectExtension);
    store.schema.registerResources([
      {
        type: 'fragment:address',
        identity: null,
        fields: [
          {
            kind: 'field',
            name: 'street',
          },
        ],
      },
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'field',
            name: 'name',
          },
          {
            kind: 'schema-object',
            name: 'address',
            type: 'fragment:address',
          },
        ],
        objectExtensions: ['ember-object'],
      }),
    ]);
    interface Address {
      street: string;
    }
    type User = WithEmberObject<{
      id: string;
      name: string;
      address: Address;
      [Type]: 'user';
    }>;
    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          address: {
            street: 'Crowell',
          },
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');

    // we should not error since in the schema, nor should we have a type error
    assert.strictEqual(user1.get('address').street, 'Crowell', 'get works');
  });
});
