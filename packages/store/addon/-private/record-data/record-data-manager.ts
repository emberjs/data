import { StableRecordIdentifier, IS_IDENTIFIER } from '../ts-interfaces/identifier';
import { RecordData, RecordDataV1, RecordDataV2 } from '../ts-interfaces/ts-interfaces/record-data';
const MGR_CACHE = new WeakMap<object, RecordDataManager>();
const MGR_IDENTIFIER = new WeakMap<RecordDataManager, StableRecordIdentifier>();
const RECORD_DATA_LOOKUP = new WeakMap<RecordDataManager, RecordData>();

function recordDataFor(manager: RecordDataManager): RecordData {
  let recordData = RECORD_DATA_LOOKUP.get(manager);

  if (recordData === undefined) {
    throw new Error('No RecordData associated with this Manager');
  }

  return recordData;
}

function isIdentifier(identifier): identifier is StableRecordIdentifier {
  return typeof identifier === 'object' && identifier !== null && identifier[IS_IDENTIFIER] === true;
}

function isVersion2RecordData(
  recordData: RecordData | RecordDataManager | StableRecordIdentifier
): recordData is RecordDataV2 {
  if (recordData instanceof RecordDataManager) {
    return false;
  }
  if (isIdentifier(recordData)) {
    return false;
  }

  return recordData.version === '2';
}

function identifierForManager(manager: RecordDataManager): StableRecordIdentifier {
  let identifier = MGR_IDENTIFIER.get(manager);
  if (identifier === undefined) {
    throw new Error('No identifier available for this manager');
  }
  return identifier;
}

export function getRecordDataManagerFor(
  recordData: RecordData | RecordDataManager | StableRecordIdentifier,
  identifier?: StableRecordIdentifier
): RecordDataManager {
  if (identifier === undefined && isVersion2RecordData(recordData)) {
    // we might be a singleton, so this would be deadly
    throw new Error('Cannot lookup the RecordDataManager for a V2 RecordData without an identifier');
  }
  let manager = MGR_CACHE.get(identifier || recordData);

  if (manager === undefined) {
    if (isIdentifier(recordData)) {
      throw new Error('No RecordDataManager ever created for this identifier');
    }
    if (!identifier) {
      throw new Error('Cannot create new RecordDataManager without an identifier');
    }
    manager = new RecordDataManager(recordData, identifier);
  }

  return manager;
}

export class RecordDataManager {
  public version: '2';
  public isManager: true;
  /**
   * The RecordData interface version of the underlying
   * RecordData instance being managed. The Manager
   * always implements and expects the most recent
   * version.
   */
  public managedVersion: string = '2';

  constructor(recordData: RecordData, identifier: StableRecordIdentifier) {
    RECORD_DATA_LOOKUP.set(this, recordData);
    MGR_IDENTIFIER.set(this, identifier);
    MGR_CACHE.set(identifier, this);
    MGR_CACHE.set(this, this);
    MGR_CACHE.set(recordData, this);

    this.managedVersion = recordData.version || '1';
  }

  target() {
    return recordDataFor(this);
  }

  isDeprecated(recordData: RecordData): recordData is RecordDataV1 {
    let version = recordData.version || '1';
    return version !== this.version;
  }

  pushData(data: object, hasRecord: boolean) {
    return recordDataFor(this).pushData(data, hasRecord);
  }

  unloadRecord(identifier: StableRecordIdentifier): void {
    recordDataFor(this).unloadRecord(identifier || identifierForManager(this));
  }

  isRecordInUse(identifier: StableRecordIdentifier): boolean {
    return recordDataFor(this).isRecordInUse(identifier || identifierForManager(this));
  }

  getAttr(identifier: StableRecordIdentifier, propertyName: string): any {
    // called by something V1
    if (!isIdentifier(identifier)) {
      propertyName = identifier;
      identifier = identifierForManager(this);
    }
    let recordData = recordDataFor(this);
    return this.isDeprecated(recordData)
      ? recordData.getAttr(propertyName)
      : recordData.getAttr(identifier, propertyName);
  }

