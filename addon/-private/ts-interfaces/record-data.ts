import { JsonApiResource, JsonApiHasManyRelationship, JsonApiBelongsToRelationship } from './record-data-json-api';

  export interface ChangedAttributesHash {
    [key: string]: [string, string]
  }

  export default interface RecordData {
    pushData(data: JsonApiResource, calculateChange?: boolean);
    clientDidCreate();
    willCommit();
    commitWasRejected();
    unloadRecord();
    rollbackAttributes();
    changedAttributes(): ChangedAttributesHash;
    hasChangedAttributes(): boolean;
    setDirtyAttribute(key: string, value: any);
  
    getAttr(key: string): any;
    getHasMany(key: string): JsonApiHasManyRelationship;
  
    addToHasMany(key: string, recordDatas: RecordData[], idx?: number)
    removeFromHasMany(key: string, recordDatas: RecordData[])
    setDirtyHasMany(key: string, recordDatas: RecordData[])
  
    getBelongsTo(key: string): JsonApiBelongsToRelationship;
  
    setDirtyBelongsTo(name: string, recordData: RecordData | null)
    didCommit(data: JsonApiResource | null)
    
    // ----- unspecced
    isAttrDirty(key: string)
    removeFromInverseRelationships(isNew: boolean)
    hasAttr(key: string): boolean;
  
    isRecordInUse(): boolean;
    _initRecordCreateOptions(options)
  }