import { singularize } from 'ember-inflector';
import { DEBUG } from '@glimmer/env';
import normalizeModelName from './normalize-model-name';

export function typeForRelationshipMeta(meta) {
  let modelName;

  modelName = meta.type || meta.key;
  modelName = normalizeModelName(modelName);

  if (meta.kind === 'hasMany') {
    modelName = singularize(modelName);
  }

  return modelName;
}

function shouldFindInverse(relationshipMeta) {
  let options = relationshipMeta.options;
  return !(options && options.inverse === null);
}

export interface RelationshipSchema {
  kind: string;
  type: string;
  key: string;
  options: { [key: string]: any } ;
  name: string;
}

class RelationshipDefinition implements RelationshipSchema {
  meta: any;
  _type: string;
  __inverseKey: string;
  __inverseIsAsync: boolean | null;
  parentModelName: string;

  constructor(meta) {
    this.meta = meta;
    this._type = '';
    this.__inverseKey = '';
    this.__inverseIsAsync = null;
    this.parentModelName = meta.parentModelName;
  }

  get key():string {
    return this.meta.key;
  }
  get kind(): string {
    return this.meta.kind;
  }
  get type(): string {
    if (this._type) {
      return this._type;
    }
    this._type = typeForRelationshipMeta(this.meta);
    return this._type;
  }
  get options(): { [key: string]: any } {
    return this.meta.options;
  }
  get name(): string {
    return this.meta.name;
  }
  
  _inverseKey(store, modelClass) {
    if (this.__inverseKey === '') {
      this._calculateInverse(store, modelClass);
    }
    return this.__inverseKey;
  }

  _inverseIsAsync(store, modelClass) {
    if (this.__inverseIsAsync === null) {
      this._calculateInverse(store, modelClass);
    }
    return this.__inverseIsAsync;
  }

  _calculateInverse(store, modelClass) {
    let inverseKey, inverseIsAsync;
    let inverse : any = null;

    if (shouldFindInverse(this.meta)) {
      inverse = modelClass.inverseFor(this.key, store);
    } else if (DEBUG) {
      modelClass.typeForRelationship(this.key, store);
    }

    if (inverse) {
      inverseKey = inverse.name;
      inverseIsAsync = isInverseAsync(inverse);
    } else {
      inverseKey = null;
      inverseIsAsync = false;
    }
    this.__inverseKey = inverseKey;
    this.__inverseIsAsync = inverseIsAsync;
  }
}

function isInverseAsync(meta) {
  let inverseAsync = meta.options && meta.options.async;
  return typeof inverseAsync === 'undefined' ? true : inverseAsync;
}

export function relationshipFromMeta(meta) {
  return new RelationshipDefinition(meta);
}
