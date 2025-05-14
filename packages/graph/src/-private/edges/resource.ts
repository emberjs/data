import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { ResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { Links, Meta, PaginationLinks } from '@warp-drive/core-types/spec/json-api-raw';

import type { UpgradedMeta } from '../-edge-definition';
import type { RelationshipState } from '../-state';
import { createState } from '../-state';

/**
 * Stores the data for one side of a "single" resource relationship.
 *
 * @class ResourceEdge
 * @internal
 */
export interface ResourceEdge {
  definition: UpgradedMeta;
  identifier: StableRecordIdentifier;
  state: RelationshipState;
  localState: StableRecordIdentifier | null;
  remoteState: StableRecordIdentifier | null;
  meta: Meta | null;
  links: Links | PaginationLinks | null;
  transactionRef: number;
  accessed: boolean;
}

export function createResourceEdge(definition: UpgradedMeta, identifier: StableRecordIdentifier): ResourceEdge {
  return {
    definition,
    identifier,
    state: createState(),
    transactionRef: 0,
    localState: null,
    remoteState: null,
    meta: null,
    links: null,
    accessed: false,
  };
}

export function legacyGetResourceRelationshipData(source: ResourceEdge, getRemoteState: boolean): ResourceRelationship {
  source.accessed = true;
  let data: StableRecordIdentifier | null | undefined;
  const payload: ResourceRelationship = {};
  if (getRemoteState && source.remoteState) {
    data = source.remoteState;
  } else if (!getRemoteState && source.localState) {
    data = source.localState;
  }
  if (((getRemoteState && source.remoteState === null) || source.localState === null) && source.state.hasReceivedData) {
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
