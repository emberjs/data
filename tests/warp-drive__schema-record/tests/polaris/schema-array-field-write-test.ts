import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { ResourceObject } from '@warp-drive/core-types/spec/json-api-raw';
import type { Type } from '@warp-drive/core-types/symbols';
import { Checkout, registerDerivations, withDefaults } from '@warp-drive/schema-record';

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
  addresses: Array<address | null> | null;
  [Type]: 'user';
}

type User = Readonly<{
  id: string | null;
  $type: 'user';
  name: string | null;
  addresses: Array<address | null> | null;
  [Type]: 'user';
  [Checkout](): Promise<EditableUser>;
}>;

type EditableUser = {
  readonly id: string | null;
  readonly $type: 'user';
  name: string | null;
  addresses: Array<address | null> | null;
  readonly [Type]: 'user';
};

module('Writes | schema-array fields', function (hooks) {
  setupTest(hooks);

  module('Immutability', function () {
    test('we cannot update to a new array', function (assert) {
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

      const record = store.push<User>({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Rey Skybarker',
            addresses: sourceArray,
          },
        },
      });

      assert.strictEqual(record.id, '1', 'id is accessible');
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
      assert.throws(() => {
        // @ts-expect-error we're testing the immutability of the array
        record.addresses = [
          {
            street: '789 Maple St',
            city: 'Thistown',
            state: 'TX',
            zip: '67890',
          },
          {
            street: '012 Oak St',
            city: 'ThatTown',
            state: 'FL',
            zip: '09876',
          },
        ];
      }, /Error: Cannot set addresses on user because the record is not editable/);

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
    });

    test('we cannot update individual objects in the array to new objects', function (assert) {
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

      const record = store.push<User>({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Rey Skybarker',
            addresses: sourceArray,
          },
        },
      });

      assert.strictEqual(record.id, '1', 'id is accessible');
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
      assert.throws(() => {
        record.addresses![0] = {
          street: '789 Maple St',
          city: 'Thistown',
          state: 'TX',
          zip: '67890',
        };
      }, /Error: Cannot set 0 on addresses because the record is not editable/);

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
    });

    test('we cannot update individual objects in the array to null', function (assert) {
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

      const record = store.push<User>({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Rey Skybarker',
            addresses: sourceArray,
          },
        },
      });
      assert.strictEqual(record.id, '1', 'id is accessible');
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
      assert.throws(() => {
        record.addresses![0] = null;
      }, /Error: Cannot set 0 on addresses because the record is not editable/);

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
    });

    test('we cannot update individual fields in objects in the array to new values', function (assert) {
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

      const record = store.push<User>({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Rey Skybarker',
            addresses: sourceArray,
          },
        },
      });

      assert.strictEqual(record.id, '1', 'id is accessible');
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
      assert.throws(() => {
        record.addresses![0]!.street = '789 Maple St';
      }, /Error: Cannot set street on address because the record is not editable/);

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
    });
  });
  test('we can update to a new array', function (assert) {
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
    record.addresses = [
      {
        street: '789 Maple St',
        city: 'Thistown',
        state: 'TX',
        zip: '67890',
      },
      {
        street: '012 Oak St',
        city: 'ThatTown',
        state: 'FL',
        zip: '09876',
      },
    ];
    assert.propContains(
      record.addresses?.slice(),
      [
        {
          street: '789 Maple St',
          city: 'Thistown',
          state: 'TX',
          zip: '67890',
        },
        {
          street: '012 Oak St',
          city: 'ThatTown',
          state: 'FL',
          zip: '09876',
        },
      ],
      'We have the correct array members'
    );
    assert.strictEqual(record.addresses, record.addresses, 'We have a stable array reference');
    assert.notStrictEqual(record.addresses, sourceArray);

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek<ResourceObject>(identifier);

    assert.notStrictEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      sourceArray,
      'with no transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.addresses,
      [
        {
          street: '789 Maple St',
          city: 'Thistown',
          state: 'TX',
          zip: '67890',
        },
        {
          street: '012 Oak St',
          city: 'ThatTown',
          state: 'FL',
          zip: '09876',
        },
      ],
      'the cache values are correct for the array field'
    );
  });

  test('we can update individual objects in the array to new objects', function (assert) {
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
    record.addresses![0] = {
      street: '789 Maple St',
      city: 'Thistown',
      state: 'TX',
      zip: '67890',
    };
    assert.propContains(
      record.addresses?.slice(),
      [
        {
          street: '789 Maple St',
          city: 'Thistown',
          state: 'TX',
          zip: '67890',
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
    const cachedResourceData = store.cache.peek<ResourceObject>(identifier);

    assert.notStrictEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      sourceArray,
      'with no transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.addresses,
      [
        {
          street: '789 Maple St',
          city: 'Thistown',
          state: 'TX',
          zip: '67890',
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

  test('we can update individual fields in objects in the array to new values', function (assert) {
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
    record.addresses![0]!.street = '789 Maple St';

    assert.propContains(
      record.addresses?.slice(),
      [
        {
          street: '789 Maple St',
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
    const cachedResourceData = store.cache.peek<ResourceObject>(identifier);

    assert.notStrictEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      sourceArray,
      'with no transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.addresses,
      [
        {
          street: '789 Maple St',
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
