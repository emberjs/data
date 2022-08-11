import type {
  BelongsToRelationship,
  ManyRelationship,
  Relationship as ImplicitRelationship,
} from '@ember-data/record-data/-private';
import { graphFor } from '@ember-data/record-data/-private';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordDataStoreWrapper } from '@ember-data/types/q/record-data-store-wrapper';
import type { ConfidentDict as RelationshipDict } from '@ember-data/types/q/utils';

export function getRelationshipStateForRecord(
  record: { store: Store },
  propertyName: string
): BelongsToRelationship | ManyRelationship | ImplicitRelationship {
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
  storeWrapper: RecordDataStoreWrapper,
  identifier: StableRecordIdentifier
): RelationshipDict<ImplicitRelationship> {
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
