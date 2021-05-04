import { graphFor } from '@ember-data/record-data/-private';
import { recordIdentifierFor } from '@ember-data/store';

type CoreStore = import('@ember-data/store/-private/system/core-store').default;
type BelongsToRelationship = import('@ember-data/record-data/-private').BelongsToRelationship;
type ManyRelationship = import('@ember-data/record-data/-private').ManyRelationship;
type ImplicitRelationship = import('@ember-data/record-data/-private').Relationship;
type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type RelationshipDict = import('@ember-data/store/-private/ts-interfaces/utils').ConfidentDict<ImplicitRelationship>;

export function getRelationshipStateForRecord(
  record: { store: CoreStore },
  propertyName: string
): BelongsToRelationship | ManyRelationship | ImplicitRelationship {
  const identifier = recordIdentifierFor(record);
  return graphFor(record.store._storeWrapper).get(identifier, propertyName);
}

export function hasRelationshipForRecord(
  record: {
    store: CoreStore;
  },
  propertyName: string
): boolean {
  const identifier = recordIdentifierFor(record);
  const relationships = graphFor(record.store._storeWrapper).identifiers.get(identifier);
  return relationships ? propertyName in relationships : false;
}

export function implicitRelationshipsFor(
  storeWrapper: RecordDataStoreWrapper,
  identifier: StableRecordIdentifier
): RelationshipDict {
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
