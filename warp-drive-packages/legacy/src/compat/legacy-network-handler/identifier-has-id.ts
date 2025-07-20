import { assert } from '@warp-drive/core/build-config/macros';
import type { PersistedResourceKey } from '@warp-drive/core/types/identifier';

export function assertIdentifierHasId(identifier: unknown): asserts identifier is PersistedResourceKey {
  assert(
    `Attempted to schedule a fetch for a record without an id.`,
    identifier && (identifier as PersistedResourceKey).id !== null
  );
}
