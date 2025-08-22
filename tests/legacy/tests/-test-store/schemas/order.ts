import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';
import type { Type } from '@warp-drive/core-types/symbols';
import type { WithFragment, WithFragmentArray } from '@warp-drive/legacy/model-fragments';
import { withFragmentArrayDefaults, withFragmentDefaults } from '@warp-drive/legacy/model-fragments';

import type { Product } from './product';

export const OrderSchema = {
  type: 'fragment:order',
  identity: null,
  fields: [
    { kind: 'field', name: 'amount' },
    { kind: 'field', name: 'recurring' },
    withFragmentArrayDefaults('product', 'products'),
    withFragmentDefaults('product'),
  ],
  objectExtensions: ['ember-object', 'fragment'],
} satisfies ObjectSchema;

export type Order = WithFragment<{
  id: null;
  amount: string;
  recurring: boolean;
  products: WithFragmentArray<Product>;
  product: Product;
  [Type]: 'fragment:order';
}>;
