import { assert } from '@ember/debug';

import type { StableExistingRecordIdentifier } from '@ember-data/store/-types/q/identifier';

export function assertIdentifierHasId(identifier: unknown): asserts identifier is StableExistingRecordIdentifier {
  assert(
    `Attempted to schedule a fetch for a record without an id.`,
    identifier && (identifier as StableExistingRecordIdentifier).id !== null
  );
}
