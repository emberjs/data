import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';
import { Type } from '@warp-drive/core-types/symbols';
import type { Transformation } from '@warp-drive/schema-record/schema';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record/schema';

import type Store from 'warp-drive__schema-record/services/store';

interface User {
  id: string;
  $type: 'user';
  name: string;
  favoriteNumbers: string[] | null;
  [Type]: 'user';
}
interface CreateUserType {
  id: string | null;
  $type: 'user';
  name: string | null;
  favoriteNumbers: string[] | null;
  [Type]: 'user';
}

module('Writes | array fields', function (hooks) {
  setupTest(hooks);

  test('we can update to a new array', function (assert) {
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

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    const favoriteNumbers = record.favoriteNumbers;
    record.favoriteNumbers = ['3', '4'];
    assert.deepEqual(record.favoriteNumbers.slice(), ['3', '4'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier)!;

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      ['3', '4'],
      'the cache values are correctly updated'
    );
  });

  test('we can update to null', function (assert) {
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

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    record.favoriteNumbers = null;
    assert.strictEqual(record.favoriteNumbers, null, 'The array is correctly set to null');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      undefined,
      'the cache values are correctly updated'
    );
    record.favoriteNumbers = ['3', '4'];
    assert.deepEqual(record.favoriteNumbers.slice(), ['3', '4'], 'We have the correct array members');
  });

  test('we can update a single value in the array', function (assert) {
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

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    });

    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    const favoriteNumbers = record.favoriteNumbers;
    record.favoriteNumbers![0] = '3';
    assert.deepEqual(record.favoriteNumbers?.slice(), ['3', '2'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      ['3', '2'],
      'the cache values are correctly updated'
    );
  });

  test('we can push a new value on to the array', function (assert) {
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

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    const favoriteNumbers = record.favoriteNumbers;
    record.favoriteNumbers?.push('3');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2', '3'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      ['1', '2', '3'],
      'the cache values are correctly updated'
    );
  });

  test('we can pop a value off of the array', function (assert) {
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

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    const favoriteNumbers = record.favoriteNumbers;
    const num = record.favoriteNumbers?.pop();
    assert.strictEqual(num, '2', 'the correct value was popped off the array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(cachedResourceData?.attributes?.favoriteNumbers, ['1'], 'the cache values are correctly updated');
  });

  test('we can unshift a value on to the array', function (assert) {
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

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    const favoriteNumbers = record.favoriteNumbers;
    record.favoriteNumbers?.unshift('3');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['3', '1', '2'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      ['3', '1', '2'],
      'the cache values are correctly updated'
    );
  });

  test('we can shift a value off of the array', function (assert) {
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

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    const favoriteNumbers = record.favoriteNumbers;
    const num = record.favoriteNumbers?.shift();
    assert.strictEqual(num, '1', 'the correct value was popped off the array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['2'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(cachedResourceData?.attributes?.favoriteNumbers, ['2'], 'the cache values are correctly updated');
  });

  test('we can assign an array value to another record', function (assert) {
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

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
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
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    const favoriteNumbers = record.favoriteNumbers;
    record2.favoriteNumbers = record.favoriteNumbers;
    assert.deepEqual(record2.favoriteNumbers?.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');
    assert.notStrictEqual(favoriteNumbers, record2.favoriteNumbers, 'This is weird');
    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record2);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      ['1', '2'],
      'the cache values are correctly updated'
    );
  });

  test('we can edit simple array fields with a `type`', function (assert) {
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
    assert.deepEqual(record.favoriteNumbers!.slice(), ['1', '2'], 'We have the correct array members');

    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    assert.notStrictEqual(record.favoriteNumbers, sourceArray);

    const favoriteNumbers = record.favoriteNumbers;

    record.favoriteNumbers = ['3', '4'];
    assert.deepEqual(record.favoriteNumbers.slice(), ['3', '4'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      [3, 4],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });

  test('we can edit single values in array fields with a `type`', function (assert) {
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

    const favoriteNumbers = record.favoriteNumbers;

    record.favoriteNumbers![0] = '3';
    assert.deepEqual(record.favoriteNumbers?.slice(), ['3', '2'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      [3, 2],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });

  test('we can push a new value on to array fields with a `type`', function (assert) {
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

    const favoriteNumbers = record.favoriteNumbers;

    record.favoriteNumbers?.push('3');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1', '2', '3'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      [1, 2, 3],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });

  test('we can pop a value off of an array fields with a `type`', function (assert) {
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

    const favoriteNumbers = record.favoriteNumbers;

    const val = record.favoriteNumbers?.pop();
    assert.strictEqual(val, '2', 'the correct value was popped off the array');
    assert.deepEqual(record.favoriteNumbers?.slice(), ['1'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData?.attributes?.favoriteNumbers,
      [1],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });
});
