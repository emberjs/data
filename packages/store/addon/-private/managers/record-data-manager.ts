import { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import { RecordData, RecordDataV2 } from '@ember-data/types/q/record-data';
import { JsonApiResource } from '@ember-data/types/q/record-data-json-api';

import { isStableIdentifier } from '../caches/identifier-cache';

export function isVersion2RecordData(
  recordData: RecordData | NonSingletonRecordDataManager | StableRecordIdentifier
): recordData is RecordDataV2 {
  if (recordData instanceof NonSingletonRecordDataManager) {
    return false;
  }
  if (isStableIdentifier(recordData)) {
    return false;
  }

  return recordData.version === '2';
}

export class NonSingletonRecordDataManager {
  version: '2' = '2';
  isManager: true = true;

  /**
   * The RecordData interface version of the underlying
   * RecordData instance being managed. The Manager
   * always implements and expects the most recent
   * version.
   */
  managedVersion: '1' | '2' = '1';

  #recordData: RecordData;
  #identifier: StableRecordIdentifier;

  constructor(recordData: RecordData, identifier: StableRecordIdentifier) {
    this.#recordData = recordData;
    this.#identifier = identifier;
  }

  #isDeprecated(recordData: RecordData): recordData is RecordDataV1 {
    let version = recordData.version || '1';
    return version !== this.version;
  }

  // Operation On a Resource
  // =======================

  pushData(identifier: StableRecordIdentifier, data: JsonApiResource, hasRecord?: boolean): void | string[] {
    const recordData = this.#recordData;
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      data = identifier as JsonApiResource;
      hasRecord = data as boolean;
      identifier = this.#identifier;
    }
    if (this.#isDeprecated(recordData)) {
      return recordData.pushData(data, hasRecord);
    }
    return recordData.pushData(identifier, data, hasRecord);
  }

  // Potentially but unlikely to be changed by the Operations RFC
  clientDidCreate(identifier: StableRecordIdentifier, options: object) {
    // called by something V1
    let calledByV1 = false;
    if (!isStableIdentifier(identifier)) {
      calledByV1 = true;
      options = identifier;
      identifier = this.#identifier;
    }
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      recordData.clientDidCreate();
      // if a V2 is calling a V1 we need to call both methods
      if (calledByV1 === false) {
        // in V1 we do not return, but we don't
        // actually want that so we leave the return
        // to be inferred via getters off the propertyNames passed in
        recordData._initRecordCreateOptions(options);
      }
    }

    recordData.clientDidCreate(identifier, options);
  }

  // Private Intimate V1 APIs that are also deprecated
  /* @deprecated */
  _initRecordCreateOptions(options: object) {
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      return recordData._initRecordCreateOptions(options);
    }
  }

  willCommit(identifier: StableRecordIdentifier): void {
    this.#recordData.willCommit(identifier || this.#identifier);
  }

  didCommit(identifier: StableRecordIdentifier, data: any): void {
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      data = identifier;
      identifier = this.#identifier;
    }
    let recordData = this.#recordData;
    return this.#isDeprecated(recordData) ? recordData.didCommit(data) : recordData.didCommit(identifier, data);
  }

  // RecordData Errors RFC may supercede
  commitWasRejected(identifier: StableRecordIdentifier) {
    this.#recordData.commitWasRejected(identifier || this.#identifier);
  }

  unloadRecord(identifier: StableRecordIdentifier): void {
    const recordData = this.#recordData;
    if (this.#isDeprecated(recordData)) {
      recordData.unloadRecord();
    } else {
      recordData.unloadRecord(identifier || this.#identifier);
    }
  }

  // Granular Resource Interactions
  // ==============================

  getAttr(identifier: StableRecordIdentifier, propertyName: string): unknown {
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      propertyName = identifier;
      identifier = this.#identifier;
    }
    let recordData = this.#recordData;
    return this.#isDeprecated(recordData)
      ? recordData.getAttr(propertyName)
      : recordData.getAttr(identifier, propertyName);
  }

  changedAttributes(identifier: StableRecordIdentifier): object {
    return this.#recordData.changedAttributes(identifier || this.#identifier);
  }

  hasChangedAttributes(identifier: StableRecordIdentifier): boolean {
    return this.#recordData.hasChangedAttributes(identifier || this.#identifier);
  }

  rollbackAttributes(identifier: StableRecordIdentifier) {
    return this.#recordData.rollbackAttributes(identifier || this.#identifier);
  }

  // the third arg here is "private". In a world with only V2 it is not necessary
  // but in one in which we must convert a call from V2 -> V1 it is required to do this
  // or else to do nasty schema lookup things
  // @runspired has implemented this concept in relationships spikes and is confident
  // we do not need any signal about whether a relationship is a collection or not at this
  // boundary
  getRelationship(identifier: StableRecordIdentifier, propertyName: string, isCollection = false) {
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      // TODO relationships RFC will fix the need for the wrapper to ease this
      let isBelongsTo = !isCollection;
      return isBelongsTo ? recordData.getBelongsTo(propertyName) : recordData.getHasMany(propertyName);
    }

    return recordData.getRelationship(identifier, propertyName);
  }

  // RecordData State RFC may supercede
  isEmpty(identifier: StableRecordIdentifier) {
    return this.#recordData.isEmpty(identifier || this.#identifier);
  }
  isNew(identifier: StableRecordIdentifier) {
    return this.#recordData.isNew(identifier || this.#identifier);
  }

  // Operations RFC may supercede
  setBelongsTo(identifier: StableRecordIdentifier, propertyName: string, value: any) {
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyBelongsTo(propertyName, value)
      : recordData.setBelongsTo(identifier, propertyName, value);
  }

  /* @deprecated */
  setDirtyBelongsTo(propertyName: string, value: any) {
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyBelongsTo(propertyName, value)
      : recordData.setBelongsTo(this.#identifier, propertyName, value);
  }

  setAttribute(identifier: StableRecordIdentifier, propertyName: string, value: any) {
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyAttribute(propertyName, value)
      : recordData.setAttribute(identifier, propertyName, value);
  }
  /* @deprecated */
  setDirtyAttribute(propertyName: string, value: any) {
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyAttribute(propertyName, value)
      : recordData.setAttribute(this.#identifier, propertyName, value);
  }
  // TODO consider how idx fits into the RFC
  addToHasMany(identifier: StableRecordIdentifier, propertyName: string, value: RecordData[], idx?: number) {
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      idx = value as unknown as number;
      value = propertyName as unknown as RecordData[];
      propertyName = identifier as unknown as string;
      identifier = this.#identifier;
    }
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.addToHasMany(propertyName, value, idx)
      : recordData.addToHasMany(identifier, propertyName, value);
  }
  removeFromHasMany(identifier: StableRecordIdentifier, propertyName: string, value: RecordData[]) {
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      value = propertyName as unknown as RecordData[];
      propertyName = identifier as unknown as string;
      identifier = this.#identifier;
    }
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.removeFromHasMany(propertyName, value)
      : recordData.removeFromHasMany(identifier, propertyName, value);
  }
  setHasMany(identifier: StableRecordIdentifier, propertyName: string, value: RecordData[]) {
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyHasMany(propertyName, value)
      : recordData.setHasMany(identifier, propertyName, value);
  }
  /* @deprecated */
  setDirtyHasMany(propertyName: string, value: RecordData[]) {
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyHasMany(propertyName, value)
      : recordData.setHasMany(this.#identifier, propertyName, value);
  }
  getHasMany(propertyName: string) {
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      return recordData.getHasMany(propertyName);
    } else {
      // TODO deprecate this
      // this allows us to have the wrapper act
      // as a singleton.
      let identifier = this.#identifier;
      return recordData.getRelationship(identifier, propertyName);
    }
  }

  // Deprecated from V1
  /* @deprecated */
  getBelongsTo(propertyName: string) {
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      return recordData.getBelongsTo(propertyName);
    } else {
      // TODO deprecate this
      // this allows us to have the wrapper act
      // as a singleton.
      let identifier = this.#identifier;
      return recordData.getRelationship(identifier, propertyName);
    }
  }

  // Deprecated from V1
  /* @deprecated */
  getResourceIdentifier() {
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      return recordData.getResourceIdentifier();
    } else {
      // TODO deprecate this
      // this allows us to have the wrapper act
      // as a singleton.
      return this.#identifier;
    }
  }
}
