import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';
import type { WithEmberObject } from '@warp-drive/legacy/compat/extensions';

import { withFragmentDefaults } from '#src/utilities/with-fragment-defaults.ts';
import type { Name } from './name';

export const PassengerSchema = {
  type: 'fragment:passenger',
  identity: null,
  fields: [withFragmentDefaults('name')],
  objectExtensions: ['ember-object', 'fragment'],
} satisfies ObjectSchema;

export type Passenger = WithEmberObject<{
  id: null;
  name: Name | null;
}>;
