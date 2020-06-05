import { DEBUG } from '@glimmer/env';

import { singularize } from 'ember-inflector';

import { RelationshipSchema } from '../ts-interfaces/record-data-schemas';
import { BRAND_SYMBOL } from '../ts-interfaces/utils/brand';
import normalizeModelName from './normalize-model-name';

type CoreStore = import('./core-store').default;

/**
  @module @ember-data/store
*/

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

export class RelationshipDefinition implements RelationshipSchema {
  [BRAND_SYMBOL]: 'RelationshipSchema';
  _type: string = '';
  __inverseKey: string = '';
  __inverseIsAsync: boolean = true;
  __hasCalculatedInverse: boolean = false;
  parentModelName: string;
  inverse: string | null;
  inverseIsAsync: string | null;

  constructor(public meta: any) {
    this.parentModelName = meta.parentModelName;
  }

  get key(): string {
    return this.meta.key;
  }
  get kind(): 'belongsTo' | 'hasMany' {
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

  _inverseKey(store: CoreStore, modelClass): string {
    if (this.__hasCalculatedInverse === false) {
      this._calculateInverse(store, modelClass);
    }
    return this.__inverseKey;
  }

  _inverseIsAsync(store: CoreStore, modelClass): boolean {
    if (this.__hasCalculatedInverse === false) {
      this._calculateInverse(store, modelClass);
    }
    return this.__inverseIsAsync;
  }

  _calculateInverse(store: CoreStore, modelClass): void {
    this.__hasCalculatedInverse = true;
    let inverseKey, inverseIsAsync;
    let inverse: any = null;

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

function isInverseAsync(meta): boolean {
  let inverseAsync = meta.options && meta.options.async;
  return typeof inverseAsync === 'undefined' ? true : inverseAsync;
}

export function relationshipFromMeta(meta): RelationshipDefinition {
  return new RelationshipDefinition(meta);
}
