import type { ResourceCacheKey } from '@warp-drive/core-types';
import type { ResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { Links, Meta, PaginationLinks } from '@warp-drive/core-types/spec/json-api-raw';

import type { UpgradedMeta } from '../-edge-definition';
import type { RelationshipState } from '../-state';
import { createState } from '../-state';

/*
 * @module @ember-data/graph
 *
 * Stores the data for one side of a "single" resource relationship.
 *
 * @class ResourceEdge
 * @internal
 */
export interface ResourceEdge {
  definition: UpgradedMeta;
  identifier: ResourceCacheKey;
  state: RelationshipState;
  localState: ResourceCacheKey | null;
  remoteState: ResourceCacheKey | null;
  meta: Meta | null;
  links: Links | PaginationLinks | null;
  transactionRef: number;
  accessed: boolean;
}

export function createResourceEdge(definition: UpgradedMeta, identifier: ResourceCacheKey): ResourceEdge {
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
  let data: ResourceCacheKey | null | undefined;
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
