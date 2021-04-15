import { upgradeForInternal } from '@ember-data/store/-private';

import BelongsToRelationship from './belongs-to';
import ManyRelationship from './has-many';

type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type RelationshipSchema = import('@ember-data/store/-private/ts-interfaces/record-data-schemas').RelationshipSchema;
type RelationshipRecordData = import('../../record-data').default;

function createRelationshipFor(
  relationshipMeta: RelationshipSchema,
  storeWrapper: RecordDataStoreWrapper,
  identifier: StableRecordIdentifier,
  key: string,
  recordData: RelationshipRecordData
) {
  let inverseKey = storeWrapper.inverseForRelationship(identifier.type, key);
  let inverseIsAsync = storeWrapper.inverseIsAsyncForRelationship(identifier.type, key);

  if (relationshipMeta.kind === 'hasMany') {
    return new ManyRelationship(storeWrapper._store, inverseKey, relationshipMeta, recordData, inverseIsAsync);
  } else {
    return new BelongsToRelationship(storeWrapper._store, inverseKey, relationshipMeta, recordData, inverseIsAsync);
  }
}

export default class Relationships {
  declare _storeWrapper: RecordDataStoreWrapper;
  declare initializedRelationships: {
    [key: string]: BelongsToRelationship | ManyRelationship;
  };
  declare identifier: StableRecordIdentifier;
  declare recordData: RelationshipRecordData;

  constructor(recordData: RelationshipRecordData) {
    this._storeWrapper = upgradeForInternal(recordData.storeWrapper);
    this.initializedRelationships = Object.create(null);
    this.identifier = recordData.identifier;
    this.recordData = recordData;
  }

  has(key: string) {
    return !!this.initializedRelationships[key];
  }

  forEach(cb) {
    let rels = this.initializedRelationships;
    Object.keys(rels).forEach(name => {
      cb(name, rels[name]);
    });
  }

  get(key: string) {
    let relationships = this.initializedRelationships;
    let relationship = relationships[key];

    if (!relationship) {
      let rel = this._storeWrapper.relationshipsDefinitionFor(this.identifier.type)[key];

      if (rel) {
        // lazily instantiate relationship
        relationship = relationships[key] = createRelationshipFor(
          rel,
          this._storeWrapper,
          this.identifier,
          key,
          this.recordData
        );
      }
    }

    return relationship;
  }
}
