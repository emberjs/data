import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';
import type { Type } from '@warp-drive/core-types/symbols';

import type { WithFragment } from '#src/index.ts';

export const PrefixSchema = {
  type: 'fragment:prefix',
  identity: null,
  fields: [{ kind: 'field', name: 'name' }],
  objectExtensions: ['ember-object', 'fragment'],
} satisfies ObjectSchema;

export type Prefix = WithFragment<{
  id: null;
  name: string;
  [Type]: 'fragment:prefix';
}>;
