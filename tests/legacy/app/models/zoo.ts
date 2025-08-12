import { type WithLegacy } from '@ember-data/model/migration-support';
import type { Type } from '@warp-drive/core-types/symbols';
import type { WithEmberObject } from '@warp-drive/legacy/compat/extensions';

import { withFragmentDefaults } from '#src/utilities/with-fragment-defaults.ts';
import { withLegacy } from '#src/utilities/with-legacy.ts';
import type { Person } from './person';

export const ZooSchema = withLegacy({
  type: 'zoo',
  fields: [
    { kind: 'field', name: 'name' },
    { kind: 'field', name: 'city' },
    withFragmentDefaults('animal'),
    {
      kind: 'belongsTo',
      name: 'manager',
      type: 'person',
      options: { async: true, inverse: null },
    },
  ],
});

export type Zoo = WithLegacy<
  WithEmberObject<{
    id: string;
    name: string;
    city: string;
    manager: Person | null;
    [Type]: 'zoo';
  }>
>;