  isAttrDirty(identifier: StableRecordIdentifier, propertyName: string): boolean {
    // called by something V1
    if (!isIdentifier(identifier)) {
      propertyName = identifier;
      identifier = identifierForManager(this);
    }
    let recordData = recordDataFor(this);
    return this.isDeprecated(recordData)
      ? recordData.isAttrDirty(propertyName)
      : recordData.isAttrDirty(identifier, propertyName);
  }

  changedAttributes(identifier: StableRecordIdentifier): object {
    return recordDataFor(this).changedAttributes(identifier || identifierForManager(this));
  }

  hasChangedAttributes(identifier: StableRecordIdentifier): boolean {
    return recordDataFor(this).hasChangedAttributes(identifier || identifierForManager(this));
  }

  rollbackAttributes(identifier: StableRecordIdentifier) {
    return recordDataFor(this).rollbackAttributes(identifier || identifierForManager(this));
  }

  // the third arg here is "private". In a world with only V2 it is not necessary
  // but in one in which we must convert a call from V2 -> V1 it is required to do this
  // or else to do nasty schema lookup things
  // @runspired has implemented this concept in relationships spikes and is confident
  // we do not need any signal about whether a relationship is a collection or not at this
  // boundary
  getRelationship(identifier: StableRecordIdentifier, propertyName: string, isCollection = false) {
    let recordData = recordDataFor(this);

    if (this.isDeprecated(recordData)) {
      // TODO relationships RFC will fix the need for the wrapper to ease this
      let isBelongsTo = !isCollection;
      return isBelongsTo ? recordData.getBelongsTo(propertyName) : recordData.getHasMany(propertyName);
    }

    return recordData.getRelationship(identifier, propertyName);
  }

  willCommit(identifier: StableRecordIdentifier): void {
    recordDataFor(this).willCommit(identifier || identifierForManager(this));
  }

  didCommit(identifier: StableRecordIdentifier, data: any): void {
    // called by something V1
    if (!isIdentifier(identifier)) {
      data = identifier;
      identifier = identifierForManager(this);
    }
    let recordData = recordDataFor(this);
    return this.isDeprecated(recordData) ? recordData.didCommit(data) : recordData.didCommit(identifier, data);
  }

  // RecordData Errors RFC may supercede
  commitWasRejected(identifier: StableRecordIdentifier) {
    recordDataFor(this).commitWasRejected(identifier || identifierForManager(this));
  }

  // RecordData State RFC may supercede
  isEmpty(identifier: StableRecordIdentifier) {
    return recordDataFor(this).isEmpty(identifier || identifierForManager(this));
  }
  isNew(identifier: StableRecordIdentifier) {
    return recordDataFor(this).isNew(identifier || identifierForManager(this));
  }

