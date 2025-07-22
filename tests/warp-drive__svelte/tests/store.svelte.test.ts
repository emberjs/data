import { assert, expect, test } from 'vitest';

import { Type } from '@warp-drive/core/types/symbols';
import Store from '../src/store';
import { registerDerivations, withDefaults } from '@warp-drive/core/reactive';

interface User {
  id: string | null;
  $type: 'user';
  firstName: string;
  lastName: string;
  readonly fullName: string;
}

test('we can derive from simple fields', () => {
  const cleanup = $effect.root(() => {
    const store = new Store();
    const { schema } = store;

    function concat(record: any, options: Record<string, unknown> | null, _prop: string): string {
      if (!options) throw new Error(`options is required`);
      const opts = options as { fields: string[]; separator?: string };
      return opts.fields.map((field) => record[field]).join(opts.separator ?? '');
    }
    concat[Type] = 'concat';

    schema.registerDerivation(concat);
    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        identity: { kind: '@id', name: 'id' },
        fields: [
          {
            name: 'firstName',
            kind: 'field',
          },
          {
            name: 'lastName',
            kind: 'field',
          },
          {
            name: 'fullName',
            type: 'concat',
            options: { fields: ['firstName', 'lastName'], separator: ' ' },
            kind: 'derived',
          },
        ],
      })
    );

    const record = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          firstName: 'Rey',
          lastName: 'Pupatine',
        },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.firstName, 'Rey', 'firstName is accessible');
    assert.strictEqual(record.lastName, 'Pupatine', 'lastName is accessible');
    assert.strictEqual(record.fullName, 'Rey Pupatine', 'fullName is accessible');

    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          firstName: 'Rey',
          lastName: 'Skybarker',
        },
      },
    });

    assert.strictEqual(record.firstName, 'Rey', 'firstName is accessible');
    assert.strictEqual(record.lastName, 'Skybarker', 'lastName is accessible');
    assert.strictEqual(record.fullName, 'Rey Skybarker', 'fullName is accessible');
  });

  cleanup();
});
