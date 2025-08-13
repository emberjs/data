import { type LegacyTrait } from '@warp-drive/core-types/schema/fields';

export const AnimalTrait: LegacyTrait = {
  name: 'animal',
  fields: [{ kind: 'field', name: 'name' }],
  mode: 'legacy',
};
