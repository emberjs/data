import { module, test } from 'qunit';

import JSONAPICache from '@ember-data/json-api';
import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import { instantiateRecord, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import type { Type } from '@warp-drive/core-types/symbols';
import { EmberArrayLikeExtension, type WithArrayLike } from '@warp-drive/legacy/compat/extensions';
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

module('Legacy | Extensions | ArrayLike', function () {
  test('We can add array-like behaviors to hasMany', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberArrayLikeExtension);
    store.schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'field',
            name: 'name',
          },
          {
            kind: 'hasMany',
            name: 'friends',
            type: 'user',
            options: {
              async: false,
              inverse: null,
            },
          },
          {
            kind: 'hasMany',
            name: 'enemies',
            type: 'user',
            options: {
              arrayExtensions: ['ember-array-like'],
              async: false,
              inverse: null,
            },
          },
        ],
      })
    );
    interface User {
      id: string;
      name: string;
      friends: User[];
      enemies: WithArrayLike<User>;
      [Type]: 'user';
    }
    const [user1, user2, user3] = store.push<User>({
      data: [
        {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            friends: {
              data: [{ type: 'user', id: '2' }],
            },
            enemies: {
              data: [{ type: 'user', id: '3' }],
            },
          },
        },
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Wes',
          },
        },
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'John',
          },
        },
      ],
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');
    assert.strictEqual(user2.name, 'Wes');
    assert.strictEqual(user3.name, 'John');
    assert.strictEqual(user1.friends.at(0), user2);
    assert.strictEqual(user1.friends.at(-1), user2);
    assert.strictEqual(user1.enemies.at(0), user3);
    assert.strictEqual(user1.enemies.at(-1), user3);

    // we expect an error since not in schema
    try {
      // @ts-expect-error
      user1.friends.toArray();
      assert.ok(false, 'we should fail');
    } catch (e) {
      assert.strictEqual((e as Error).message, 'user1.friends.toArray is not a function');
    }

    // we should not error since in the schema, nor should we have a type error
    assert.deepEqual(user1.enemies.toArray(), [user3], 'toArray is usable');
    assert.strictEqual(user1.enemies.firstObject, user3, 'firstObject is usable');
    assert.strictEqual(user1.enemies.lastObject, user3, 'lastObject is usable');
  });

  test('We can add array-like behaviors to schema-array', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberArrayLikeExtension);
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
            kind: 'schema-array',
            name: 'homes',
            type: 'fragment:address',
          },
          {
            kind: 'schema-array',
            name: 'businesses',
            type: 'fragment:address',
            options: {
              arrayExtensions: ['ember-array-like'],
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
      homes: Address[];
      businesses: WithArrayLike<Address>;
      [Type]: 'user';
    }
    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          homes: [
            {
              street: 'Crowell',
            },
            {
              street: 'Sunset Hills',
            },
          ],
          businesses: [
            {
              street: 'Hunter Mill',
            },
            {
              street: 'Mary Ave.',
            },
          ],
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');
    assert.strictEqual(user1.homes?.at(0)?.street, 'Crowell');
    assert.strictEqual(user1.homes?.at(-1)?.street, 'Sunset Hills');
    assert.strictEqual(user1.businesses?.at(0)?.street, 'Hunter Mill');
    assert.strictEqual(user1.businesses?.at(-1)?.street, 'Mary Ave.');

    const hunterMill = user1.businesses.at(0)!;
    const mary = user1.businesses.at(-1)!;

    // we expect an error since not in schema
    try {
      // @ts-expect-error
      user1.homes.toArray();
      assert.ok(false, 'we should fail');
    } catch (e) {
      assert.strictEqual((e as Error).message, 'user1.homes.toArray is not a function');
    }

    // we should not error since in the schema, nor should we have a type error
    assert.arrayStrictEquals(user1.businesses.toArray(), [hunterMill, mary], 'toArray works');
    assert.strictEqual(user1.businesses.firstObject, hunterMill, 'firstObject is usable');
    assert.strictEqual(user1.businesses.lastObject, mary, 'lastObject is usable');
  });

  test('We can add array-like behaviors to array', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberArrayLikeExtension);
    store.schema.registerResources([
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'field',
            name: 'name',
          },
          {
            kind: 'array',
            name: 'nicknames',
          },
          {
            kind: 'array',
            name: 'skills',
            options: {
              arrayExtensions: ['ember-array-like'],
            },
          },
        ],
      }),
    ]);

    interface User {
      id: string;
      name: string;
      nicknames: string[];
      skills: WithArrayLike<string>;
      [Type]: 'user';
    }
    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          nicknames: ['runspired'],
          skills: ['ultrarunning', 'computering'],
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');
    assert.strictEqual(user1.nicknames?.at(0), 'runspired');
    assert.strictEqual(user1.skills?.at(0), 'ultrarunning');
    assert.strictEqual(user1.skills?.at(-1), 'computering');

    // we expect an error since not in schema
    try {
      // @ts-expect-error
      user1.nicknames.toArray();
      assert.ok(false, 'we should fail');
    } catch (e) {
      assert.strictEqual((e as Error).message, 'user1.nicknames.toArray is not a function');
    }

    // we should not error since in the schema, nor should we have a type error
    assert.arrayStrictEquals(user1.skills.toArray(), ['ultrarunning', 'computering'], 'toArray works');
    assert.strictEqual(user1.skills.firstObject, 'ultrarunning', 'firstObject is usable');
    assert.strictEqual(user1.skills.lastObject, 'computering', 'lastObject is usable');
  });
});
