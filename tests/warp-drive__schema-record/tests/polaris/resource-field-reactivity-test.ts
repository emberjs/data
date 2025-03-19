import { module, skip as test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { Document } from '@ember-data/store';
import { Type } from '@warp-drive/core-types/symbols';
import type { SchemaRecord } from '@warp-drive/schema-record';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  bestFriend: Document<User | null>;
}

module('Reactivity | resource', function (hooks) {
  setupTest(hooks);

  test('we can use simple fields with no `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;

    function concat(
      record: SchemaRecord & { [key: string]: unknown },
      options: Record<string, unknown> | null,
      _prop: string
    ): string {
      if (!options) throw new Error(`options is required`);
      const opts = options as { fields: string[]; separator?: string };
      return opts.fields.map((field) => record[field]).join(opts.separator ?? '');
    }
    concat[Type] = 'concat';

    registerDerivations(schema);
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
            // @ts-expect-error we've left this type off on purpose
            // since the functionality is incomplete
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

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend.data?.id, '2', 'bestFriend.id is accessible');
    assert.strictEqual(record.bestFriend.data?.$type, 'user', 'bestFriend.user is accessible');
    assert.strictEqual(record.bestFriend.data?.name, 'Rey', 'bestFriend.name is accessible');
  });
});
