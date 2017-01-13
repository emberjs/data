import Ember from 'ember';
import { assert } from "ember-data/-private/debug";
import {
  PromiseObject
} from "ember-data/-private/system/promise-proxies";

import { assertPolymorphicType } from "ember-data/-private/debug";
import Relationship from "ember-data/-private/system/relationships/state/relationship";

export default class BelongsToRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.internalModel = internalModel;
    this.key = relationshipMeta.key;
    this.inverseInternalModel = null;
    this.canonicalState = null;
  }

  setInverse(newInverse) {
    if (newInverse) {
      this.addInverse(newInverse);
    } else if (this.inverseInternalModel) {
      this.removeInverse(this.inverseInternalModel);
    }
    this.setHasData(true);
    this.setHasLoaded(true);
  }

  setCanonicalInverse(newInverse) {
    if (newInverse) {
      this.addCanonicalInverse(newInverse);
    } else if (this.canonicalState) {
      this.removeCanonicalInverse(this.canonicalState);
    }
    this.flushCanonicalLater();
  }

  addCanonicalInverse(newInverse) {
    if (this.canonicalMembers.has(newInverse)) { return;}

    if (this.canonicalState) {
      this.removeCanonicalInverse(this.canonicalState);
    }

    this.canonicalState = newInverse;
    super.addCanonicalInverse(newInverse);
  }

  flushCanonical() {
    //temporary fix to not remove newly created records if server returned null.
    //TODO remove once we have proper diffing
    if (this.inverseInternalModel && this.inverseInternalModel.isNew() && !this.canonicalState) {
      return;
    }
    if (this.inverseInternalModel !== this.canonicalState) {
      this.inverseInternalModel = this.canonicalState;
      this.internalModel.notifyBelongsToChanged(this.key);
    }

    super.flushCanonical();
  }

  addInverse(newInverse) {
    if (this.members.has(newInverse)) { return; }

    assertPolymorphicType(this.internalModel, this.relationshipMeta, newInverse);

    if (this.inverseInternalModel) {
      this.removeInverse(this.inverseInternalModel);
    }

    this.inverseInternalModel = newInverse;
    super.addInverse(newInverse);
    this.internalModel.notifyBelongsToChanged(this.key);
  }

  setInversePromise(newPromise) {
    var content = newPromise.get && newPromise.get('content');
    assert("You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.", content !== undefined);
    this.setInverse(content ? content._internalModel : content);
  }

  removeInverseFromOwn(record) {
    if (!this.members.has(record)) { return;}
    this.inverseInternalModel = null;
    super.removeInverseFromOwn(record);
    this.internalModel.notifyBelongsToChanged(this.key);
  }

  removeCanonicalInverseFromOwn(record) {
    if (!this.canonicalMembers.has(record)) { return;}
    this.canonicalState = null;
    super.removeCanonicalInverseFromOwn(record);
  }

  findInverse() {
    if (this.inverseInternalModel) {
      return this.store._findByInternalModel(this.inverseInternalModel);
    } else {
      return Ember.RSVP.Promise.resolve(null);
    }
  }

  fetchLink() {
    return this.store.findBelongsTo(this.internalModel, this.link, this.relationshipMeta).then((record) => {
      if (record) {
        this.addInverse(record);
      }
      return record;
    });
  }

  getInverse() {
    //TODO(Igor) flushCanonical here once our syncing is not stupid
    if (this.isAsync) {
      var promise;
      if (this.link) {
        if (this.hasLoaded) {
          promise = this.findInverse();
        } else {
          promise = this.findLink().then(() => this.findInverse());
        }
      } else {
        promise = this.findInverse();
      }

      return PromiseObject.create({
        promise: promise,
        content: this.inverseInternalModel ? this.inverseInternalModel.getRecord() : null
      });
    } else {
      if (this.inverseInternalModel === null) {
        return null;
      }
      var toReturn = this.inverseInternalModel.getRecord();
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
      return this.inverseInternalModel.record.reload();
    }

    return this.findInverse();
  }

  updateData(data) {
    let internalModel = this.store._pushResourceIdentifier(this, data);
    this.setCanonicalInverse(internalModel);
  }
}
