import { dasherize, singularize } from '@ember-data/request-utils/string';
import type Store from '@ember-data/store';
import { DEBUG } from '@warp-drive/build-config/env';
import type { LegacyRelationshipSchema } from '@warp-drive/core-types/schema/fields';

import type { Model } from './model';

function typeForRelationshipMeta(meta: LegacyRelationshipSchema): string {
  let modelName = dasherize(meta.type || meta.name);

  if (meta.kind === 'hasMany') {
    modelName = singularize(modelName);
  }

  return modelName;
}

function shouldFindInverse(relationshipMeta: LegacyRelationshipSchema): boolean {
  const options = relationshipMeta.options;
  return !(options && options.inverse === null);
}

class RelationshipDefinition {
  declare _type: string;
  declare __inverseKey: string | null;
  declare __hasCalculatedInverse: boolean;
  declare parentModelName: string;
  declare inverseIsAsync: string | null;
  declare meta: LegacyRelationshipSchema;

  constructor(meta: LegacyRelationshipSchema, parentModelName: string) {
    this._type = '';
    this.__inverseKey = '';
    this.__hasCalculatedInverse = false;
    this.parentModelName = parentModelName;
    this.meta = meta;
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
  get options() {
    return this.meta.options;
  }
  get name(): string {
    return this.meta.name;
  }

  _inverseKey(store: Store, modelClass: typeof Model): string | null {
    if (this.__hasCalculatedInverse === false) {
      this._calculateInverse(store, modelClass);
    }
    return this.__inverseKey;
  }

  _calculateInverse(store: Store, modelClass: typeof Model): void {
    this.__hasCalculatedInverse = true;
    let inverseKey: string | null = null;
    let inverse: LegacyRelationshipSchema | null = null;

    if (shouldFindInverse(this.meta)) {
      inverse = modelClass.inverseFor(this.name, store);
    }
    // TODO make this error again for the non-polymorphic case
    if (DEBUG) {
      if (!this.options.polymorphic) {
        modelClass.typeForRelationship(this.name, store);
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

export function relationshipFromMeta(
  meta: LegacyRelationshipSchema,
  parentModelName: string
): LegacyRelationshipSchema {
  return new RelationshipDefinition(meta, parentModelName) as unknown as LegacyRelationshipSchema;
}
