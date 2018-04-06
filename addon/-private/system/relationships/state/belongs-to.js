import { Promise as EmberPromise } from 'rsvp';
import { assert, inspect } from '@ember/debug';
import { assertPolymorphicType } from 'ember-data/-debug';
import {
  PromiseBelongsTo
} from "../../promise-proxies";
import Relationship from "./relationship";

export default class BelongsToRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.inverseInternalModel = null;
    this.canonicalState = null;
    this._loadingPromise = null;
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
    this.setHasRelatedResources(!this.localStateIsEmpty());
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
    if (!internalModel) { return; }

    // When we initialize a belongsTo relationship, we want to avoid work like
    // notifying our internalModel that we've "changed" and excessive thrash on
    // setting up inverse relationships
    this.canonicalMembers.add(internalModel);
    this.members.add(internalModel);
    this.inverseInternalModel = this.canonicalState = internalModel;
    this.setupInverseRelationship(internalModel);
  }

  addCanonicalInternalModel(internalModel) {
    if (this.canonicalMembers.has(internalModel)) { return;}

    if (this.canonicalState) {
      this.removeCanonicalInternalModel(this.canonicalState);
    }

    this.canonicalState = internalModel;
    super.addCanonicalInternalModel(internalModel);
  }

  inverseDidDematerialize() {
    super.inverseDidDematerialize(this.inverseInternalModel);
    this.notifyBelongsToChanged();
  }

  removeCompletelyFromOwn(internalModel) {
    super.removeCompletelyFromOwn(internalModel);

    if (this.canonicalState === internalModel) {
      this.canonicalState = null;
    }

    if (this.inverseInternalModel === internalModel) {
      this.inverseInternalModel = null;
      this.notifyBelongsToChanged();
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
      this.notifyBelongsToChanged();
    }

    super.flushCanonical();
  }

  addInternalModel(internalModel) {
    if (this.members.has(internalModel)) { return; }

    assertPolymorphicType(this.internalModel, this.relationshipMeta, internalModel);

    if (this.inverseInternalModel) {
      this.removeInternalModel(this.inverseInternalModel);
    }

    this.inverseInternalModel = internalModel;
    super.addInternalModel(internalModel);
    this.notifyBelongsToChanged();
  }

  setRecordPromise(newPromise) {
    let content = newPromise.get && newPromise.get('content');
    assert("You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.", content !== undefined);
    this.setInternalModel(content ? content._internalModel : content);
  }

  removeInternalModelFromOwn(internalModel) {
    if (!this.members.has(internalModel)) { return;}
    this.inverseInternalModel = null;
    super.removeInternalModelFromOwn(internalModel);
    this.notifyBelongsToChanged();
  }

  removeAllInternalModelsFromOwn() {
    super.removeAllInternalModelsFromOwn();
    this.inverseInternalModel = null;
    this.notifyBelongsToChanged();
  }

  notifyBelongsToChanged() {
    this.internalModel.notifyBelongsToChanged(this.key);
  }

  removeCanonicalInternalModelFromOwn(internalModel) {
    if (!this.canonicalMembers.has(internalModel)) { return;}
    this.canonicalState = null;
    super.removeCanonicalInternalModelFromOwn(internalModel);
  }

  removeAllCanonicalInternalModelsFromOwn() {
    super.removeAllCanonicalInternalModelsFromOwn();
    this.canonicalState = null;
  }

  findRecord() {
    if (this.inverseInternalModel) {
      return this.store._findByInternalModel(this.inverseInternalModel);
    } else {
      return EmberPromise.resolve(null);
    }
  }

  fetchLink() {
    return this.store.findBelongsTo(this.internalModel, this.link, this.relationshipMeta).then((internalModel) => {
      if (internalModel) {
        this.addInternalModel(internalModel);
      }
      return internalModel;
    });
  }

  getRecord() {
    //TODO(Igor) flushCanonical here once our syncing is not stupid
    if (this.isAsync) {
      let promise;

      if (this._shouldFindViaLink()) {
        promise = this.findLink().then(() => this.findRecord());
      } else {
        promise = this.findRecord();
      }

      let record = this.inverseInternalModel ? this.inverseInternalModel.getRecord() : null

      return this._updateLoadingPromise(promise, record);
    } else {
      if (this.inverseInternalModel === null) {
        return null;
      }
      let toReturn = this.inverseInternalModel.getRecord();
      assert("You looked up the '" + this.key + "' relationship on a '" + this.internalModel.modelName + "' with id " + this.internalModel.id +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)", toReturn === null || !toReturn.get('isEmpty'));
      return toReturn;
    }
  }

  _updateLoadingPromise(promise, content) {
    if (this._loadingPromise) {
      if (content) {
        this._loadingPromise.set('content', content)
      }
      this._loadingPromise.set('promise', promise)
    } else {
      this._loadingPromise = PromiseBelongsTo.create({
        _belongsToState: this,
        promise,
        content
      });
    }

    return this._loadingPromise;
  }

  reload() {
    // we've already fired off a request
    if (this._loadingPromise) {
      if (this._loadingPromise.get('isPending')) {
        return this._loadingPromise;
      }
    }

    let promise;
    this.setRelationshipIsStale(true);

    if (this.link) {
      promise = this.fetchLink();
    } else if (this.inverseInternalModel && this.inverseInternalModel.hasRecord) {
      // reload record, if it is already loaded
      promise = this.inverseInternalModel.getRecord().reload();
    } else {
      promise = this.findRecord();
    }

    return this._updateLoadingPromise(promise);
  }

  localStateIsEmpty() {
    let internalModel = this.inverseInternalModel;

    return !internalModel  || internalModel.isEmpty();
  }

  updateData(data, initial) {
    assert(`Ember Data expected the data for the ${this.key} relationship on a ${this.internalModel.toString()} to be in a JSON API format and include an \`id\` and \`type\` property but it found ${inspect(data)}. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`, data === null || data.id !== undefined && data.type !== undefined);
    let internalModel = this.store._pushResourceIdentifier(this, data);
    if (initial) {
      this.setInitialCanonicalInternalModel(internalModel);
    } else {
      this.setCanonicalInternalModel(internalModel);
    }
  }
}
