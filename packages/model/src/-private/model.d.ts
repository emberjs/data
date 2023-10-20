import type EmberObject from '@ember/object';

import type { Errors } from '@ember-data/model/-private';
import type Store from '@ember-data/store';

import type { AttributeSchema, RelationshipSchema, RelationshipsSchema } from '@ember-data/store/-types/q/record-data-schemas';
import type { JsonApiError } from '@ember-data/store/-types/q/record-data-json-api';
import type HasManyReference from './references/has-many';
import type BelongsToReference from './references/belongs-to';
import type { StableRecordIdentifier } from '@ember-data/store/-types/q/identifier';
import type { LegacySupport } from './legacy-relationships-support';
import type { Cache } from '@ember-data/store/-types/q/cache';
import type RecordState from './record-state';

export type ModelCreateArgs = {
  _createProps: Record<string, unknown>;
  // TODO @deprecate consider deprecating accessing record properties during init which the below is necessary for
  _secretInit: {
    identifier: StableRecordIdentifier;
    cache: Cache;
    store: Store;
    cb: (record: Model, cache: Cache, identifier: StableRecordIdentifier, store: Store) => void;
  };
};


class Model extends EmberObject {
  store: Store;
  errors: Errors;
  currentState: RecordState;
  adapterError?: Error;
  toString(): string;
  save(): Promise<this>;
  hasMany(key: keyof this & string): HasManyReference;
  belongsTo(key: keyof this & string): BelongsToReference
  eachRelationship<T extends Model, K extends keyof T & string>(callback: (this: T, key: K, meta: RelationshipSchema) => void, binding?: T): void;
  eachAttribute<T extends Model, K extends keyof T & string>(callback: (this: T, key: K, meta: AttributeSchema) => void, binding?: T): void;
  invalidErrorsChanged(errors: JsonApiError[]): void;
  rollbackAttributes(): void;
  changedAttributes(): Record<string, [unknown, unknown]>;
  id: string;
  [key: string]: unknown;
  isSaving: boolean;
  isNew: boolean;
  isDeleted: boolean;
  hasDirtyAttributes: boolean;
  deleteRecord(): void;
  unloadRecord(): void;
  serialize(): Record<string, unknown>;

  static modelName: string;
  static fields: Map<keyof this & string, 'attribute' | 'belongsTo' | 'hasMany'>;
  static attributes: Map<keyof this & string, AttributeSchema>;
  static relationshipsByName: Map<keyof this & string, RelationshipSchema>;
  static eachAttribute<K extends keyof this & string>(callback: (this: ModelSchema<this>, key: K, attribute: AttributeSchema) => void, binding?: T): void;
  static eachRelationship<K extends keyof this & string>(callback: (this: ModelSchema<this>, key: K, relationship: RelationshipSchema) => void, binding?: T): void;
  static eachTransformedAttribute<K extends keyof this & string>(callback: (this: ModelSchema<this>, key: K, type: string | null) => void, binding?: T): void;

  static toString(): string;
  static isModel: true;
  static relationshipsObject: RelationshipsSchema;
  static extend(...mixins: unknown[]): typeof Model;
  static reopenClass(...mixins: unknown[]): void;
  static create(createArgs: ModelCreateArgs): Model;
  static __isMixin?: true;
  static __mixin?: unknown;
}

interface Model {
  constructor: typeof Model;
}

export default Model;

export type StaticModel = typeof Model;

export const LEGACY_SUPPORT: Map<StableRecordIdentifier | Model, LegacySupport>;

export type ModelFactory = { class: StaticModel };
export type FactoryCache = Record<string, ModelFactory>;
// we put this on the store for interop because it's used by modelFor and
// instantiateRecord as well.
export type ModelStore = Store & { _modelFactoryCache: FactoryCache };
