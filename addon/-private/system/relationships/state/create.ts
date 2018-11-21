import ManyRelationship from './has-many';
import BelongsToRelationship from './belongs-to';
import { RelationshipRecordData } from '../../model/record-data';
import { RelationshipSchema } from '../../relationship-meta';

function createRelationshipFor(relationshipMeta: RelationshipSchema, store: any, recordData: RelationshipRecordData, key) {
  let inverseKey = recordData.storeWrapper.inverseForRelationship(recordData.modelName, key);
  let inverseIsAsync = recordData.storeWrapper.inverseIsAsyncForRelationship(
    recordData.modelName,
    key
  );

  if (relationshipMeta.kind === 'hasMany') {
    return new ManyRelationship(store, inverseKey, relationshipMeta, recordData, inverseIsAsync);
  } else {
    return new BelongsToRelationship(
      store,
      inverseKey,
      relationshipMeta,
      recordData,
      inverseIsAsync
    );
  }
}

export default class Relationships {
  recordData: RelationshipRecordData
  initializedRelationships: {[key: string]: BelongsToRelationship | ManyRelationship}
  constructor(recordData) {
    this.recordData = recordData;
    this.initializedRelationships = Object.create(null);
  }

  has(key) {
    return !!this.initializedRelationships[key];
  }

  forEach(cb) {
    let rels = this.initializedRelationships;
    Object.keys(rels).forEach(name => {
      cb(name, rels[name]);
    });
  }

  get(key) {
    let relationships = this.initializedRelationships;
    let relationship = relationships[key];

    if (!relationship) {
      let recordData = this.recordData;
      let rel = this.recordData.storeWrapper.relationshipsDefinitionFor(this.recordData.modelName)[
        key
      ];

      if (rel) {
        relationship = relationships[key] = createRelationshipFor(
          rel,
          recordData.store,
          recordData,
          key
        );
      }
    }

    return relationship;
  }
}
