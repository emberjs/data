import type EmberObject from '@ember/object';

import type { Errors } from '@ember-data/model/-private';
import type Store from '@ember-data/store';

import type { AttributeSchema, RelationshipSchema, RelationshipsSchema } from '@ember-data/types/q/record-data-schemas';
import type { JsonApiError } from '@ember-data/types/q/record-data-json-api';
import type HasManyReference from './references/has-many';
import type BelongsToReference from './references/belongs-to';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { LegacySupport } from './legacy-relationships-support';
import type { Cache } from '@ember-data/types/q/cache';
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
  hasMany(key: string): HasManyReference;
  belongsTo(key: string): BelongsToReference
  eachRelationship<T>(callback: (this: T, key: string, meta: RelationshipSchema) => void, binding?: T): void;
  eachAttribute<T>(callback: (this: T, key: string, meta: AttributeSchema) => void, binding?: T): void;
  invalidErrorsChanged(errors: JsonApiError[]): void;
  rollbackAttributes(): void;
  changedAttributes(): Record<string, [unknown, unknown]>;
  [key: string]: unknown;
  isDeleted: boolean;
  deleteRecord(): void;
  unloadRecord(): void;
  serialize(): Record<string, unknown>;

  static modelName: string;
  static fields: Map<string, 'attribute' | 'belongsTo' | 'hasMany'>;
  static attributes: Map<string, AttributeSchema>;
  static relationshipsByName: Map<string, RelationshipSchema>;
  static eachAttribute<T>(callback: (this: T, key: string, attribute: AttributeSchema) => void, binding?: T): void;
  static eachRelationship<T>(callback: (this: T, key: string, relationship: RelationshipSchema) => void, binding?: T): void;
  static eachTransformedAttribute<T>(callback: (this: T, key: string, type: string | null) => void, binding?: T): void;

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
