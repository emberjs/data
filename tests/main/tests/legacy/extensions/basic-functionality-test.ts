import { module, test } from 'qunit';

import JSONAPICache from '@ember-data/json-api';
import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import { instantiateRecord, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import type { Type } from '@warp-drive/core-types/symbols';
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
  test('We can combine extensions on schema-object from both field and object-schema sources', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
      kind: 'object',
      name: 'do-thing-1',
      features: {
        doThingOne(this: { street: string }) {
          return `do-thing-1:${this.street}`;
        },
        doThingTwo(this: { street: string }) {
          return `do-thing-1:${this.street}`;
        },
      },
    });
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
      kind: 'object',
      name: 'do-thing-2',
      features: {
        doThingTwo(this: { street: string }) {
          return `do-thing-2:${this.street}`;
        },
      },
    });

    type WithMethods<T> = T & {
      doThingOne(): string;
      doThingTwo(): string;
    };

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
        objectExtensions: ['do-thing-1'],
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
              objectExtensions: ['do-thing-2'],
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
      address: WithMethods<Address>;
      businessAddress: WithMethods<Address>;
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

    // we should not error since in the schema, nor should we have a type error
    assert.strictEqual(user1.address.doThingOne(), 'do-thing-1:Crowell', 'object-schema extension works');
    assert.strictEqual(user1.address.doThingTwo(), 'do-thing-1:Crowell', 'object-schema extension works');
    assert.strictEqual(user1.businessAddress.doThingOne(), 'do-thing-1:Hunter Mill', 'object-schema extension works');
    assert.strictEqual(
      user1.businessAddress.doThingTwo(),
      'do-thing-2:Hunter Mill',
      'field extension overrides object-schema extension'
    );
  });
});
