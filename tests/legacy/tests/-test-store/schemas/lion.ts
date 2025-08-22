import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';

export const LionSchema = {
  type: 'lion',
  identity: null,
  fields: [{ kind: 'field', name: 'hasManes' }],
  // @ts-expect-error TODO: this needs to be fixed in warp-drive
  traits: ['animal'],
} satisfies ObjectSchema;
