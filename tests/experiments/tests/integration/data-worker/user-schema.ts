import type { ResourceSchema } from '@warp-drive/core/types/schema/fields';
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema: ResourceSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'firstName', kind: 'field' },
    { name: 'lastName', kind: 'field' },
  ],
});
