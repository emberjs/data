import type { GraphEdge, ImplicitEdge } from '@ember-data/graph/-private';
import { graphFor } from '@ember-data/graph/-private';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { ResourceKey } from '@warp-drive/core-types';

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
  identifier: ResourceKey
): { [key: string]: ImplicitEdge } {
  const rels = graphFor(storeWrapper).identifiers.get(identifier);
  if (!rels) {
    throw new Error(`Expected at least one relationship to be populated`);
  }
  const implicits = Object.create(null);
  Object.keys(rels).forEach((key) => {
    const rel = rels[key];
    if (rel.definition.isImplicit) {
      implicits[key] = rel;
    }
  });
  return implicits;
}
