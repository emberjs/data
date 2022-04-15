import { DEBUG } from '@glimmer/env';

import { singularize } from 'ember-inflector';

import { normalizeModelName } from '@ember-data/store/-private';
import type CoreStore from '@ember-data/store/-private/system/core-store';
import type { RelationshipSchema } from '@ember-data/store/-private/ts-interfaces/record-data-schemas';

/**
  @module @ember-data/store
*/

function typeForRelationshipMeta(meta) {
  let modelName = normalizeModelName(meta.type || meta.key);

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
  declare _type: string;
  declare __inverseKey: string;
  declare __inverseIsAsync: boolean;
  declare __hasCalculatedInverse: boolean;
  declare parentModelName: string;
  declare inverseIsAsync: string | null;
  declare meta: any;

  constructor(meta: any) {
    this._type = '';
    this.__inverseKey = '';
    this.__inverseIsAsync = true;
    this.__hasCalculatedInverse = false;
    this.parentModelName = meta.parentModelName;
    this.meta = meta;
  }

  /**
   * @internal
   * @deprecated
   */
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
      inverseIsAsync = isRelationshipAsync(inverse);
    } else {
      inverseKey = null;
      inverseIsAsync = false;
    }
    this.__inverseKey = inverseKey;
    this.__inverseIsAsync = inverseIsAsync;
  }
}

function isRelationshipAsync(meta: RelationshipSchema): boolean {
  let inverseAsync = meta.options && meta.options.async;
  return typeof inverseAsync === 'undefined' ? true : inverseAsync;
}

export function relationshipFromMeta(meta: RelationshipSchema): RelationshipDefinition {
  return new RelationshipDefinition(meta);
}
