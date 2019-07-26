import { assert, inspect } from '@ember/debug';
import { assertPolymorphicType } from 'ember-data/-debug';
import { isNone } from '@ember/utils';
import Relationship from './relationship';
import { RelationshipRecordData } from "../../../ts-interfaces/relationship-record-data";
import { JsonApiBelongsToRelationship, JsonApiResourceIdentity } from "../../../ts-interfaces/record-data-json-api";
import { RelationshipSchema } from "../../../ts-interfaces/record-data-schemas";

/**
  @module @ember-data/store
*/

export default class BelongsToRelationship extends Relationship {

  inverseRecordData: RelationshipRecordData | null;
  canonicalState: RelationshipRecordData | null;
  key: string;

  constructor(store: any, inverseKey: string, relationshipMeta: RelationshipSchema, recordData: RelationshipRecordData, inverseIsAsync: boolean) {
    super(store, inverseKey, relationshipMeta, recordData, inverseIsAsync);
    this.key = relationshipMeta.key;
    this.inverseRecordData = null;
    this.canonicalState = null;
    this.key = relationshipMeta.key;
  }

  setRecordData(recordData: RelationshipRecordData) {
    if (recordData) {
      this.addRecordData(recordData);
    } else if (this.inverseRecordData) {
      this.removeRecordData(this.inverseRecordData);
    }

    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsStale(false);
    this.setRelationshipIsEmpty(false);
  }

  setCanonicalRecordData(recordData: RelationshipRecordData) {
    if (recordData) {
      this.addCanonicalRecordData(recordData);
    } else if (this.canonicalState) {
      this.removeCanonicalRecordData(this.canonicalState);
    }
    this.flushCanonicalLater();
  }

  setInitialCanonicalRecordData(recordData: RelationshipRecordData) {
    if (!recordData) {
      return;
    }

    // When we initialize a belongsTo relationship, we want to avoid work like
    // notifying our internalModel that we've "changed" and excessive thrash on
    // setting up inverse relationships
    this.canonicalMembers.add(recordData);
    this.members.add(recordData);
    this.inverseRecordData = this.canonicalState = recordData;
    this.setupInverseRelationship(recordData);
  }

  addCanonicalRecordData(recordData: RelationshipRecordData) {
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

  removeCompletelyFromOwn(recordData: RelationshipRecordData) {
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
    if (this.inverseRecordData && this.inverseRecordData.isNew() && !this.canonicalState) {
      this.willSync = false;
      return;
    }
    if (this.inverseRecordData !== this.canonicalState) {
      this.inverseRecordData = this.canonicalState;
      this.notifyBelongsToChange();
    }
    super.flushCanonical();
  }

  addRecordData(recordData: RelationshipRecordData) {
    if (this.members.has(recordData)) {
      return;
    }

    // TODO Igor cleanup
    assertPolymorphicType(this.recordData, this.relationshipMeta, recordData, this.store);

    if (this.inverseRecordData) {
      this.removeRecordData(this.inverseRecordData);
    }

    this.inverseRecordData = recordData;
    super.addRecordData(recordData);
    this.notifyBelongsToChange();
  }

  removeRecordDataFromOwn(recordData: RelationshipRecordData) {
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
    let storeWrapper = this.recordData.storeWrapper;
    storeWrapper.notifyBelongsToChange(
      recordData.modelName,
      recordData.id,
      recordData.clientId,
      this.key
    );
  }

  removeCanonicalRecordDataFromOwn(recordData: RelationshipRecordData) {
    if (!this.canonicalMembers.has(recordData)) {
      return;
    }
    this.canonicalState = null;
    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsEmpty(true);
    super.removeCanonicalRecordDataFromOwn(recordData);
  }

  removeAllCanonicalRecordDatasFromOwn() {
    super.removeAllCanonicalRecordDatasFromOwn();
    this.canonicalState = null;
  }

  getData(): JsonApiBelongsToRelationship {
    let data;
    let payload: any = {};
    if (this.inverseRecordData) {
      data = this.inverseRecordData.getResourceIdentifier();
    }
    if (this.inverseRecordData === null && this.hasAnyRelationshipData) {
      data = null;
    }
    if (this.link) {
      payload.links = {
        related: this.link,
      };
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

  /**
   * Flag indicating whether all inverse records are available
   *
   * true if the inverse exists and is loaded (not empty)
   * true if there is no inverse
   * false if the inverse exists and is not loaded (empty)
   *
   * @return {boolean}
   */
  get allInverseRecordsAreLoaded(): boolean {
    let recordData = this.inverseRecordData;
    let isEmpty = recordData !== null && recordData.isEmpty();

    return !isEmpty;
  }

  updateData(data: JsonApiResourceIdentity, initial: boolean) {
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
      recordData = this.recordData.storeWrapper.recordDataFor(data.type, (data.id as string));
    }
    if (initial) {
      this.setInitialCanonicalRecordData(recordData);
    } else {
      this.setCanonicalRecordData(recordData);
    }
  }
}
