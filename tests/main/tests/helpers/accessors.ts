import type { StableRecordIdentifier } from '@warp-drive/core-types';

import { graphFor } from '@ember-data/graph/-private';
import type { ImplicitEdge } from '@ember-data/graph/-private/edges/implicit';
import type { GraphEdge } from '@ember-data/graph/-private/graph';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/-types/q/cache-store-wrapper';

export function getRelationshipStateForRecord(record: { store: Store }, propertyName: string): GraphEdge {
  const identifier = recordIdentifierFor(record);
  return graphFor(record.store).get(identifier, propertyName);
}

export function hasRelationshipForRecord(
  record: {
    store: Store;
  },
  propertyName: string
): boolean {
  const identifier = recordIdentifierFor(record);
  const relationships = graphFor(record.store).identifiers.get(identifier);
  return relationships ? propertyName in relationships : false;
}

export function implicitRelationshipsFor(
  storeWrapper: CacheCapabilitiesManager,
  identifier: StableRecordIdentifier
): { [key: string]: ImplicitEdge } {
  const rels = graphFor(storeWrapper).identifiers.get(identifier);
  if (!rels) {
    throw new Error(`Expected at least one relationship to be populated`);
  }
  let implicits = Object.create(null);
  Object.keys(rels).forEach((key) => {
    let rel = rels[key]!;
    if (rel.definition.isImplicit) {
      implicits[key] = rel;
    }
  });
  return implicits;
}
