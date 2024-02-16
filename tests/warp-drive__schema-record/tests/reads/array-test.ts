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

module('Reads | array fields', function (hooks) {
  setupTest(hooks);

  test('we can use simple array fields with no `type`', function (assert) {
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

    const sourceArray = ['1', '2'];
    const record = store.createRecord('user', { name: 'Rey Skybarker', favoriteNumbers: sourceArray }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Array.isArray(record.favoriteNumbers), 'we can access favoriteNumber array');
    assert.deepEqual(record.favoriteNumbers.slice(), ['1', '2'], 'We have the correct array members');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    assert.notStrictEqual(record.favoriteNumbers, sourceArray);

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.notStrictEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      sourceArray,
      'with no transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      ['1', '2'],
      'the cache values are correct for the array field'
    );
  });

  test('we can use simple array fields with a `type`', function (assert) {
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
    assert.strictEqual(record.favoriteNumbers.key, 'favoriteNumbers', 'Key is proxied correctly');
    assert.strictEqual(record.favoriteNumbers, record.favoriteNumbers, 'We have a stable array reference');
    assert.notStrictEqual(record.favoriteNumbers, sourceArray);

    // test that the data entered the cache properly
    const identifier = recordIdentifierFor(record);
    const cachedResourceData = store.cache.peek(identifier);

    assert.notStrictEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      sourceArray,
      'with no transform we will still divorce the array reference'
    );
    assert.deepEqual(
      cachedResourceData.attributes?.favoriteNumbers,
      [1, 2],
      'the cache values are correct for the array field'
    );
    assert.deepEqual(sourceArray, ['1', '2'], 'we did not mutate the source array');
  });
});
