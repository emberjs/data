import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';
import type { Type } from '@warp-drive/core-types/symbols';

import type { WithFragment } from '#src/index.ts';
import { withFragmentArrayDefaults } from '#src/utilities/with-fragment-array-defaults.ts';
import type { Prefix } from './prefix';

export const NameSchema = {
  type: 'fragment:name',
  identity: null,
  fields: [
    { kind: 'field', name: 'first' },
    { kind: 'field', name: 'last' },
    withFragmentArrayDefaults('prefixes'),
  ],
  objectExtensions: ['ember-object', 'fragment'],
} satisfies ObjectSchema;

export type Name = WithFragment<{
  id: null;
  first: string;
  last: string;
  prefixes: Array<Prefix>;
  [Type]: 'fragment:name';
}>;
