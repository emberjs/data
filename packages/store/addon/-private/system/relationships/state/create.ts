import ManyRelationship from './has-many';
import BelongsToRelationship from './belongs-to';
import { RelationshipRecordData } from '../../../ts-interfaces/relationship-record-data';
import { RelationshipSchema } from '../../../ts-interfaces/record-data-schemas';
import Store from '../../store';
import RecordDataStoreWrapper from '../../store/record-data-store-wrapper';
import { upgradeForInternal } from '../../ts-upgrade-map';

/**
  @module @ember-data/store
*/

function createRelationshipFor(
  relationshipMeta: RelationshipSchema,
  store: Store,
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
  _store: Store;
  _storeWrapper: RecordDataStoreWrapper;
  initializedRelationships: { [key: string]: BelongsToRelationship | ManyRelationship };
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
        relationship = relationships[key] = createRelationshipFor(rel, this._store, recordData, key);
      }
    }

    return relationship;
  }
}
