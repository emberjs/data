import { assert, inspect } from '@ember/debug';
import { assertPolymorphicType } from 'ember-data/-debug';
import { isNone } from '@ember/utils';
import Relationship from './relationship';

export default class BelongsToRelationship extends Relationship {
  constructor(store, inverseKey, relationshipMeta, modelData, inverseIsAsync) {
    super(store, inverseKey, relationshipMeta, modelData, inverseIsAsync);
    this.key = relationshipMeta.key;
    this.inverseModelData = null;
    this.canonicalState = null;
  }

  setModelData(modelData) {
    if (modelData) {
      this.addModelData(modelData);
    } else if (this.inverseModelData) {
      this.removeModelData(this.inverseModelData);
    }

    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsStale(false);
    this.setRelationshipIsEmpty(false);
  }

  setCanonicalModelData(modelData) {
    if (modelData) {
      this.addCanonicalModelData(modelData);
    } else if (this.canonicalState) {
      this.removeCanonicalModelData(this.canonicalState);
    }
    this.flushCanonicalLater();
  }

  setInitialCanonicalModelData(modelData) {
    if (!modelData) {
      return;
    }

    // When we initialize a belongsTo relationship, we want to avoid work like
    // notifying our internalModel that we've "changed" and excessive thrash on
    // setting up inverse relationships
    this.canonicalMembers.add(modelData);
    this.members.add(modelData);
    this.inverseModelData = this.canonicalState = modelData;
    this.setupInverseRelationship(modelData);
  }

  addCanonicalModelData(modelData) {
    if (this.canonicalMembers.has(modelData)) {
      return;
    }

    if (this.canonicalState) {
      this.removeCanonicalModelData(this.canonicalState);
    }

    this.canonicalState = modelData;
    super.addCanonicalModelData(modelData);
    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsEmpty(false);
  }

  inverseDidDematerialize() {
    super.inverseDidDematerialize(this.inverseModelData);
    this.notifyBelongsToChanged();
  }

  removeCompletelyFromOwn(modelData) {
    super.removeCompletelyFromOwn(modelData);

    if (this.canonicalState === modelData) {
      this.canonicalState = null;
    }

    if (this.inverseModelData === modelData) {
      this.inverseModelData = null;
      this.notifyBelongsToChanged();
    }
  }

  removeCompletelyFromInverse() {
    super.removeCompletelyFromInverse();

    this.inverseModelData = null;
  }

  flushCanonical() {
    //temporary fix to not remove newly created records if server returned null.
    //TODO remove once we have proper diffing
    if (this.inverseModelData && this.inverseModelData.isNew() && !this.canonicalState) {
      this.willSync = false;
      return;
    }
    if (this.inverseModelData !== this.canonicalState) {
      this.inverseModelData = this.canonicalState;
      this.notifyBelongsToChanged();
    }
    super.flushCanonical();
  }

  addModelData(modelData) {
    if (this.members.has(modelData)) {
      return;
    }

    // TODO Igor cleanup
    assertPolymorphicType(this.modelData, this.relationshipMeta, modelData, this.store);

    if (this.inverseModelData) {
      this.removeModelData(this.inverseModelData);
    }

    this.inverseModelData = modelData;
    super.addModelData(modelData);
    this.notifyBelongsToChanged();
  }

  setRecordPromise(newPromise) {
    let content = newPromise.get && newPromise.get('content');
    assert(
      'You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.',
      content !== undefined
    );
    // TODO Igor deal with this
    this.setModelData(content ? content._internalModel._modelData : content);
  }

  removeModelDataFromOwn(modelData) {
    if (!this.members.has(modelData)) {
      return;
    }
    this.inverseModelData = null;
    super.removeModelDataFromOwn(modelData);
    this.notifyBelongsToChanged();
  }

  removeAllModelDatasFromOwn() {
    super.removeAllModelDatasFromOwn();
    this.inverseModelData = null;
    this.notifyBelongsToChanged();
  }

  notifyBelongsToChanged() {
    let modelData = this.modelData;
    let storeWrapper = this.modelData.storeWrapper;
    storeWrapper.notifyBelongsToChanged(
      modelData.modelName,
      modelData.id,
      modelData.clientId,
      this.key
    );
  }

  removeCanonicalModelDataFromOwn(modelData) {
    if (!this.canonicalMembers.has(modelData)) {
      return;
    }
    this.canonicalState = null;
    /*
      This isn't exactly correct because another record's payload
      may tell us that this relationship is no longer correct
      but that is not enough to tell us that this relationship is
      now empty for sure. Likely we should be stale here but
      that is probably a breaking change.

        - @runspired
    */
    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsEmpty(true);
    super.removeCanonicalModelDataFromOwn(modelData);
  }

  removeAllCanonicalModelDatasFromOwn() {
    super.removeAllCanonicalModelDatasFromOwn();
    this.canonicalState = null;
  }

  getData() {
    let data;
    let payload = {};
    if (this.inverseModelData) {
      data = this.inverseModelData.getResourceIdentifier();
    }
    if (this.inverseModelData === null && this.hasAnyRelationshipData) {
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
   * @returns {boolean}
   */
  get allInverseRecordsAreLoaded() {
    let modelData = this.inverseModelData;
    let isEmpty = modelData !== null && modelData.isEmpty();

    return !isEmpty;
  }

  updateData(data, initial) {
    let modelData;
    if (isNone(data)) {
      modelData = null;
    }
    assert(
      `Ember Data expected the data for the ${
        this.key
      } relationship on a ${this.modelData.toString()} to be in a JSON API format and include an \`id\` and \`type\` property but it found ${inspect(
        data
      )}. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
      data === null || (data.id !== undefined && data.type !== undefined)
    );

    if (modelData !== null) {
      modelData = this.modelData.storeWrapper.modelDataFor(data.type, data.id);
    }
    if (initial) {
      this.setInitialCanonicalModelData(modelData);
    } else {
      this.setCanonicalModelData(modelData);
    }
  }
}
