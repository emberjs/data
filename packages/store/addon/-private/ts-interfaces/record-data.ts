import {
  JsonApiResource,
  JsonApiHasManyRelationship,
  JsonApiBelongsToRelationship,
  JsonApiValidationError,
} from './record-data-json-api';

import { RecordIdentifier } from './identifier';

/**
  @module @ember-data/store
*/

export interface ChangedAttributesHash {
  [key: string]: [string, string];
}

export default interface RecordData {
  pushData(data: JsonApiResource, calculateChange?: boolean): void;
  clientDidCreate(): void;
  willCommit(): void;

  commitWasRejected(recordIdentifier?: RecordIdentifier, errors?: JsonApiValidationError[]): void;
  /**
   * @deprecated
   */
  commitWasRejected(recordIdentifier?: {}, errors?: JsonApiValidationError[]): void;

  unloadRecord(): void;
  rollbackAttributes(): string[];
  changedAttributes(): ChangedAttributesHash;
  hasChangedAttributes(): boolean;
  setDirtyAttribute(key: string, value: any): void;

  getAttr(key: string): any;
  getHasMany(key: string): JsonApiHasManyRelationship;

  addToHasMany(key: string, recordDatas: RecordData[], idx?: number): void;
  removeFromHasMany(key: string, recordDatas: RecordData[]): void;
  setDirtyHasMany(key: string, recordDatas: RecordData[]): void;

  getBelongsTo(key: string): JsonApiBelongsToRelationship;

  setDirtyBelongsTo(name: string, recordData: RecordData | null): void;
  didCommit(data: JsonApiResource | null): void;

  // ----- unspecced
  isAttrDirty(key: string): boolean;
  removeFromInverseRelationships(isNew: boolean): void;
  hasAttr(key: string): boolean;

  isRecordInUse(): boolean;
  _initRecordCreateOptions(options: any): { [key: string]: unknown };

  // new
  getErrors?(recordIdentifier: RecordIdentifier): JsonApiValidationError[];
  /**
   * @deprecated
   */
  getErrors?({}): JsonApiValidationError[]; // eslint-disable-line no-empty-pattern

  isNew?(): boolean;
  isDeleted?(): boolean;

  isDeletionCommitted?(): boolean;

  setIsDeleted?(isDeleted: boolean): void;
}
