import { SchemaRecord } from '@warp-drive/schema-record/record';
import { SchemaService } from '@warp-drive/schema-record/schema';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { Document } from '@ember-data/store/-private/document';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  bestFriend: Document<User | null>;
}

module('Reads | resource', function (hooks) {
  setupTest(hooks);

  test('we can use simple fields with no `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);

    function concat(
      record: SchemaRecord & { [key: string]: unknown },
      options: Record<string, unknown> | null,
      _prop: string
    ): string {
      if (!options) throw new Error(`options is required`);
      const opts = options as { fields: string[]; separator?: string };
      return opts.fields.map((field) => record[field]).join(opts.separator ?? '');
    }

    schema.registerDerivation('concat', concat);

    schema.defineSchema('user', [
      {
        name: 'name',
        type: null,
        kind: 'attribute',
      },
      {
        name: 'bestFriend',
        type: 'user',
        kind: 'resource',
        options: { inverse: 'bestFriend' },
      },
    ]);

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

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');

    assert.strictEqual(record.name, 'Chris', 'name is accessible');
  });
});
