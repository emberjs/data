import { assert, inspect } from '@ember/debug';
import { isNone } from '@ember/utils';
import { DEBUG } from '@glimmer/env';

import { assertPolymorphicType } from '@ember-data/store/-debug';
import { identifierCacheFor } from '@ember-data/store/-private';

import Relationship, { isNew } from './relationship';

type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type ExistingResourceIdentifierObject = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').ExistingResourceIdentifierObject;
type RelationshipSchema = import('@ember-data/store/-private/ts-interfaces/record-data-schemas').RelationshipSchema;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type DefaultSingleResourceRelationship = import('../../ts-interfaces/relationship-record-data').DefaultSingleResourceRelationship;

export default class BelongsToRelationship extends Relationship {
  declare inverseRecordData: StableRecordIdentifier | null;
  declare canonicalState: StableRecordIdentifier | null;

  constructor(
    store: RecordDataStoreWrapper,
    inverseKey: string | null,
    relationshipMeta: RelationshipSchema,
    identifier: StableRecordIdentifier,
    inverseIsAsync: boolean
  ) {
    super(store, inverseKey, relationshipMeta, identifier, inverseIsAsync);
    this.inverseRecordData = null;
    this.canonicalState = null;
  }

  setRecordData(recordData: StableRecordIdentifier | null) {
    if (recordData) {
      this.addRecordData(recordData);
    } else if (this.inverseRecordData) {
      this.removeRecordData(this.inverseRecordData);
    }

    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsStale(false);
    this.setRelationshipIsEmpty(false);
  }

  setCanonicalRecordData(recordData: StableRecordIdentifier) {
    if (recordData) {
      this.addCanonicalRecordData(recordData);
    } else if (this.canonicalState) {
      this.removeCanonicalRecordData(this.canonicalState);
    }
    this.flushCanonicalLater();
  }

  addCanonicalRecordData(recordData: StableRecordIdentifier) {
    if (this.canonicalMembers.has(recordData)) {
      return;
    }

    if (this.canonicalState) {
      this.removeCanonicalRecordData(this.canonicalState);
    }

    this.canonicalState = recordData;
    super.addCanonicalRecordData(recordData);
    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsEmpty(false);
  }

  inverseDidDematerialize() {
    super.inverseDidDematerialize(this.inverseRecordData);
    this.notifyBelongsToChange();
  }

  removeCompletelyFromOwn(recordData: StableRecordIdentifier) {
    super.removeCompletelyFromOwn(recordData);

    if (this.canonicalState === recordData) {
      this.canonicalState = null;
    }

    if (this.inverseRecordData === recordData) {
      this.inverseRecordData = null;
      this.notifyBelongsToChange();
    }
  }
  removeCompletelyFromInverse() {
    super.removeCompletelyFromInverse();

    this.inverseRecordData = null;
  }

  flushCanonical() {
    //temporary fix to not remove newly created records if server returned null.
    //TODO remove once we have proper diffing
    if (this.inverseRecordData && isNew(this.inverseRecordData) && !this.canonicalState) {
      this.willSync = false;
      return;
    }
    if (this.inverseRecordData !== this.canonicalState) {
      this.inverseRecordData = this.canonicalState;
      this.notifyBelongsToChange();
    }
    super.flushCanonical();
  }

  addRecordData(recordData: StableRecordIdentifier) {
    if (this.members.has(recordData)) {
      return;
    }

    // TODO @runspired can we just delete this now?
    if (DEBUG && this.relationshipMeta.type !== this.recordData.type) {
      assertPolymorphicType(
        this.store.recordDataFor(this.recordData.type, this.recordData.id, this.recordData.lid),
        this.relationshipMeta,
        this.store.recordDataFor(recordData.type, recordData.id, recordData.lid),
        this.store._store
      );
    }

    if (this.inverseRecordData) {
      this.removeRecordData(this.inverseRecordData);
    }

    this.inverseRecordData = recordData;
    super.addRecordData(recordData);
    this.notifyBelongsToChange();
  }

  removeRecordDataFromOwn(recordData: StableRecordIdentifier) {
    if (!this.members.has(recordData)) {
      return;
    }
    this.inverseRecordData = null;
    super.removeRecordDataFromOwn(recordData);
    this.notifyBelongsToChange();
  }

  removeAllRecordDatasFromOwn() {
    super.removeAllRecordDatasFromOwn();
    this.inverseRecordData = null;
    this.notifyBelongsToChange();
  }

  notifyBelongsToChange() {
    let recordData = this.recordData;
    this.store.notifyBelongsToChange(recordData.type, recordData.id, recordData.lid, this.key);
  }

  removeCanonicalRecordDataFromOwn(recordData: StableRecordIdentifier, idx?: number) {
    if (!this.canonicalMembers.has(recordData)) {
      return;
    }
    this.canonicalState = null;
    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsEmpty(true);
    super.removeCanonicalRecordDataFromOwn(recordData, idx);
  }

  removeAllCanonicalRecordDatasFromOwn() {
    super.removeAllCanonicalRecordDatasFromOwn();
    this.canonicalState = null;
  }

  getData(): DefaultSingleResourceRelationship {
    let data;
    let payload: any = {};
    if (this.inverseRecordData) {
      data = this.inverseRecordData;
    }
    if (this.inverseRecordData === null && this.hasAnyRelationshipData) {
      data = null;
    }
    if (this.links) {
      payload.links = this.links;
    }
    if (data !== undefined) {
      payload.data = data;
    }
    if (this.meta) {
      payload.meta = this.meta;
    }

    payload._relationship = this;
    return payload;
  }

  updateData(data: ExistingResourceIdentifierObject) {
    let recordData;
    if (isNone(data)) {
      recordData = null;
    }
    assert(
      `Ember Data expected the data for the ${
        this.key
      } relationship on a ${this.recordData.toString()} to be in a JSON API format and include an \`id\` and \`type\` property but it found ${inspect(
        data
      )}. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
      data === null || (data.id !== undefined && data.type !== undefined)
    );

    if (recordData !== null) {
      recordData = identifierCacheFor(this.store._store).getOrCreateRecordIdentifier(data);
    }
    this.setCanonicalRecordData(recordData);
  }
}
