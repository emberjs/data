import { assert } from '@ember/debug';

import type { StableExistingRecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';

export function assertIdentifierHasId(
  identifier: StableRecordIdentifier
): asserts identifier is StableExistingRecordIdentifier {
  assert(`Attempted to schedule a fetch for a record without an id.`, identifier.id !== null);
}
