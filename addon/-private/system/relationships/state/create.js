import Ember from 'ember';
import ManyRelationship from "./has-many";
import BelongsToRelationship from "./belongs-to";
import { DEBUG } from '@glimmer/env';

const { get } = Ember;

function shouldFindInverse(relationshipMeta) {
  let options = relationshipMeta.options;
  return !(options && options.inverse === null);
}

function createRelationshipFor(internalModel, relationshipMeta, store) {
  let inverseKey;
  let inverse = null;

  if (shouldFindInverse(relationshipMeta)) {
    inverse = internalModel.type.inverseFor(relationshipMeta.key, store);
  } else if (DEBUG) {
    internalModel.type.typeForRelationship(relationshipMeta.key, store);
  }

  if (inverse) {
    inverseKey = inverse.name;
  }

  if (relationshipMeta.kind === 'hasMany') {
    return new ManyRelationship(store, internalModel, inverseKey, relationshipMeta);
  } else {
    return new BelongsToRelationship(store, internalModel, inverseKey, relationshipMeta);
  }
}

export default class Relationships {
  constructor(internalModel) {
    this.internalModel = internalModel;
    this.initializedRelationships = Object.create(null);
  }

  // TODO @runspired deprecate this as it was never truly a record instance
  get record() {
    return this.internalModel;
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
    let internalModel = this.internalModel;

    if (!relationship) {
      let relationshipsByName = get(internalModel.type, 'relationshipsByName');
      let rel = relationshipsByName.get(key);

      if (!rel) { return undefined; }

      let relationshipPayload = internalModel.store._relationshipsPayloads.get(internalModel.modelName, internalModel.id, key);

      relationship = relationships[key] = createRelationshipFor(internalModel, rel, internalModel.store);

      if (relationshipPayload) {
        relationship.push(relationshipPayload, true);
      }
    }

    return relationship;
  }
}
