import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { RecordIdentifier } from './identifier';
import type { JsonApiResource, JsonApiValidationError } from './record-data-json-api';

/**
  @module @ember-data/store
*/

export interface ChangedAttributesHash {
  [key: string]: [string, string];
}

export interface RecordData {
  getResourceIdentifier(): RecordIdentifier | undefined;

  pushData(data: JsonApiResource, calculateChange: true): string[];
  pushData(data: JsonApiResource, calculateChange?: false): void;
  pushData(data: JsonApiResource, calculateChange?: boolean): string[] | void;
  clientDidCreate(): void;
  willCommit(): void;

  commitWasRejected(recordIdentifier?: RecordIdentifier, errors?: JsonApiValidationError[]): void;
  /**
   * @deprecated
   * @internal
   */
  commitWasRejected(recordIdentifier?: {}, errors?: JsonApiValidationError[]): void;

  unloadRecord(): void;
  rollbackAttributes(): string[];
  changedAttributes(): ChangedAttributesHash;
  hasChangedAttributes(): boolean;
  setDirtyAttribute(key: string, value: any): void;

  getAttr(key: string): any;
  getHasMany(key: string): CollectionResourceRelationship;

  addToHasMany(key: string, recordDatas: RecordData[], idx?: number): void;
  removeFromHasMany(key: string, recordDatas: RecordData[]): void;
  setDirtyHasMany(key: string, recordDatas: RecordData[]): void;

  getBelongsTo(key: string): SingleResourceRelationship;

  setDirtyBelongsTo(name: string, recordData: RecordData | null): void;
  didCommit(data: JsonApiResource | null): void;

  // ----- unspecced
  hasAttr(key: string): boolean;

  isRecordInUse(): boolean;
  _initRecordCreateOptions(options: any): { [key: string]: unknown };

  // new
  getErrors(recordIdentifier: RecordIdentifier): JsonApiValidationError[];

  isNew?(): boolean;
  isDeleted?(): boolean;
  // needs rfc
  isEmpty?(): boolean;

  isDeletionCommitted?(): boolean;

  setIsDeleted?(isDeleted: boolean): void;

  // Private and experimental
  __setId?(id: string): void;
}
