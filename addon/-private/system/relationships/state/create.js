import ManyRelationship from "./has-many";
import BelongsToRelationship from "./belongs-to";

function createRelationshipFor(relationshipMeta, store, modelData, key) {
  let inverseKey = modelData.storeWrapper.inverseForRelationship(modelData.modelName, key);
  let inverseIsAsync = modelData.storeWrapper.inverseIsAsyncForRelationship(modelData.modelName, key);

  if (relationshipMeta.kind === 'hasMany') {
    return new ManyRelationship(store, inverseKey, relationshipMeta, modelData, inverseIsAsync);
  } else {
    return new BelongsToRelationship(store, inverseKey, relationshipMeta, modelData, inverseIsAsync);
  }
}

export default class Relationships {
  constructor(modelData) {
    this.modelData = modelData;
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
      let modelData = this.modelData;
      let rel = this.modelData.storeWrapper.relationshipsDefinitionFor(this.modelData.modelName)[key];

      if (rel) {
        relationship = relationships[key] = createRelationshipFor(rel, modelData.store, modelData, key);
      }
    }

    return relationship;
  }
}
