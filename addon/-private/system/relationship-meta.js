import { singularize } from 'ember-inflector';
import normalizeModelName from './normalize-model-name';
import { DEBUG } from '@glimmer/env';

export function typeForRelationshipMeta(meta) {
  let modelName;

  modelName = meta.type || meta.key;
  if (meta.kind === 'hasMany') {
    modelName = singularize(normalizeModelName(modelName));
  }
  return modelName;
}

function shouldFindInverse(relationshipMeta) {
  let options = relationshipMeta.options;
  return !(options && options.inverse === null);
}


class RelationshipDefinition {
  constructor(meta) {
    this.meta = meta;
    this._type = '';
    this._inverseKey = '';
    this.modelClass = meta.parentType;
    this.store = null;
  }

  get key() {
    return this.meta.key;
  }
  get kind() {
    return this.meta.kind;
  }
  get type() {
    if (this._type) {
      return this._type;
    }
    this._type = typeForRelationshipMeta(this.meta);
    return this._type;
  }
  get options() {
    return this.meta.options;
  }
  get name() {
    return this.meta.name;
  }
  get parentType() {
    return this.meta.parentType;
  }

  _inverseFor(store, modelClass) {
    if (this._inverseKey === '') {
      let inverseKey;
      let inverse = null;

      if (shouldFindInverse(this.meta)) {
        inverse = modelClass.inverseFor(this.key, store);
      } else if (DEBUG) {
        modelClass.typeForRelationship(this.key, store);
      }

      if (inverse) {
        inverseKey = inverse.name;
      } else {
        inverseKey = null;
      }
      this._inverseKey = inverseKey;
    }
    return this._inverseKey;
  }
}

export function relationshipFromMeta(meta) {
  return new RelationshipDefinition(meta);
}
