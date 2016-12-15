import Ember from 'ember';
import ManyRelationship from "ember-data/-private/system/relationships/state/has-many";
import BelongsToRelationship from "ember-data/-private/system/relationships/state/belongs-to";
import EmptyObject from "ember-data/-private/system/empty-object";
import { runInDebug } from 'ember-data/-private/debug';

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
  } else {
    runInDebug(() => {
      internalModel.type.typeForRelationship(relationshipMeta.key, store);
    });
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
    this.initializedRelationships = new EmptyObject();
  }

  // TODO @runspired deprecate this as it was never truly a record instance
  get record() {
    return this.internalModel;
  }

  has(key) {
    return !!this.initializedRelationships[key];
  }

  get(key) {
    let relationships = this.initializedRelationships;
    let internalModel = this.internalModel;
    let relationshipsByName = get(internalModel.type, 'relationshipsByName');

    if (!relationships[key] && relationshipsByName.get(key)) {
      relationships[key] = createRelationshipFor(internalModel, relationshipsByName.get(key), internalModel.store);
    }

    return relationships[key];
  }
}
