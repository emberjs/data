import type {
  CollectionResourceRelationship,
  Links,
  Meta,
  PaginationLinks,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { computeLocalState } from '../-diff';
import type { UpgradedMeta } from '../-edge-definition';
import type { RelationshipState } from '../-state';
import { createState } from '../-state';

export interface CollectionRelationship {
  definition: UpgradedMeta;
  identifier: StableRecordIdentifier;
  state: RelationshipState;

  remoteMembers: Set<StableRecordIdentifier>;
  additions: Set<StableRecordIdentifier> | null;
  removals: Set<StableRecordIdentifier> | null;
  _diff?: {
    add: Set<StableRecordIdentifier>;
    del: Set<StableRecordIdentifier>;
  };
  remoteState: StableRecordIdentifier[];
  isDirty: boolean;

  localState: StableRecordIdentifier[] | null;

  meta: Meta | null;
  links: Links | PaginationLinks | null;
  transactionRef: number;
}

export function createCollectionRelationship(
  definition: UpgradedMeta,
  identifier: StableRecordIdentifier
): CollectionRelationship {
  return {
    definition,
    identifier,
    state: createState(),
    remoteState: [],
    remoteMembers: new Set(),
    additions: null,
    removals: null,

    localState: null,
    isDirty: true,

    meta: null,
    links: null,
    transactionRef: 0,
  };
}

export function legacyGetCollectionRelationshipData(source: CollectionRelationship): CollectionResourceRelationship {
  let payload: CollectionResourceRelationship = {};
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
