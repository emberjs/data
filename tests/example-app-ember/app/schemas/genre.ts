import { withDefaults } from '@warp-drive/core/reactive';
import type { Type } from '@warp-drive/core/types/symbols';

export interface Genre {
  [Type]: 'genre';
  name: string;
}

export const GenreSchema = withDefaults({
  type: 'genre',
  fields: [{ name: 'name', kind: 'field' }],
});
