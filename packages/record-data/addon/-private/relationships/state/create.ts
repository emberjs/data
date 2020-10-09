import { upgradeForInternal } from '@ember-data/store/-private';

import BelongsToRelationship from './belongs-to';
import ManyRelationship from './has-many';

type CoreStore = import('@ember-data/store/-private/system/core-store').default;
type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type RelationshipSchema = import('@ember-data/store/-private/ts-interfaces/record-data-schemas').RelationshipSchema;
type RelationshipRecordData = import('../../ts-interfaces/relationship-record-data').RelationshipRecordData;

function createRelationshipFor(
  relationshipMeta: RelationshipSchema,
  store: CoreStore,
  recordData: RelationshipRecordData,
  key: string
) {
  let inverseKey = recordData.storeWrapper.inverseForRelationship(recordData.modelName, key);
  let inverseIsAsync = recordData.storeWrapper.inverseIsAsyncForRelationship(recordData.modelName, key);

  if (relationshipMeta.kind === 'hasMany') {
    return new ManyRelationship(store, inverseKey, relationshipMeta, recordData, inverseIsAsync);
  } else {
    return new BelongsToRelationship(store, inverseKey, relationshipMeta, recordData, inverseIsAsync);
  }
}

export default class Relationships {
  _store: CoreStore;
  _storeWrapper: RecordDataStoreWrapper;
  initializedRelationships: {
    [key: string]: BelongsToRelationship | ManyRelationship;
  };
  constructor(public recordData: RelationshipRecordData) {
    this.initializedRelationships = Object.create(null);
    this._storeWrapper = upgradeForInternal(recordData.storeWrapper);
    this._store = this._storeWrapper._store;
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
      let recordData = this.recordData;
      let rel = this.recordData.storeWrapper.relationshipsDefinitionFor(this.recordData.modelName)[key];

      if (rel) {
        // lazily instantiate relationship
        relationship = relationships[key] = createRelationshipFor(rel, this._store, recordData, key);
      }
    }

    return relationship;
  }
}
