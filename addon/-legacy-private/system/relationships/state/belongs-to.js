import { resolve } from 'rsvp';
import { assert } from '@ember/debug';
import { assertPolymorphicType } from 'ember-data/-debug';
import { PromiseBelongsTo, PromiseObject } from '../../promise-proxies';
import Relationship from './relationship';

export default class BelongsToRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.inverseInternalModel = null;
    this.canonicalState = null;
    this._promiseProxy = null;
  }

  /**
   * Flag indicating whether all inverse records are available
   *
   * true if the inverse exists and is loaded (not empty)
   * true if there is no inverse
   * false if the inverse exists and is not loaded (empty)
   *
   * @property
   * @return {boolean}
   */
  get allInverseRecordsAreLoaded() {
    let internalModel = this.inverseInternalModel;
    let isEmpty = internalModel !== null && internalModel.isEmpty();

    return !isEmpty;
  }

  setInternalModel(internalModel) {
    if (internalModel) {
      this.addInternalModel(internalModel);
    } else if (this.inverseInternalModel) {
      this.removeInternalModel(this.inverseInternalModel);
    }

    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsStale(false);
    this.setRelationshipIsEmpty(false);
  }

  setCanonicalInternalModel(internalModel) {
    if (internalModel) {
      this.addCanonicalInternalModel(internalModel);
    } else if (this.canonicalState) {
      this.removeCanonicalInternalModel(this.canonicalState);
    }
    this.flushCanonicalLater();
  }

  setInitialCanonicalInternalModel(internalModel) {
    if (!internalModel) {
      return;
    }

    // When we initialize a belongsTo relationship, we want to avoid work like
    // notifying our internalModel that we've "changed" and excessive thrash on
    // setting up inverse relationships
    this.canonicalMembers.add(internalModel);
    this.members.add(internalModel);
    this.inverseInternalModel = this.canonicalState = internalModel;
    this.setupInverseRelationship(internalModel);
  }

  addCanonicalInternalModel(internalModel) {
    if (this.canonicalMembers.has(internalModel)) {
      return;
    }

    if (this.canonicalState) {
      this.removeCanonicalInternalModel(this.canonicalState);
    }

    this.canonicalState = internalModel;
    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsEmpty(false);
    super.addCanonicalInternalModel(internalModel);
  }

  inverseDidDematerialize() {
    super.inverseDidDematerialize(this.inverseInternalModel);
    this.notifyBelongsToChange();
  }

  removeCompletelyFromOwn(internalModel) {
    super.removeCompletelyFromOwn(internalModel);

    if (this.canonicalState === internalModel) {
      this.canonicalState = null;
    }

    if (this.inverseInternalModel === internalModel) {
      this.inverseInternalModel = null;
      this.notifyBelongsToChange();
    }
  }

  removeCompletelyFromInverse() {
    super.removeCompletelyFromInverse();

    this.inverseInternalModel = null;
  }

  flushCanonical() {
    //temporary fix to not remove newly created records if server returned null.
    //TODO remove once we have proper diffing
    if (this.inverseInternalModel && this.inverseInternalModel.isNew() && !this.canonicalState) {
      return;
    }
    if (this.inverseInternalModel !== this.canonicalState) {
      this.inverseInternalModel = this.canonicalState;
      this._promiseProxy = null;
      this.notifyBelongsToChange();
    }

    super.flushCanonical();
  }

  addInternalModel(internalModel) {
    if (this.members.has(internalModel)) {
      return;
    }

    assertPolymorphicType(this.internalModel, this.relationshipMeta, internalModel, this.store);

    if (this.inverseInternalModel) {
      this.removeInternalModel(this.inverseInternalModel);
    }

    this.inverseInternalModel = internalModel;
    super.addInternalModel(internalModel);
    this.notifyBelongsToChange();
  }

  setRecordPromise(belongsToPromise) {
    assert(
      'You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.',
      belongsToPromise instanceof PromiseObject
    );

    let content = belongsToPromise.get('content');
    let promise = belongsToPromise.get('promise');

    this.setInternalModel(content ? content._internalModel : content);
    this._updateLoadingPromise(promise, content);
  }

  removeInternalModelFromOwn(internalModel) {
    if (!this.members.has(internalModel)) {
      return;
    }
    this.inverseInternalModel = null;
    this._promiseProxy = null;
    super.removeInternalModelFromOwn(internalModel);
    this.notifyBelongsToChange();
  }

  removeAllInternalModelsFromOwn() {
    super.removeAllInternalModelsFromOwn();
    this.inverseInternalModel = null;
    this._promiseProxy = null;
    this.notifyBelongsToChange();
  }

  notifyBelongsToChange() {
    if (this._promiseProxy !== null) {
      let iM = this.inverseInternalModel;

      this._updateLoadingPromise(proxyRecord(iM), iM ? iM.getRecord() : null);
    }

    this.internalModel.notifyBelongsToChange(this.key);
  }

  removeCanonicalInternalModelFromOwn(internalModel) {
    if (!this.canonicalMembers.has(internalModel)) {
      return;
    }
    this.canonicalState = null;
    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsEmpty(true);
    super.removeCanonicalInternalModelFromOwn(internalModel);
  }

  removeAllCanonicalInternalModelsFromOwn() {
    super.removeAllCanonicalInternalModelsFromOwn();
    this.canonicalState = null;
  }

  // called by `getData()` when a request is needed
  //   but no link is available
  _fetchRecord() {
    let { inverseInternalModel, shouldForceReload } = this;

    if (inverseInternalModel) {
      let promise;

      if (shouldForceReload && !inverseInternalModel.isEmpty() && inverseInternalModel.hasRecord) {
        // reload record, if it is already loaded
        //   if we have a link, we would already be in `findLink()`
        promise = inverseInternalModel.getRecord().reload();
      } else {
        promise = this.store._findByInternalModel(inverseInternalModel);
      }

      return promise;
    }

    // TODO is this actually an error case?
    return resolve(null);
  }

  // called by `getData()` when a request is needed
  //   and a link is available
  _fetchLink() {
    return this.store
      .findBelongsTo(this.internalModel, this.link, this.relationshipMeta)
      .then(internalModel => {
        if (internalModel) {
          this.addInternalModel(internalModel);
        }
        return internalModel;
      });
  }

  getData() {
    //TODO(Igor) flushCanonical here once our syncing is not stupid
    let record = this.inverseInternalModel ? this.inverseInternalModel.getRecord() : null;

    if (this.shouldMakeRequest()) {
      let promise;

      if (this.link) {
        promise = this._fetchLink();
      } else {
        promise = this._fetchRecord();
      }

      promise = promise.then(() => handleCompletedFind(this), e => handleCompletedFind(this, e));

      promise = promise.then(internalModel => {
        return internalModel ? internalModel.getRecord() : null;
      });

      this.fetchPromise = promise;
      this._updateLoadingPromise(promise);
    }

    if (this.isAsync) {
      if (this._promiseProxy === null) {
        let promise = proxyRecord(this.inverseInternalModel);
        this._updateLoadingPromise(promise, record);
      }

      return this._promiseProxy;
    } else {
      assert(
        "You looked up the '" +
          this.key +
          "' relationship on a '" +
          this.internalModel.modelName +
          "' with id " +
          this.internalModel.id +
          ' but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)',
        record === null || !record.get('isEmpty') || this.shouldForceReload
      );
      return record;
    }
  }

  _createProxy(promise, content) {
    return PromiseBelongsTo.create({
      _belongsToState: this,
      promise,
      content,
    });
  }

  updateData(data, initial) {
    let internalModel = this.store._pushResourceIdentifier(this, data);
    if (initial) {
      this.setInitialCanonicalInternalModel(internalModel);
    } else {
      this.setCanonicalInternalModel(internalModel);
    }
  }
}

function proxyRecord(internalModel) {
  let promise = internalModel;
  if (internalModel && internalModel.isLoading()) {
    promise = internalModel._promiseProxy;
  }

  return resolve(promise).then(resolvedInternalModel => {
    return resolvedInternalModel ? resolvedInternalModel.getRecord() : null;
  });
}

function handleCompletedFind(relationship, error) {
  let internalModel = relationship.inverseInternalModel;

  relationship.fetchPromise = null;
  relationship.setShouldForceReload(false);

  if (error) {
    relationship.setHasFailedLoadAttempt(true);
    throw error;
  }

  relationship.setHasFailedLoadAttempt(false);
  // only set to not stale if no error is thrown
  relationship.setRelationshipIsStale(false);

  return internalModel;
}
