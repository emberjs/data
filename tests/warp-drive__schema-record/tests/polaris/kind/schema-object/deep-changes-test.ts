import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { ReactiveResource } from '@warp-drive/core/reactive';
import type { ObjectValue } from '@warp-drive/core-types/json/raw';
import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';
import { Type } from '@warp-drive/core-types/symbols';
import { Checkout, registerDerivations, withDefaults } from '@warp-drive/schema-record';

interface City {
  name: string;
  nickname: string;
}
const CitySchema = {
  type: 'object:city',
  identity: { kind: '@hash', type: '@hashName', name: null },
  fields: [
    {
      kind: 'field',
      name: 'name',
    },
    {
      kind: 'field',
      name: 'nickname',
    },
  ],
} satisfies ObjectSchema;

function hashName<T extends object>(data: T, options: ObjectValue | null, prop: string | null): string {
  const newData = data as City;
  return newData.name;
}
hashName[Type] = '@hashName' as const;

interface Address {
  street: string;
  city: City;
  state: string;
  zip: string;
}
const AddressSchema = {
  type: 'object:address',
  identity: { kind: '@hash', type: '@hashAddress', name: null },
  fields: [
    {
      kind: 'field',
      name: 'street',
    },
    {
      kind: 'schema-object',
      name: 'city',
      type: 'object:city',
    },
    {
      kind: 'field',
      name: 'zip',
    },
    {
      kind: 'field',
      name: 'state',
    },
  ],
} satisfies ObjectSchema;
function hashAddress<T extends object>(data: T, options: ObjectValue | null, prop: string | null): string {
  const newData = data as Address;
  return newData.street + ' - ' + newData.zip;
}
hashAddress[Type] = '@hashAddress' as const;

interface Park {
  name: string;
  est: number;
  address: Address;
}
const ParkSchema = {
  type: 'object:park',
  identity: { kind: '@hash', type: '@hashName', name: null },
  fields: [
    {
      kind: 'field',
      name: 'name',
    },
    {
      kind: 'field',
      name: 'est',
    },
    {
      kind: 'schema-object',
      name: 'address',
      type: 'object:address',
    },
  ],
} satisfies ObjectSchema;

interface Waypoint {
  lat: number;
  lon: number;
  address: Address | null;
}
const WaypointSchema = {
  type: 'object:waypoint',
  identity: null,
  fields: [
    { kind: 'field', name: 'lat' },
    { kind: 'field', name: 'lon' },
    { kind: 'schema-object', name: 'address', type: 'object:address' },
  ],
} satisfies ObjectSchema;

interface Trail {
  name: string;
  park: Park | null;
  waypoints: Waypoint[];
}
const TrailSchema = {
  type: 'object:trail',
  identity: null,
  fields: [
    { kind: 'field', name: 'name' },
    { kind: 'schema-object', name: 'park', type: 'object:park' },
    { kind: 'schema-array', name: 'waypoints', type: 'object:waypoint', options: { key: '@index' } },
  ],
} as ObjectSchema;

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  // a schema-array of schema-objects with schema-objects with schema objects
  favoriteParks: Park[];
  // a schema-object with a schema-object
  address: Address;
  // a schema-object with a schema-array of schema-objects with schema-objects
  favoriteTrail: Trail;
}
const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { kind: 'field', name: 'name' },
    { kind: 'schema-array', name: 'favoriteParks', type: 'object:park', options: { key: '@hash' } },
    { kind: 'schema-object', name: 'address', type: 'object:address' },
    { kind: 'schema-object', name: 'favoriteTrail', type: 'object:trail' },
  ],
});

function registerUserSchemas(store: Store) {
  store.schema.registerHashFn(hashName);
  store.schema.registerHashFn(hashAddress);
  store.schema.registerResources([CitySchema, ParkSchema, AddressSchema, WaypointSchema, TrailSchema, UserSchema]);
}

