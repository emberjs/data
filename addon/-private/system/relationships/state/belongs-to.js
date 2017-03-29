import Ember from 'ember';
import {
  assertPolymorphicType,
  assert
} from "ember-data/-private/debug";
import {
  PromiseObject
} from "../../promise-proxies";
import Relationship from "./relationship";

export default class BelongsToRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.internalModel = internalModel;
    this.key = relationshipMeta.key;
    this.inverseRecord = null;
    this.canonicalState = null;
  }

  setRecord(newRecord) {
    if (newRecord) {
      this.addRecord(newRecord);
    } else if (this.inverseRecord) {
      this.removeRecord(this.inverseRecord);
    }
    this.setHasData(true);
    this.setHasLoaded(true);
  }

  setCanonicalRecord(newRecord) {
    if (newRecord) {
      this.addCanonicalRecord(newRecord);
    } else if (this.canonicalState) {
      this.removeCanonicalRecord(this.canonicalState);
    }
    this.flushCanonicalLater();
  }

  setInitialCanonicalRecord(record) {
    if (!record) { return; }

    // When we initialize a belongsTo relationship, we want to avoid work like
    // notifying our internalModel that we've "changed" and excessive thrash on
    // setting up inverse relationships
    this.canonicalMembers.add(record);
    this.members.add(record);
    this.inverseRecord = this.canonicalState = record;
    this.setupInverseRelationship(record);
  }

  addCanonicalRecord(newRecord) {
    if (this.canonicalMembers.has(newRecord)) { return;}

    if (this.canonicalState) {
      this.removeCanonicalRecord(this.canonicalState);
    }

    this.canonicalState = newRecord;
    super.addCanonicalRecord(newRecord);
  }

  inverseDidDematerialize() {
    this.notifyBelongsToChanged();
  }

  flushCanonical() {
    //temporary fix to not remove newly created records if server returned null.
    //TODO remove once we have proper diffing
    if (this.inverseRecord && this.inverseRecord.isNew() && !this.canonicalState) {
      return;
    }
    if (this.inverseRecord !== this.canonicalState) {
      this.inverseRecord = this.canonicalState;
      this.notifyBelongsToChanged();
    }

    super.flushCanonical();
  }

  addRecord(newRecord) {
    if (this.members.has(newRecord)) { return; }

    assertPolymorphicType(this.internalModel, this.relationshipMeta, newRecord);

    if (this.inverseRecord) {
      this.removeRecord(this.inverseRecord);
    }

    this.inverseRecord = newRecord;
    super.addRecord(newRecord);
    this.notifyBelongsToChanged();
  }

  setRecordPromise(newPromise) {
    let content = newPromise.get && newPromise.get('content');
    assert("You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.", content !== undefined);
    this.setRecord(content ? content._internalModel : content);
  }

  removeRecordFromOwn(record) {
    if (!this.members.has(record)) { return;}
    this.inverseRecord = null;
    super.removeRecordFromOwn(record);
    this.notifyBelongsToChanged();
  }

  notifyBelongsToChanged() {
    this.internalModel.notifyBelongsToChanged(this.key);
  }

  removeCanonicalRecordFromOwn(record) {
    if (!this.canonicalMembers.has(record)) { return;}
    this.canonicalState = null;
    super.removeCanonicalRecordFromOwn(record);
  }

  findRecord() {
    if (this.inverseRecord) {
      return this.store._findByInternalModel(this.inverseRecord);
    } else {
      return Ember.RSVP.Promise.resolve(null);
    }
  }

  fetchLink() {
    return this.store.findBelongsTo(this.internalModel, this.link, this.relationshipMeta).then((record) => {
      if (record) {
        this.addRecord(record);
      }
      return record;
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
        content: this.inverseRecord ? this.inverseRecord.getRecord() : null
      });
    } else {
      if (this.inverseRecord === null) {
        return null;
      }
      let toReturn = this.inverseRecord.getRecord();
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
    if (this.inverseRecord && this.inverseRecord.hasRecord) {
      return this.inverseRecord.getRecord().reload();
    }

    return this.findRecord();
  }

  updateData(data, initial) {
    assert(`Ember Data expected the data for the ${this.key} relationship on a ${this.internalModel.toString()} to be in a JSON API format and include an \`id\` and \`type\` property but it found ${Ember.inspect(data)}. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`, data === null || data.id !== undefined && data.type !== undefined);
    let internalModel = this.store._pushResourceIdentifier(this, data);
    if (initial) {
      this.setInitialCanonicalRecord(internalModel);
    } else {
      this.setCanonicalRecord(internalModel);
    }
  }
}
