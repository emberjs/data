import { assert } from '@warp-drive/build-config/macros';
import type { ExistingResourceCacheKey } from '@warp-drive/core-types/identifier';

export function assertIdentifierHasId(identifier: unknown): asserts identifier is ExistingResourceCacheKey {
  assert(
    `Attempted to schedule a fetch for a record without an id.`,
    identifier && (identifier as ExistingResourceCacheKey).id !== null
  );
}
