import type { LegacyResourceSchema, ResourceSchema } from '@warp-drive/core/types/schema/fields';
import type { WithPartial } from '@warp-drive/core/types/utils';

import { withDefaults } from '../../model/migration-support';

export function withLegacy(schema: WithPartial<LegacyResourceSchema, 'legacy' | 'identity'>): ResourceSchema {
  return withDefaults({
    ...schema,
    identity: { kind: '@id', name: 'id' },
    objectExtensions: ['ember-object', 'fragment'],
  });
}