  // Potentially but unlikely to be changed by the Operations RFC
  clientDidCreate(identifier: StableRecordIdentifier, options: object) {
    // called by something V1
    let calledByV1 = false;
    if (!isIdentifier(identifier)) {
      calledByV1 = true;
      options = identifier;
      identifier = identifierForManager(this);
    }
    let recordData = recordDataFor(this);

    if (this.isDeprecated(recordData)) {
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

  // Operations RFC may supercede
  setBelongsTo(identifier: StableRecordIdentifier, propertyName: string, value: any) {
    let recordData = recordDataFor(this);

    this.isDeprecated(recordData)
      ? recordData.setDirtyBelongsTo(propertyName, value)
      : recordData.setBelongsTo(identifier, propertyName, value);
  }
  /* @deprecated */
  setDirtyBelongsTo(propertyName: string, value: any) {
    let recordData = recordDataFor(this);

    this.isDeprecated(recordData)
      ? recordData.setDirtyBelongsTo(propertyName, value)
      : recordData.setBelongsTo(identifierForManager(this), propertyName, value);
  }
  removeFromInverseRelationships(identifier: StableRecordIdentifier, isNew: boolean) {
    // called by something V1
    if (!isIdentifier(identifier)) {
      isNew = identifier;
      identifier = identifierForManager(this);
    }
    let recordData = recordDataFor(this);

    this.isDeprecated(recordData)
      ? recordData.removeFromInverseRelationships(isNew)
      : recordData.removeFromInverseRelationships(identifier, isNew);
  }
  setAttribute(identifier: StableRecordIdentifier, propertyName: string, value: any) {
    let recordData = recordDataFor(this);

    this.isDeprecated(recordData)
      ? recordData.setDirtyAttribute(propertyName, value)
      : recordData.setAttribute(identifier, propertyName, value);
  }
  /* @deprecated */
  setDirtyAttribute(propertyName: string, value: any) {
    let recordData = recordDataFor(this);

    this.isDeprecated(recordData)
      ? recordData.setDirtyAttribute(propertyName, value)
      : recordData.setAttribute(identifierForManager(this), propertyName, value);
  }
  // TODO consider how idx fits into the RFC
  addToHasMany(identifier: StableRecordIdentifier, propertyName: string, value: RecordData[], idx?: number) {
    // called by something V1
    if (!isIdentifier(identifier)) {
      idx = (value as unknown) as number;
      value = (propertyName as unknown) as RecordData[];
      propertyName = (identifier as unknown) as string;
      identifier = identifierForManager(this);
    }
    let recordData = recordDataFor(this);

    this.isDeprecated(recordData)
      ? recordData.addToHasMany(propertyName, value, idx)
      : recordData.addToHasMany(identifier, propertyName, value);
  }
  removeFromHasMany(identifier: StableRecordIdentifier, propertyName: string, value: RecordData[]) {
    // called by something V1
    debugger;
    if (!isIdentifier(identifier)) {
      value = (propertyName as unknown) as RecordData[];
      propertyName = (identifier as unknown) as string;
      identifier = identifierForManager(this);
    }
    let recordData = recordDataFor(this);

    this.isDeprecated(recordData)
      ? recordData.removeFromHasMany(propertyName, value)
      : recordData.removeFromHasMany(identifier, propertyName, value);
  }
  setHasMany(identifier: StableRecordIdentifier, propertyName: string, value: RecordData[]) {
    let recordData = recordDataFor(this);

    this.isDeprecated(recordData)
      ? recordData.setDirtyHasMany(propertyName, value)
      : recordData.setHasMany(identifier, propertyName, value);
  }
  /* @deprecated */
  setDirtyHasMany(propertyName: string, value: RecordData[]) {
    let recordData = recordDataFor(this);

    this.isDeprecated(recordData)
      ? recordData.setDirtyHasMany(propertyName, value)
      : recordData.setHasMany(identifierForManager(this), propertyName, value);
  }

  // Deprecated from V1
  /* @deprecated */
  getHasMany(propertyName: string) {
    let recordData = recordDataFor(this);

    if (this.isDeprecated(recordData)) {
      return recordData.getHasMany(propertyName);
    } else {
      // TODO deprecate this
      // this allows us to have the wrapper act
      // as a singleton.
      let identifier = identifierForManager(this);
      return recordData.getRelationship(identifier, propertyName);
    }
  }
  // Deprecated from V1
  /* @deprecated */
  getBelongsTo(propertyName: string) {
    let recordData = recordDataFor(this);

    if (this.isDeprecated(recordData)) {
      return recordData.getBelongsTo(propertyName);
    } else {
      // TODO deprecate this
      // this allows us to have the wrapper act
      // as a singleton.
      let identifier = identifierForManager(this);
      return recordData.getRelationship(identifier, propertyName);
    }
  }
  // Deprecated from V1
  /* @deprecated */
  getResourceIdentifier() {
    let recordData = recordDataFor(this);

    if (this.isDeprecated(recordData)) {
      return recordData.getResourceIdentifier();
    } else {
      // TODO deprecate this
      // this allows us to have the wrapper act
      // as a singleton.
      return identifierForManager(this);
    }
  }

  // Private Intimate V1 APIs that are also deprecated
  /* @deprecated */
  _initRecordCreateOptions(options: object) {
    let recordData = recordDataFor(this);

    if (this.isDeprecated(recordData)) {
      return recordData._initRecordCreateOptions(options);
    }
  }
}
