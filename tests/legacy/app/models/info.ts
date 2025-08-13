import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';
import type { Type } from '@warp-drive/core-types/symbols';
import type { WithArrayLike } from '@warp-drive/legacy/compat/extensions';

import type { WithFragment } from '#src/index.ts';
import { withArrayDefaults } from '#src/utilities/with-array-defaults.ts';

export const InfoSchema = {
  type: 'fragment:info',
  identity: null,
  fields: [{ kind: 'field', name: 'name' }, withArrayDefaults('notes')],
  objectExtensions: ['ember-object', 'fragment'],
} satisfies ObjectSchema;

export type Info = WithFragment<{
  id: null;
  name: string;
  notes: WithArrayLike<unknown>;
  [Type]: 'fragment:info';
}>;
