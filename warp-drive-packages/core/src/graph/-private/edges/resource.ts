import type { ResourceRelationship } from '../../../types/cache/relationship.ts';
import type { ResourceKey } from '../../../types/identifier.ts';
import type { Links, Meta, PaginationLinks } from '../../../types/spec/json-api-raw.ts';
import type { UpgradedMeta } from '../-edge-definition.ts';
import type { RelationshipState } from '../-state.ts';
import { createState } from '../-state.ts';

/**
 * Stores the data for one side of a "single" resource relationship.
 *
 * @class ResourceEdge
 * @internal
 */
export interface ResourceEdge {
  definition: UpgradedMeta;
  identifier: ResourceKey;
  state: RelationshipState;
  localState: ResourceKey | null;
  remoteState: ResourceKey | null;
  meta: Meta | null;
  links: Links | PaginationLinks | null;
  transactionRef: number;
  accessed: boolean;
}

export function createResourceEdge(definition: UpgradedMeta, identifier: ResourceKey): ResourceEdge {
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
  let data: ResourceKey | null | undefined;
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
