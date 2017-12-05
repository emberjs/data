import { assert, inspect } from '@ember/debug';
import { assertPolymorphicType } from 'ember-data/-debug';
import Relationship from "./relationship";

export default class BelongsToRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.internalModel = internalModel;
    this.key = relationshipMeta.key;
    this.inverseInternalModel = null;
    this.canonicalState = null;
  }

  setInternalModel(internalModel) {
    if (internalModel) {
      this.addInternalModel(internalModel);
    } else if (this.inverseInternalModel) {
      this.removeInternalModel(this.inverseInternalModel);
    }
    this.setHasData(true);
    this.setHasLoaded(true);
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

    // TALK TO DAVID, I've had to do weird things here
    this.canonicalState = internalModel;
    super.addCanonicalInternalModel(internalModel);
  }

  inverseDidDematerialize() {
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
    // TODO IGOR move to canonical?
    this.updatedLink = false;
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

  notifyBelongsToChanged() {
    this.internalModel.notifyBelongsToChanged(this.key);
  }

  removeCanonicalInternalModelFromOwn(internalModel) {
    if (!this.canonicalMembers.has(internalModel)) { return;}
    this.canonicalState = null;
    super.removeCanonicalInternalModelFromOwn(internalModel);
  }

  getData() {
    let data;
    let payload = {};
    if (this.inverseInternalModel) {
      data = this.inverseInternalModel._modelData.getResourceIdentifier();
    }
    if (this.inverseInternalModel === null && this.hasData) {
      data = null;
    }
    if (this.link) {
      payload.links = {
        related: this.link
      }
    }
    if (data !== undefined) {
      payload.data = data;
    }
    if (!payload.data && !payload.links) {
      payload = null;
    }
    // if link has been updated, we can't trust the local data anymore
    // TODO IGOR check for local changes
    if (this.updatedLink && this.link) {
      delete payload.data;
    }
    return payload;
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
