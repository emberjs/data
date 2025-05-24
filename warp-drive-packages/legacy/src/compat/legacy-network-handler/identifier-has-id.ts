import { assert } from '@warp-drive/build-config/macros';
import type { StableExistingRecordIdentifier } from '@warp-drive/core/types/identifier';

export function assertIdentifierHasId(identifier: unknown): asserts identifier is StableExistingRecordIdentifier {
  assert(
    `Attempted to schedule a fetch for a record without an id.`,
    identifier && (identifier as StableExistingRecordIdentifier).id !== null
  );
}
