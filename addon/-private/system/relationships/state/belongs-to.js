import { Promise as EmberPromise } from 'rsvp';
import { assert, inspect } from '@ember/debug';
import { assertPolymorphicType } from 'ember-data/-debug';
import {
  PromiseObject
} from "../../promise-proxies";
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
      if (this.link) {
        if (this.hasLoaded) {
          promise = this.findRecord();
        } else {
          promise = this.findLink().then(() => this.findRecord());
        }
      } else {
        promise = this.findRecord();
      }

      return PromiseObject.create({
        promise: promise,
        content: this.inverseInternalModel ? this.inverseInternalModel.getRecord() : null
      });
    } else {
      if (this.inverseInternalModel === null) {
        return null;
      }
      let toReturn = this.inverseInternalModel.getRecord();
      assert("You looked up the '" + this.key + "' relationship on a '" + this.internalModel.modelName + "' with id " + this.internalModel.id +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)", toReturn === null || !toReturn.get('isEmpty'));
      return toReturn;
    }
  }

  reload() {
    // TODO handle case when reload() is triggered multiple times

    if (this.link) {
      return this.fetchLink();
    }

    // reload record, if it is already loaded
    if (this.inverseInternalModel && this.inverseInternalModel.hasRecord) {
      return this.inverseInternalModel.getRecord().reload();
    }

    return this.findRecord();
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
