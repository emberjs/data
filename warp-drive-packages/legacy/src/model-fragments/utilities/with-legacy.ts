import { withDefaults } from '@warp-drive/legacy/model/migration-support';
import type { LegacyResourceSchema, ResourceSchema } from '@warp-drive/core/types/schema/fields';
import type { WithPartial } from '@warp-drive/core/types/utils';

export function withLegacy(schema: WithPartial<LegacyResourceSchema, 'legacy' | 'identity'>): ResourceSchema {
  return withDefaults({
    ...schema,
    identity: { kind: '@id', name: 'id' },
    objectExtensions: ['ember-object', 'fragment'],
  });
}
