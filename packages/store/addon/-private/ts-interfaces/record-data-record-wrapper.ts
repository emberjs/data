import { ResolvedRegistry } from '@ember-data/types';
import {
  AttributeFieldsFor,
  BelongsToRelationshipFieldsFor,
  HasManyRelationshipFieldsFor,
  RecordType,
  RelatedType,
} from '@ember-data/types/utils';

import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { RecordIdentifier } from './identifier';
import type { ChangedAttributesHash } from './record-data';
import type { JsonApiValidationError } from './record-data-json-api';

/**
  @module @ember-data/store
*/

export interface RecordDataRecordWrapper<R extends ResolvedRegistry, T extends RecordType<R> = RecordType<R>> {
  rollbackAttributes(): AttributeFieldsFor<R, T>[];
  changedAttributes(): ChangedAttributesHash<R, T>;
  hasChangedAttributes(): boolean;
  setDirtyAttribute<F extends AttributeFieldsFor<R, T>>(key: F, value: unknown): void;

  // we could return RecordInstance<R, T>[F] however this would
  // restrict model implementations from transforming.
  // We should potentially introduce a concept of cache types
  getAttr<F extends AttributeFieldsFor<R, T>>(key: F): unknown;
  getHasMany<F extends HasManyRelationshipFieldsFor<R, T>>(
    key: F
  ): CollectionResourceRelationship<RelatedType<R, T, F>>;

  addToHasMany<F extends HasManyRelationshipFieldsFor<R, T>>(
    key: F,
    recordDatas: RecordDataRecordWrapper<R, RelatedType<R, T, F>>[],
    idx?: number
  ): void;
  removeFromHasMany<F extends HasManyRelationshipFieldsFor<R, T>>(
    key: F,
    recordDatas: RecordDataRecordWrapper<R, RelatedType<R, T, F>>[]
  ): void;
  setDirtyHasMany<F extends HasManyRelationshipFieldsFor<R, T>>(
    key: F,
    recordDatas: RecordDataRecordWrapper<R, RelatedType<R, T, F>>[]
  ): void;

  getBelongsTo<F extends BelongsToRelationshipFieldsFor<R, T>>(
    key: F
  ): SingleResourceRelationship<RelatedType<R, T, F>>;

  setDirtyBelongsTo<F extends BelongsToRelationshipFieldsFor<R, T>>(
    name: string,
    recordData: RecordDataRecordWrapper<R, RelatedType<R, T, F>> | null
  ): void;

  // ----- unspecced
  isAttrDirty<F extends AttributeFieldsFor<R, T>>(key: F): boolean;
  removeFromInverseRelationships(): void;
  hasAttr<F extends AttributeFieldsFor<R, T>>(key: F): boolean;

  // new
  getErrors?(recordIdentifier: RecordIdentifier): JsonApiValidationError[];
  /**
   * @internal
   * @deprecated
   */
  getErrors?({}): JsonApiValidationError[]; // eslint-disable-line no-empty-pattern

  isNew?(): boolean;
  isDeleted?(): boolean;

  isDeletionCommitted?(): boolean;

  setIsDeleted?(isDeleted: boolean): void;
}
