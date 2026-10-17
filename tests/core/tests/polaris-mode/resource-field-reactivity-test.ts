import { useRecommendedStore } from '@warp-drive/core';
import type { ReactiveDocument, ReactiveResource } from '@warp-drive/core/reactive';
import { withDefaults } from '@warp-drive/core/reactive';
import { Type } from '@warp-drive/core/types/symbols';
import { module, setupTest, skip as test } from '@warp-drive/diagnostic/ember';
import { JSONAPICache } from '@warp-drive/json-api';

const Store = useRecommendedStore({
  cache: JSONAPICache,
});
interface User {
  id: string | null;
  $type: 'user';
  name: string;
  bestFriend: ReactiveDocument<User | null>;
}

module('Reactivity | resource', function (hooks) {
  setupTest(hooks);

  test('we can use simple fields with no `type`', function (assert) {
    const store = new Store();
    const { schema } = store;

    function concat(
      record: ReactiveResource & { [key: string]: unknown },
      options: Record<string, unknown> | null,
      _prop: string
    ): string {
      if (!options) throw new Error(`options is required`);
      const opts = options as { fields: string[]; separator?: string };
      return opts.fields.map((field) => record[field]).join(opts.separator ?? '');
    }
    concat[Type] = 'concat';

    schema.registerDerivation(concat);
    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
          {
            name: 'bestFriend',
            type: 'user',
            kind: 'resource',
            options: { inverse: 'bestFriend', async: true },
          },
        ],
      })
    );

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          bestFriend: {
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey',
          },
          relationships: {
            bestFriend: {
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    }) as User;

    assert.equal(record.id, '1', 'id is accessible');
    assert.equal(record.$type, 'user', '$type is accessible');
    assert.equal(record.name, 'Chris', 'name is accessible');
    assert.equal(record.bestFriend.data?.id, '2', 'bestFriend.id is accessible');
    assert.equal(record.bestFriend.data?.$type, 'user', 'bestFriend.user is accessible');
    assert.equal(record.bestFriend.data?.name, 'Rey', 'bestFriend.name is accessible');
  });
});
