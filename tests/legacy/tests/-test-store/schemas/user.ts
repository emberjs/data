import type { Type } from '@warp-drive/core-types/symbols';
import type { WithEmberObject } from '@warp-drive/legacy/compat/extensions';
import type { WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { WithFragmentArray } from '@warp-drive/legacy/model-fragments';
import { withFragmentArrayDefaults, withFragmentDefaults, withLegacy } from '@warp-drive/legacy/model-fragments';

import type { Info } from './info.ts';
import type { Order } from './order.ts';

export const UserSchema = withLegacy({
  type: 'user',
  fields: [withFragmentDefaults('info'), withFragmentArrayDefaults('order', 'orders')],
});

export type User = WithLegacy<
  WithEmberObject<{
    id: string;
    info: Info | null;
    orders: WithFragmentArray<Order> | null;
    [Type]: 'user';
  }>
>;
