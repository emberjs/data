import { withDefaults } from '@warp-drive/core/reactive';

import { registerDerivations } from '@warp-drive/core/reactive';
import { Type } from '@warp-drive/core/types/symbols';
import type Store from '../../store';

export function registerSchema(store: Store) {
  function concat(record: any, options: Record<string, unknown> | null, _prop: string): string {
    if (!options) throw new Error(`options is required`);
    const opts = options as { fields: string[]; separator?: string };
    return opts.fields.map((field) => record[field]).join(opts.separator ?? '');
  }
  concat[Type] = 'concat';

  store.schema.registerDerivation(concat);
  registerDerivations(store.schema);

  store.schema.registerResource(
    withDefaults({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'first_name',
          kind: 'field',
        },
        {
          name: 'last_name',
          kind: 'field',
        },
        {
          name: 'full_name',
          type: 'concat',
          options: { fields: ['first_name', 'last_name'], separator: ' ' },
          kind: 'derived',
        },
      ],
    })
  );
}