module('Kind | schema-object | Reactivity | deep changes', function (hooks) {
  setupRenderingTest(hooks);

  test('We can perform and rollback deep mutations on an embedded path at the leaf', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);
    registerUserSchemas(store);

    const readable = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          address: {
            street: '123 Main St',
            city: { name: 'Anytown', nickname: 'The Regular Place' },
            state: 'NY',
            zip: '12345',
          },
        },
      },
    }) as User & ReactiveResource;
    const user = await readable[Checkout]<User>();
    const identifier = recordIdentifierFor(user);

    assert.strictEqual(user.id, '1', 'id is accessible');
    assert.strictEqual(user.$type, 'user', '$type is accessible');
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'address is accessible'
    );

    const { address } = user;
    const UserCity = address.city;

    // mutate a simple embedded path field at the leaf
    user.address.city.nickname = 'Oaktown';
    assert.strictEqual(UserCity, user.address.city, 'the city instance is still the same');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'Oaktown' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is updated'
    );

    store.cache.rollbackAttrs(identifier);
    assert.strictEqual(UserCity, user.address.city, 'the city instance is still the same');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is restored'
    );

    // mutate an embedded path at the leaf, changing its identity
    user.address.city.name = 'Oakland';
    assert.notStrictEqual(UserCity, user.address.city, 'the city should change identity');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Oakland', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is updated'
    );
    const UpdatedCityInstance = user.address.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(UserCity, user.address.city, 'the city should change identity');
    assert.notStrictEqual(UpdatedCityInstance, user.address.city, 'the city should change identity');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is restored'
    );
    const UpdatedCityInstance2 = user.address.city;

    // mutate an embedded path entirely
    user.address.city = { name: 'Oaktown', nickname: 'The Town' };
    assert.notStrictEqual(UpdatedCityInstance2, user.address.city, 'the city should change identity');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Oaktown', nickname: 'The Town' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is updated'
    );
    const UpdatedCityInstance3 = user.address.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(UpdatedCityInstance2, user.address.city, 'the city should change identity');
    assert.notStrictEqual(UpdatedCityInstance3, user.address.city, 'the city should change identity');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is restored'
    );
  });

  test('We can perform and rollback deep mutations on an embedded path in the middle of the segment', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);
    registerUserSchemas(store);

    const readable = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          favoriteTrail: {
            name: 'French',
            park: {
              name: 'Redwood Regional',
              est: 1939,
              address: {
                street: '9299 Skyline Blvd',
                city: { name: 'Oakland', nickname: 'The Town' },
                state: 'CA',
                zip: '94611',
              },
            },
            waypoints: [],
          },
        },
      },
    }) as User & ReactiveResource;
    const user = await readable[Checkout]<User>();
    const identifier = recordIdentifierFor(user);

    assert.strictEqual(user.id, '1', 'id is accessible');
    assert.strictEqual(user.$type, 'user', '$type is accessible');
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'favoriteTrail is accessible'
    );

    const City1 = user.favoriteTrail.park!.address.city;

    // mutate a simple embedded path field on the mid segment
    user.favoriteTrail.park!.address.state = 'California';
    assert.strictEqual(City1, user.favoriteTrail.park?.address.city, 'the city instance is still the same');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'California',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the mutable favoriteTrail is updated'
    );

    store.cache.rollbackAttrs(identifier);
    assert.strictEqual(City1, user.favoriteTrail.park?.address.city, 'the city instance is still the same');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the mutable favoriteTrail is restored'
    );

    // mutate an embedded path at the middle segment, changing its identity
    user.favoriteTrail.park!.address.street = '12 Evergreen';
    assert.notStrictEqual(City1, user.favoriteTrail.park?.address.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '12 Evergreen',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the mutable favoriteTrail is updated'
    );
    const City2 = user.favoriteTrail.park!.address.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(City1, user.favoriteTrail.park?.address.city, 'the city should change identity');
    assert.notStrictEqual(City2, user.favoriteTrail.park?.address.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the mutable favoriteTrail is restored'
    );
    const City3 = user.favoriteTrail.park!.address.city;

    // mutate an embedded path entirely
    user.favoriteTrail.park!.address = {
      street: '9301 Skyline Blvd',
      city: { name: 'Oakland', nickname: 'The Town' },
      state: 'CA',
      zip: '94611',
    };
    assert.notStrictEqual(City3, user.favoriteTrail.park?.address.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9301 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the mutable favoriteTrail is updated'
    );
    const City4 = user.favoriteTrail.park!.address.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(City3, user.favoriteTrail.park?.address.city, 'the city should change identity');
    assert.notStrictEqual(City4, user.favoriteTrail.park?.address.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'French',
        park: {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        waypoints: [],
      },
      'the mutable favoriteTrail is restored'
    );
  });

  test('We can perform and rollback deep mutations on an embedded path at the root', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);
    registerUserSchemas(store);

    const readable = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          address: {
            street: '123 Main St',
            city: { name: 'Anytown', nickname: 'The Regular Place' },
            state: 'NY',
            zip: '12345',
          },
        },
      },
    }) as User & ReactiveResource;
    const user = await readable[Checkout]<User>();
    const identifier = recordIdentifierFor(user);

    assert.strictEqual(user.id, '1', 'id is accessible');
    assert.strictEqual(user.$type, 'user', '$type is accessible');
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'address is accessible'
    );

    const { address } = user;
    const UserCity = address.city;

    // mutate a simple embedded path field at the root
    user.address.state = 'CA';
    assert.strictEqual(UserCity, user.address.city, 'the city instance is still the same');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'CA',
        zip: '12345',
      },
      'the mutable address is updated'
    );

    store.cache.rollbackAttrs(identifier);
    assert.strictEqual(UserCity, user.address.city, 'the city instance is still the same');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is restored'
    );

    // mutate an embedded path at the root, changing its identity
    user.address.street = '47 Arrowhead';
    assert.notStrictEqual(UserCity, user.address.city, 'the city should change identity');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '47 Arrowhead',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is updated'
    );
    const UpdatedCityInstance = user.address.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(UserCity, user.address.city, 'the city should change identity');
    assert.notStrictEqual(UpdatedCityInstance, user.address.city, 'the city should change identity');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is restored'
    );
    const UpdatedCityInstance2 = user.address.city;

    // mutate an embedded path at the root entirely
    user.address = {
      street: '47 Arrowhead',
      city: { name: 'Anytown', nickname: 'The Regular Place' },
      state: 'CA',
      zip: '94610',
    };
    assert.notStrictEqual(UpdatedCityInstance2, user.address.city, 'the city should change identity');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '47 Arrowhead',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'CA',
        zip: '94610',
      },
      'the mutable address is updated'
    );
    const UpdatedCityInstance3 = user.address.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(UpdatedCityInstance3, user.address.city, 'the city should change identity');
    assert.propEqual(
      readable.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the readable address is unchanged'
    );
    assert.propEqual(
      user.address,
      {
        street: '123 Main St',
        city: { name: 'Anytown', nickname: 'The Regular Place' },
        state: 'NY',
        zip: '12345',
      },
      'the mutable address is restored'
    );
  });

  test('We can perform and rollback deep mutations on an embedded path with an array index in it', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);
    registerUserSchemas(store);

    const readable = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          favoriteTrail: {
            name: 'Side-O',
            park: null,
            waypoints: [
              {
                lat: 0,
                lon: 0,
                address: null,
              },
              {
                lat: 2,
                lon: 2,
                address: {
                  street: 'Grizzly Peak Blvd',
                  city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
                  state: 'CA',
                  zip: '94705',
                },
              },
            ],
          },
        },
      },
    }) as User & ReactiveResource;
    const user = await readable[Checkout]<User>();
    const identifier = recordIdentifierFor(user);

    assert.strictEqual(user.id, '1', 'id is accessible');
    assert.strictEqual(user.$type, 'user', '$type is accessible');
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'favoriteTrail is accessible'
    );

    const City1 = user.favoriteTrail.waypoints[1].address!.city;

    // mutate a simple embedded path field on the mid segment
    user.favoriteTrail.waypoints[1].address!.state = 'California';
    assert.strictEqual(City1, user.favoriteTrail.waypoints[1]?.address?.city, 'the city instance is still the same');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'California',
              zip: '94705',
            },
          },
        ],
      },
      'the mutable favoriteTrail is updated'
    );

    store.cache.rollbackAttrs(identifier);
    assert.strictEqual(City1, user.favoriteTrail.waypoints[1]?.address?.city, 'the city instance is still the same');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the mutable favoriteTrail is restored'
    );

    // mutate an embedded path at the middle segment, changing its identity
    user.favoriteTrail.waypoints[1].address!.street = '12 Evergreen';
    assert.notStrictEqual(City1, user.favoriteTrail.waypoints[1]?.address?.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: '12 Evergreen',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the mutable favoriteTrail is updated'
    );
    const City2 = user.favoriteTrail.waypoints[1].address!.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(City1, user.favoriteTrail.waypoints[1]?.address?.city, 'the city should change identity');
    assert.notStrictEqual(City2, user.favoriteTrail.waypoints[1]?.address?.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the mutable favoriteTrail is restored'
    );
    const City3 = user.favoriteTrail.waypoints[1].address!.city;

    // mutate an embedded path entirely
    user.favoriteTrail.waypoints[1].address = {
      street: '9301 Skyline Blvd',
      city: { name: 'Oakland', nickname: 'The Town' },
      state: 'CA',
      zip: '94611',
    };
    assert.notStrictEqual(City3, user.favoriteTrail.waypoints[1]?.address?.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: '9301 Skyline Blvd',
              city: { name: 'Oakland', nickname: 'The Town' },
              state: 'CA',
              zip: '94611',
            },
          },
        ],
      },
      'the mutable favoriteTrail is updated'
    );
    const City4 = user.favoriteTrail.waypoints[1].address.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(City3, user.favoriteTrail.waypoints[1]?.address?.city, 'the city should change identity');
    assert.notStrictEqual(City4, user.favoriteTrail.waypoints[1]?.address?.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the readable favoriteTrail is unchanged'
    );
    assert.propEqual(
      user.favoriteTrail,
      {
        name: 'Side-O',
        park: null,
        waypoints: [
          {
            lat: 0,
            lon: 0,
            address: null,
          },
          {
            lat: 2,
            lon: 2,
            address: {
              street: 'Grizzly Peak Blvd',
              city: { name: 'Berkeley', nickname: 'Plum Ghetto' },
              state: 'CA',
              zip: '94705',
            },
          },
        ],
      },
      'the mutable favoriteTrail is restored'
    );
  });

  test('We can perform and rollback deep mutations on an embedded path with an array index at its root', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);
    registerUserSchemas(store);

    const readable = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          favoriteParks: [
            {
              name: 'Redwood Regional',
              est: 1939,
              address: {
                street: '9299 Skyline Blvd',
                city: { name: 'Oakland', nickname: 'The Town' },
                state: 'CA',
                zip: '94611',
              },
            },
            {
              name: 'Las Trampas',
              est: 1939,
              address: {
                street: '18012 Bollinger Canyon Rd',
                city: { name: 'San Ramon', nickname: 'Saint Raymond' },
                state: 'CA',
                zip: '94583',
              },
            },
          ],
        },
      },
    }) as User & ReactiveResource;
    const user = await readable[Checkout]<User>();
    const identifier = recordIdentifierFor(user);

    assert.strictEqual(user.id, '1', 'id is accessible');
    assert.strictEqual(user.$type, 'user', '$type is accessible');
    assert.propEqual(
      user.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'favoriteParks is accessible'
    );

    const City1 = user.favoriteParks[1].address.city;

    // mutate a simple embedded path field on the mid segment
    user.favoriteParks[1].address.state = 'California';
    assert.strictEqual(City1, user.favoriteParks[1]?.address?.city, 'the city instance is still the same');
    assert.propEqual(
      readable.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the readable favoriteParks is unchanged'
    );
    assert.propEqual(
      user.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'California',
            zip: '94583',
          },
        },
      ],
      'the mutable favoriteParks is updated'
    );

    store.cache.rollbackAttrs(identifier);
    assert.strictEqual(City1, user.favoriteParks[1]?.address?.city, 'the city instance is still the same');
    assert.propEqual(
      readable.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the readable favoriteParks is unchanged'
    );
    assert.propEqual(
      user.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the mutable favoriteParks is restored'
    );

    // mutate an embedded path at the middle segment, changing its identity
    user.favoriteParks[1].address.street = '12 Evergreen';
    assert.notStrictEqual(City1, user.favoriteParks[1]?.address?.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the readable favoriteParks is unchanged'
    );
    assert.propEqual(
      user.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '12 Evergreen',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the mutable favoriteParks is updated'
    );
    const City2 = user.favoriteParks[1].address.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(City1, user.favoriteParks[1]?.address?.city, 'the city should change identity');
    assert.notStrictEqual(City2, user.favoriteParks[1]?.address?.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the readable favoriteParks is unchanged'
    );
    assert.propEqual(
      user.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the mutable favoriteParks is restored'
    );
    const City3 = user.favoriteParks[1].address.city;

    // mutate an embedded path entirely
    user.favoriteParks[1].address = {
      street: '9301 Skyline Blvd',
      city: { name: 'Oakland', nickname: 'The Town' },
      state: 'CA',
      zip: '94611',
    };
    assert.notStrictEqual(City3, user.favoriteParks[1]?.address?.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the readable favoriteParks is unchanged'
    );
    assert.propEqual(
      user.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '9301 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
      ],
      'the mutable favoriteParks is updated'
    );
    const City4 = user.favoriteParks[1].address.city;

    store.cache.rollbackAttrs(identifier);
    assert.notStrictEqual(City3, user.favoriteParks[1]?.address?.city, 'the city should change identity');
    assert.notStrictEqual(City4, user.favoriteParks[1]?.address?.city, 'the city should change identity');
    assert.propEqual(
      readable.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the readable favoriteParks is unchanged'
    );
    assert.propEqual(
      user.favoriteParks,
      [
        {
          name: 'Redwood Regional',
          est: 1939,
          address: {
            street: '9299 Skyline Blvd',
            city: { name: 'Oakland', nickname: 'The Town' },
            state: 'CA',
            zip: '94611',
          },
        },
        {
          name: 'Las Trampas',
          est: 1939,
          address: {
            street: '18012 Bollinger Canyon Rd',
            city: { name: 'San Ramon', nickname: 'Saint Raymond' },
            state: 'CA',
            zip: '94583',
          },
        },
      ],
      'the mutable favoriteParks is restored'
    );
  });
});
