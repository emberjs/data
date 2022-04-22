import type { ResolvedRegistry } from '@ember-data/types';
import type {
  AttributeFieldsFor,
  BelongsToRelationshipFieldsFor,
  HasManyRelationshipFieldsFor,
  RecordField,
  RecordType,
  RelatedType,
} from '@ember-data/types/utils';

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
  setDirtyAttribute<F extends AttributeFieldsFor<R, T>>(key: F, value: unknown): void;

  getAttr<F extends AttributeFieldsFor<R, T>>(key: F): unknown;
  getHasMany<F extends HasManyRelationshipFieldsFor<R, T>, RT extends RelatedType<R, T, F> = RelatedType<R, T, F>>(
    key: F
  ): CollectionResourceRelationship<RT>;

  addToHasMany<F extends HasManyRelationshipFieldsFor<R, T>, RT extends RelatedType<R, T, F> = RelatedType<R, T, F>>(
    key: F,
    recordDatas: RecordData<R, RT>[],
    idx?: number
  ): void;
  removeFromHasMany<
    F extends HasManyRelationshipFieldsFor<R, T>,
    RT extends RelatedType<R, T, F> = RelatedType<R, T, F>
  >(
    key: F,
    recordDatas: RecordData<R, RT>[]
  ): void;
  setDirtyHasMany<F extends HasManyRelationshipFieldsFor<R, T>, RT extends RelatedType<R, T, F> = RelatedType<R, T, F>>(
    key: F,
    recordDatas: RecordData<R, RT>[]
  ): void;

  getBelongsTo<F extends BelongsToRelationshipFieldsFor<R, T>, RT extends RelatedType<R, T, F> = RelatedType<R, T, F>>(
    key: F
  ): SingleResourceRelationship<RT>;

  setDirtyBelongsTo<F extends BelongsToRelationshipFieldsFor<R, T>>(
    name: F,
    recordData: RecordData<R, RelatedType<R, T, F>> | null
  ): void;
  didCommit(data: JsonApiResource | null): void;

  // ----- unspecced
  isAttrDirty<F extends AttributeFieldsFor<R, T>>(key: F): boolean;
  removeFromInverseRelationships(): void;
  hasAttr<F extends AttributeFieldsFor<R, T>>(key: F): boolean;

  isRecordInUse(): boolean;
  _initRecordCreateOptions(options: Dict<unknown>): Dict<unknown>;

  // new
  getErrors?<T extends RecordType<R>>(recordIdentifier: RecordIdentifier<T>): JsonApiValidationError[];
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
