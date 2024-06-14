import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';
import { type Type, Type } from '@warp-drive/core-types/symbols';
import type { Transformation } from '@warp-drive/schema-record/schema';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record/schema';

import type Store from 'warp-drive__schema-record/services/store';

interface CreateUserType {
  id: string | null;
  $type: 'user';
  name: string | null;
  favoriteNumbers: string[] | null;
  [Type]: 'user';
}

module('Reads | array fields', function (hooks) {
  setupTest(hooks);

  test('we can use simple array fields with no `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
          {
            name: 'favoriteNumbers',
            kind: 'array',
          },
        ],
      })
    );

    const sourceArray = ['1', '2'];
    const record = store.createRecord<CreateUserType>('user', { name: 'Rey Skybarker', favoriteNumbers: sourceArray });

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    assert.notStrictEqual(record.favoriteNumbers, sourceArray);

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.notStrictEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      sourceArray,
      'with no transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      ['1', '2'],
      'the cache values are correct for the array field'
    );
  });

  test('we can use simple array fields with a `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
          {
            name: 'favoriteNumbers',
            type: 'string-from-int',
            kind: 'array',
          },
        ],
      })
    );

    const StringFromIntTransform: Transformation<number, string> = {
      serialize(value: string, options, _record): number {
        return parseInt(value);
      },
      hydrate(value: number, _options, _record): string {
        return value.toString();
      },
      defaultValue(_options, _identifier) {
        assert.ok(false, 'unexpected defaultValue');
        throw new Error('unexpected defaultValue');
      },
      [Type]: 'string-from-int',
    };

    schema.registerTransformation(StringFromIntTransform);

    const sourceArray = ['1', '2'];
    const record = store.createRecord<CreateUserType>('user', { name: 'Rey Skybarker', favoriteNumbers: sourceArray });

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    assert.notStrictEqual(record.favoriteNumbers, sourceArray);

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.notStrictEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      sourceArray,
      'with no transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      [1, 2],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });
});
