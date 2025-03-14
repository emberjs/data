import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations } from '@warp-drive/schema-record';

interface User {
  id: string;
  $type: 'user';
  name: string;
  [Type]: 'user';
}

module('RecordArray | Iterable Behaviors', function (hooks) {
  setupTest(hooks);

  test('we can use `JSON.stringify` on a RecordArray', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<User>({
      data: [
        {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Wesley Thoburn',
          },
        },
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey Pupatine',
          },
        },
      ],
    });

    try {
      const serialized = JSON.stringify(record);
      assert.true(true, 'JSON.stringify should not throw');

      const value = JSON.parse(serialized) as object;
      assert.deepEqual(
        value,
        [
          {
            id: '1',
            name: 'Wesley Thoburn',
          },
          {
            id: '2',
            name: 'Rey Pupatine',
          },
        ],
        'stringify should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `JSON.stringify should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `[ ...record ]` on a RecordArray', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const records = store.push<User>({
      data: [
        {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Wesley Thoburn',
          },
        },
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey Pupatine',
          },
        },
      ],
    });

    try {
      const value = [...records] as Partial<User>[];
      assert.true(true, 'spread should not throw');
      assert.deepEqual(
        value,
        [records[0], records[1]],
        'spread should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `spread should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `for (const value of record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const records = store.push<User>({
      data: [
        {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Wesley Thoburn',
          },
        },
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey Pupatine',
          },
        },
      ],
    });

    try {
      const value = [] as User[];

      for (const val of records) {
        value.push(val);
      }

      assert.true(true, 'for...of should not throw');
      assert.deepEqual(value, [records[0], records[1]], 'for...of should work');
    } catch (e: unknown) {
      assert.true(false, `for...of should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Array.from(records)` as expected', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const records = store.push<User>({
      data: [
        {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Wesley Thoburn',
          },
        },
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey Pupatine',
          },
        },
      ],
    });

    try {
      const value = Array.from(records);
      assert.true(true, 'Array.from should not throw');
      assert.deepEqual(value, [records[0], records[1]], 'Array.from should work');
    } catch (e: unknown) {
      assert.true(false, `Array.from should not throw: ${(e as Error).message}`);
    }
  });
});
