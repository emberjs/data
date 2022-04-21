import type { ResolvedRegistry } from '@ember-data/types';
import type { RecordField, RecordType } from '@ember-data/types/utils';

import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { RecordIdentifier, StableRecordIdentifier } from './identifier';
import type { JsonApiResource, JsonApiValidationError } from './record-data-json-api';
import { Dict } from './utils';

/**
  @module @ember-data/store
*/

/**
 * A map of field name to old|new values for an attribute
 * @internal
 */
export type ChangedAttributesHash<R extends ResolvedRegistry, T extends RecordType<R>> = {
  [K in RecordField<R, T>]?: [unknown, unknown];
};

export interface RecordData<R extends ResolvedRegistry, T extends RecordType<R>> {
  getResourceIdentifier(): RecordIdentifier<T> | undefined;

  pushData(data: JsonApiResource, calculateChange: true): RecordField<R, T>[];
  pushData(data: JsonApiResource, calculateChange?: false): void;
  pushData(data: JsonApiResource, calculateChange?: boolean): RecordField<R, T>[] | void;
  clientDidCreate(): void;
  willCommit(): void;

  commitWasRejected(recordIdentifier?: StableRecordIdentifier<T>, errors?: JsonApiValidationError[]): void;

  unloadRecord(): void;
  rollbackAttributes(): string[];
  changedAttributes(): ChangedAttributesHash<R, T>;
  hasChangedAttributes(): boolean;
  setDirtyAttribute<K extends RecordField<R, T>>(key: K, value: unknown): void;

  getAttr<K extends RecordField<R, T>>(key: K): unknown;
  getHasMany<K extends RecordField<R, T>>(key: K): CollectionResourceRelationship;

  addToHasMany<K extends RecordField<R, T>>(key: K, recordDatas: RecordData<R, RecordType<R>>[], idx?: number): void;
  removeFromHasMany<K extends RecordField<R, T>>(key: K, recordDatas: RecordData<R, RecordType<R>>[]): void;
  setDirtyHasMany<K extends RecordField<R, T>>(key: K, recordDatas: RecordData<R, RecordType<R>>[]): void;

  getBelongsTo<K extends RecordField<R, T>>(key: K): SingleResourceRelationship;

  setDirtyBelongsTo<K extends RecordField<R, T>>(name: K, recordData: RecordData<R, RecordType<R>> | null): void;
  didCommit(data: JsonApiResource | null): void;

  // ----- unspecced
  isAttrDirty<K extends RecordField<R, T>>(key: K): boolean;
  removeFromInverseRelationships(): void;
  hasAttr<K extends RecordField<R, T>>(key: K): boolean;

  isRecordInUse(): boolean;
  _initRecordCreateOptions(options: Dict<unknown>): Dict<unknown>;

  // new
  getErrors?(recordIdentifier: RecordIdentifier): JsonApiValidationError[];
  /**
   * @deprecated
   * @internal
   */
  getErrors?({}): JsonApiValidationError[]; // eslint-disable-line no-empty-pattern

  isNew?(): boolean;
  isDeleted?(): boolean;

  isDeletionCommitted?(): boolean;

  setIsDeleted?(isDeleted: boolean): void;

  // Private and experimental
  __setId?(id: string): void;
}
