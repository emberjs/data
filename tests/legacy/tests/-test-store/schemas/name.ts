import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';
import type { Type } from '@warp-drive/core-types/symbols';
import type { WithFragment } from '@warp-drive/legacy/model-fragments';
import { withFragmentArrayDefaults } from '@warp-drive/legacy/model-fragments';

import type { Prefix } from './prefix';

export const NameSchema = {
  type: 'fragment:name',
  identity: null,
  fields: [{ kind: 'field', name: 'first' }, { kind: 'field', name: 'last' }, withFragmentArrayDefaults('prefixes')],
  objectExtensions: ['ember-object', 'fragment'],
} satisfies ObjectSchema;

export type Name = WithFragment<{
  id: null;
  first: string;
  last: string;
  prefixes: Array<Prefix>;
  [Type]: 'fragment:name';
}>;
