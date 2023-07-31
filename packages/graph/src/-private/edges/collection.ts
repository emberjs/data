import type {
  CollectionResourceRelationship,
  Links,
  Meta,
  PaginationLinks,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type { UpgradedMeta } from '../-edge-definition';
import type { RelationshipState } from '../-state';
import { createState } from '../-state';

export interface CollectionEdge {
  definition: UpgradedMeta;
  identifier: StableRecordIdentifier;
  state: RelationshipState;

  localMembers: Set<StableRecordIdentifier>;
  remoteMembers: Set<StableRecordIdentifier>;

  remoteState: StableRecordIdentifier[];
  localState: StableRecordIdentifier[];

  meta: Meta | null;
  links: Links | PaginationLinks | null;
  transactionRef: number;
}

export function createCollectionEdge(definition: UpgradedMeta, identifier: StableRecordIdentifier): CollectionEdge {
  return {
    definition,
    identifier,
    state: createState(),
    transactionRef: 0,

    localMembers: new Set(),
    remoteMembers: new Set(),

    remoteState: [],
    localState: [],

    meta: null,
    links: null,
  };
}

export function legacyGetCollectionRelationshipData(source: CollectionEdge): CollectionResourceRelationship {
  let payload: CollectionResourceRelationship = {};

  if (source.state.hasReceivedData) {
    payload.data = source.localState.slice();
  }

  if (source.links) {
    payload.links = source.links;
  }

  if (source.meta) {
    payload.meta = source.meta;
  }

  return payload;
}
