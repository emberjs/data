import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { Transform } from '@warp-drive/schema-record/schema';
import { registerDerivations, SchemaService, withFields } from '@warp-drive/schema-record/schema';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  favoriteNumbers: string[];
}

module('Writes | array fields', function (hooks) {
  setupTest(hooks);

  test('we can update to a new array', function (assert) {
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
          name: 'favoriteNumbers',
          type: null,
          kind: 'array',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    const favoriteNumbers = record.favoriteNumbers;
    record.favoriteNumbers = ['3', '4'];
    assert.deepEqual(record.favoriteNumbers.slice(), ['3', '4'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      ['3', '4'],
      'the cache values are correctly updated'
    );
  });

  test('we can update a single value in the array', function (assert) {
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
          name: 'favoriteNumbers',
          type: null,
          kind: 'array',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    }) as User;

    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2'], 'We have the correct array members');
    const favoriteNumbers = record.favoriteNumbers;
    record.favoriteNumbers[0] = '3';
    assert.deepEqual(record.favoriteNumbers.slice(), ['3', '2'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      ['3', '2'],
      'the cache values are correctly updated'
    );
  });

  test('we can push a new value on to the array', function (assert) {
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
          name: 'favoriteNumbers',
          type: null,
          kind: 'array',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    const favoriteNumbers = record.favoriteNumbers;
    record.favoriteNumbers.push('3');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2', '3'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      ['1', '2', '3'],
      'the cache values are correctly updated'
    );
  });

  test('we can pop a value off of the array', function (assert) {
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
          name: 'favoriteNumbers',
          type: null,
          kind: 'array',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine', favoriteNumbers: ['1', '2'] },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    const favoriteNumbers = record.favoriteNumbers;
    const num = record.favoriteNumbers.pop();
    assert.strictEqual(num, '2', 'the correct value was popped off the array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(cachedResourceData.attributes?.favoriteNumbers, ['1'], 'the cache values are correctly updated');
  });

  test('we can edit simple array fields with a `type`', function (assert) {
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
          name: 'favoriteNumbers',
          type: 'string-from-int',
          kind: 'array',
        },
      ]),
    });

    const StringFromIntTransform: Transform<number, string> = {
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
    };

    schema.registerTransform('string-from-int', StringFromIntTransform);

    const sourceArray = ['1', '2'];
    const record = store.createRecord('user', { name: 'Rey Skybarker', favoriteNumbers: sourceArray }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2'], 'We have the correct array members');

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
      cachedResourceData.attributes?.favoriteNumbers,
      [3, 4],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });

  test('we can edit single values in array fields with a `type`', function (assert) {
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
          name: 'favoriteNumbers',
          type: 'string-from-int',
          kind: 'array',
        },
      ]),
    });

    const StringFromIntTransform: Transform<number, string> = {
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
    };

    schema.registerTransform('string-from-int', StringFromIntTransform);

    const sourceArray = ['1', '2'];
    const record = store.createRecord('user', { name: 'Rey Skybarker', favoriteNumbers: sourceArray }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2'], 'We have the correct array members');

    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    assert.notStrictEqual(record.favoriteNumbers, sourceArray);

    const favoriteNumbers = record.favoriteNumbers;

    record.favoriteNumbers[0] = '3';
    assert.deepEqual(record.favoriteNumbers.slice(), ['3', '2'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      [3, 2],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });

  test('we can push a new value on to array fields with a `type`', function (assert) {
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
          name: 'favoriteNumbers',
          type: 'string-from-int',
          kind: 'array',
        },
      ]),
    });

    const StringFromIntTransform: Transform<number, string> = {
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
    };

    schema.registerTransform('string-from-int', StringFromIntTransform);

    const sourceArray = ['1', '2'];
    const record = store.createRecord('user', { name: 'Rey Skybarker', favoriteNumbers: sourceArray }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2'], 'We have the correct array members');

    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    assert.notStrictEqual(record.favoriteNumbers, sourceArray);

    const favoriteNumbers = record.favoriteNumbers;

    record.favoriteNumbers.push('3');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2', '3'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      [1, 2, 3],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });

  test('we can pop a value off of an array fields with a `type`', function (assert) {
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
          name: 'favoriteNumbers',
          type: 'string-from-int',
          kind: 'array',
        },
      ]),
    });

    const StringFromIntTransform: Transform<number, string> = {
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
    };

    schema.registerTransform('string-from-int', StringFromIntTransform);

    const sourceArray = ['1', '2'];
    const record = store.createRecord('user', { name: 'Rey Skybarker', favoriteNumbers: sourceArray }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2'], 'We have the correct array members');

    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    assert.notStrictEqual(record.favoriteNumbers, sourceArray);

    const favoriteNumbers = record.favoriteNumbers;

    const val = record.favoriteNumbers.pop();
    assert.strictEqual(val, '2', 'the correct value was popped off the array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1'], 'We have the correct array members');
    assert.strictEqual(favoriteNumbers, record.favoriteNumbers, 'Array reference does not change');

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.deepEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      [1],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });
});
