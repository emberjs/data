import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { ResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { Links, Meta } from '@warp-drive/core-types/spec/json-api-raw';

import type { UpgradedMeta } from '../-edge-definition';
import type { RelationshipState } from '../-state';
import { createState } from '../-state';

/**
 * Stores the data for one side of a "single" resource relationship.
 *
 * @typedoc
 */
export interface LegacyBelongsToEdge {
  definition: UpgradedMeta & { kind: 'belongsTo' };
  identifier: StableRecordIdentifier;
  state: RelationshipState;
  localState: StableRecordIdentifier | null;
  remoteState: StableRecordIdentifier | null;
  meta: Meta | null;
  links: Links | null;
  transactionRef: number;
}

export function isLegacyBelongsToKind(definition: UpgradedMeta): definition is UpgradedMeta & { kind: 'belongsTo' } {
  return definition.kind === 'belongsTo';
}

export function createLegacyBelongsToEdge(
  definition: UpgradedMeta,
  identifier: StableRecordIdentifier
): LegacyBelongsToEdge {
  assert(`Expected a belongsTo relationship`, isLegacyBelongsToKind(definition));
  return {
    definition,
    identifier,
    state: createState(),
    transactionRef: 0,
    localState: null,
    remoteState: null,
    meta: null,
    links: null,
  };
}

export function getLegacyBelongsToRelationshipData(source: LegacyBelongsToEdge): ResourceRelationship {
  let data: StableRecordIdentifier | null | undefined;
  const payload: ResourceRelationship = {};
  if (source.localState) {
    data = source.localState;
  }
  if (source.localState === null && source.state.hasReceivedData) {
    data = null;
  }
  if (source.links) {
    payload.links = source.links;
  }
  if (data !== undefined) {
    payload.data = data;
  }
  if (source.meta) {
    payload.meta = source.meta;
  }

  return payload;
}
