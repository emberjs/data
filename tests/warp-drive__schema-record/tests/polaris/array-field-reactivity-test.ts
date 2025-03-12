import { rerender } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

import { reactiveContext } from '../-utils/reactive-context';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  favoriteNumbers: string[];
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
}

module('Reactivity | array fields can receive remote updates', function (hooks) {
  setupRenderingTest(hooks);

  test('we can use simple fields with no `type`', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'favoriteNumbers',
            kind: 'array',
          },
        ],
      })
    );
    const resource = schema.resource({ type: 'user' });
    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { favoriteNumbers: ['1', '2'] },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.deepEqual(record.favoriteNumbers, ['1', '2'], 'favoriteNumbers is accessible');

    const { counters, fieldOrder } = await reactiveContext(record, resource);
    const favoriteNumbersIndex = fieldOrder.indexOf('favoriteNumbers');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.favoriteNumbers, 1, 'favoriteNumbersCount is 1');
    assert
      .dom(`li:nth-child(${favoriteNumbersIndex + 1})`)
      .hasText('favoriteNumbers: 1,2', 'favoriteNumbers is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { favoriteNumbers: ['3', '4'] },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.deepEqual(record.favoriteNumbers, ['3', '4'], 'favoriteNumbers is accessible');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.$type, 1, '$typeCount is 1');
    assert.strictEqual(counters.favoriteNumbers, 2, 'favoriteNumbersCount is 2');

    assert
      .dom(`li:nth-child(${favoriteNumbersIndex + 1})`)
      .hasText('favoriteNumbers: 3,4', 'favoriteNumbers is rendered');
  });
});
