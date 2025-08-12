import { type WithLegacy } from '@ember-data/model/migration-support';
import type { Type } from '@warp-drive/core-types/symbols';
import type { WithEmberObject } from '@warp-drive/legacy/compat/extensions';

import type { WithFragmentArray } from '#src/index.ts';
import { withFragmentArrayDefaults } from '#src/utilities/with-fragment-array-defaults.ts';
import { withFragmentDefaults } from '#src/utilities/with-fragment-defaults.ts';
import { withLegacy } from '#src/utilities/with-legacy.ts';
import type { Info } from './info.ts';
import type { Order } from './order.ts';

export const UserSchema = withLegacy({
  type: 'user',
  fields: [
    withFragmentDefaults('info'),
    withFragmentArrayDefaults('order', 'orders'),
  ],
});

export type User = WithLegacy<
  WithEmberObject<{
    id: string;
    info: Info | null;
    orders: WithFragmentArray<Order> | null;
    [Type]: 'user';
  }>
>;
