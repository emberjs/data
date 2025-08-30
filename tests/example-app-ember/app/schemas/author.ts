import { withDefaults } from '@warp-drive/core/reactive';
import type { Type } from '@warp-drive/core/types/symbols';

export interface Author {
  [Type]: 'author';
  name: string;
}

export const AuthorSchema = withDefaults({
  type: 'author',
  fields: [{ name: 'name', kind: 'field' }],
});
