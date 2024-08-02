import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { CollectionRelationship } from '@warp-drive/core-types/cache/relationship';
import type { Links, Meta, PaginationLinks } from '@warp-drive/core-types/spec/json-api-raw';

import { computeLocalState } from '../-diff';
import type { UpgradedMeta } from '../-edge-definition';
import type { RelationshipState } from '../-state';
import { createState } from '../-state';

/**
 * Stores the data for one side of a "hasMany" relationship.
 *
 * @typedoc
 */
export interface LegacyHasManyEdge {
  definition: UpgradedMeta & { kind: 'hasMany' };
  identifier: StableRecordIdentifier;
  state: RelationshipState;

  remoteMembers: Set<StableRecordIdentifier>;
  remoteState: StableRecordIdentifier[];

  additions: Set<StableRecordIdentifier> | null;
  removals: Set<StableRecordIdentifier> | null;

  meta: Meta | null;
  links: Links | PaginationLinks | null;

  localState: StableRecordIdentifier[] | null;
  isDirty: boolean;
  transactionRef: number;

  _diff?: {
    add: Set<StableRecordIdentifier>;
    del: Set<StableRecordIdentifier>;
  };
}

export function isLegacyHasManyKind(definition: UpgradedMeta): definition is UpgradedMeta & { kind: 'hasMany' } {
  return definition.kind === 'hasMany';
}

export function createLegacyHasManyEdge(
  definition: UpgradedMeta,
  identifier: StableRecordIdentifier
): LegacyHasManyEdge {
  assert(`Expected a hasMany relationship`, isLegacyHasManyKind(definition));
  return {
    definition,
    identifier,
    state: createState(),
    remoteMembers: new Set(),
    remoteState: [],
    additions: null,
    removals: null,

    meta: null,
    links: null,

    localState: null,
    isDirty: true,
    transactionRef: 0,
    _diff: undefined,
  };
}

export function legacyGetCollectionRelationshipData(source: LegacyHasManyEdge): CollectionRelationship {
  const payload: CollectionRelationship = {};

  if (source.state.hasReceivedData) {
    payload.data = computeLocalState(source);
  }

  if (source.links) {
    payload.links = source.links;
  }

  if (source.meta) {
    payload.meta = source.meta;
  }

  return payload;
}
