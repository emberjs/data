import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';
import type { Type } from '@warp-drive/core-types/symbols';

import type { WithFragment } from '#src/index.ts';

export const ProductSchema = {
  type: 'fragment:product',
  identity: null,
  fields: [
    { kind: 'field', name: 'name' },
    { kind: 'field', name: 'sku' },
    { kind: 'field', name: 'price' },
  ],
  objectExtensions: ['ember-object', 'fragment'],
} satisfies ObjectSchema;

export type Product = WithFragment<{
  id: null;
  name: string;
  sku: string;
  price: string;
  [Type]: 'fragment:product';
}>;
