import { ResourceRelationship } from '@ember-data/store/-types/cache/relationship';
import type { Links, Meta, PaginationLinks } from '@ember-data/store/-types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/store/-types/q/identifier';

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
  identifier: StableRecordIdentifier;
  state: RelationshipState;
  localState: StableRecordIdentifier | null;
  remoteState: StableRecordIdentifier | null;
  meta: Meta | null;
  links: Links | PaginationLinks | null;
  transactionRef: number;
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
  };
}

export function legacyGetResourceRelationshipData(source: ResourceEdge): ResourceRelationship {
  let data: StableRecordIdentifier | null | undefined;
  let payload: ResourceRelationship = {};
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
