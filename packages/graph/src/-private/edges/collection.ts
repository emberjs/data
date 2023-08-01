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

export interface CollectionEdge {
  definition: UpgradedMeta;
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

export function createCollectionEdge(definition: UpgradedMeta, identifier: StableRecordIdentifier): CollectionEdge {
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

export function legacyGetCollectionRelationshipData(source: CollectionEdge): CollectionResourceRelationship {
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
