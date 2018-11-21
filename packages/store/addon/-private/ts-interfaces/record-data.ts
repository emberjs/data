import {
  JsonApiResource,
  JsonApiHasManyRelationship,
  JsonApiBelongsToRelationship,
  JsonApiValidationError
} from './record-data-json-api';

export interface ChangedAttributesHash {
  [key: string]: [string, string];
}
interface RecordIdentifier {

}

export default interface RecordData {
  pushData(data: JsonApiResource, calculateChange?: boolean): void;
  clientDidCreate(): void;
  willCommit(): void;
  commitWasRejected(recordIdentifier: RecordIdentifier, errors?: JsonApiValidationError[]): void;
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
  _initRecordCreateOptions(options: any): object;

  // new

  isNew(): boolean

  isDeleted(): boolean

  isDeletionCommitted(): boolean
  
  setIsDeleted(isDeleted: boolean): void
  getErrors(): JsonApiValidationError[]
}
