import type { Links, Meta, PaginationLinks, SingleResourceRelationship } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type { UpgradedMeta } from '../-edge-definition';
import type { RelationshipState } from '../-state';
import { createState } from '../-state';

export interface ResourceRelationship {
  definition: UpgradedMeta;
  identifier: StableRecordIdentifier;
  state: RelationshipState;
  localState: StableRecordIdentifier | null;
  remoteState: StableRecordIdentifier | null;
  meta: Meta | null;
  links: Links | PaginationLinks | null;
  transactionRef: number;
}

export function createResourceRelationship(
  definition: UpgradedMeta,
  identifier: StableRecordIdentifier
): ResourceRelationship {
  return {
    definition,
    identifier,
    state: createState(),
    localState: null,
    remoteState: null,
    meta: null,
    links: null,
    transactionRef: 0,
  };
}

export function legacyGetResourceRelationshipData(source: ResourceRelationship): SingleResourceRelationship {
  let data: StableRecordIdentifier | null | undefined;
  let payload: SingleResourceRelationship = {};
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
