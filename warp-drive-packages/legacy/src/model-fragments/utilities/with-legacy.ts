import { withDefaults } from '@ember-data/model/migration-support';
import type { LegacyResourceSchema } from '@warp-drive/core-types/schema/fields';
import type { WithPartial } from '@warp-drive/core-types/utils';

export function withLegacy(
  schema: WithPartial<LegacyResourceSchema, 'legacy' | 'identity'>
) {
  return withDefaults({
    ...schema,
    identity: { kind: '@id', name: 'id' },
    objectExtensions: ['ember-object', 'fragment'],
  });
}
