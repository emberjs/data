import { dasherize } from '@ember/string';
import { DEBUG } from '@glimmer/env';

import { singularize } from 'ember-inflector';

import type Store from '@ember-data/store';
import type { RelationshipSchema } from '@ember-data/types/q/record-data-schemas';

function typeForRelationshipMeta(meta) {
  let modelName = dasherize(meta.type || meta.key);

  if (meta.kind === 'hasMany') {
    modelName = singularize(modelName);
  }

  return modelName;
}

function shouldFindInverse(relationshipMeta) {
  let options = relationshipMeta.options;
  return !(options && options.inverse === null);
}

class RelationshipDefinition implements RelationshipSchema {
  declare _type: string;
  declare __inverseKey: string;
  declare __hasCalculatedInverse: boolean;
  declare parentModelName: string;
  declare inverseIsAsync: string | null;
  declare meta: any;

  constructor(meta: any) {
    this._type = '';
    this.__inverseKey = '';
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

  _inverseKey(store: Store, modelClass): string {
    if (this.__hasCalculatedInverse === false) {
      this._calculateInverse(store, modelClass);
    }
    return this.__inverseKey;
  }

  _calculateInverse(store: Store, modelClass): void {
    this.__hasCalculatedInverse = true;
    let inverseKey;
    let inverse: any = null;

    if (shouldFindInverse(this.meta)) {
      inverse = modelClass.inverseFor(this.key, store);
    }
    // TODO make this error again for the non-polymorphic case
    if (DEBUG) {
      if (!this.options.polymorphic) {
        modelClass.typeForRelationship(this.key, store);
      }
    }

    if (inverse) {
      inverseKey = inverse.name;
    } else {
      inverseKey = null;
    }
    this.__inverseKey = inverseKey;
  }
}
export type { RelationshipDefinition };

export function relationshipFromMeta(meta: RelationshipSchema): RelationshipDefinition {
  return new RelationshipDefinition(meta);
}
