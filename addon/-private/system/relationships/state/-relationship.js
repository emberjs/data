import { warn, assert } from 'ember-data/-private/debug';
import Ember from 'ember';
import { PromiseObject } from 'ember-data/-private/system/promise-proxies';
import { assertPolymorphicType } from 'ember-data/-private/debug';
import _normalizeLink from "ember-data/-private/system/normalize-link";

export default class Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    this.store = store;
    this.internalModel = internalModel;

    this.key = relationshipMeta.key;
    this.inverseKey = inverseKey;
    this.inverseKeyForImplicit = this.internalModel.modelName + this.key;

    this.relationshipMeta = relationshipMeta;
    this.canonicalState = null;
    this.currentState = null;

    this.link = null;
    this.meta = null;

    this.linkPromise = null;

    /*
     `hasData` for a relationship is a flag to indicate if we consider the
     content of this relationship "known". Snapshots uses this to tell the
     difference between unknown (`undefined`) or empty (`null`). The reason for
     this is that we wouldn't want to serialize unknown relationships as `null`
     as that might overwrite remote state.

     All relationships for a newly created (`store.createRecord()`) are
     considered known (`hasData === true`).
     */
    this.hasData = false;

    /*
     `hasLoaded` is a flag to indicate if we have gotten data from the adapter or
     not when the relationship has a link.

     This is used to be able to tell when to fetch the link and when to return
     the local data in scenarios where the local state is considered known
     (`hasData === true`).

     Updating the link will automatically set `hasLoaded` to `false`.
     */
    this.hasLoaded = false;
    this.willSyncState = false;
  }
/*
  setInverse() { assert('Interface Method Not Implemented!'); }
  addCanonicalInverse() { assert('Interface Method Not Implemented!'); }
  removeCanonicalInverse() { assert('Interface Method Not Implemented!'); }
  notifyInverseOfAdd() { assert('Interface Method Not Implemented!'); }
  notifyInverseOfRemove() { assert('Interface Method Not Implemented!'); }
  */
  flushCanonical() { assert('Interface Method Not Implemented!'); }

  flushCanonicalLater() {
    if (this.willSyncState) {
      return;
    }
    this.willSyncState = true;
    this.store._backburner.join(() => {
      this.store._backburner.schedule('syncRelationships', this, this.flushCanonical);
    });
  }

  // TODO is there any benefit to caching the inverse lookup?
  getInverseRelationship(inverse) {
    if (this.inverseKey) {
      return inverse._relationships.get(this.inverseKey);
    }

    let inverseRelationship = inverse._implicitRelationships[this.inverseKeyForImplicit];

    if (!inverseRelationship) {
      // TODO is `new Relationship()` still the correct thing here?
      // TODO We likely want an explicit ImplicitRelationship class
      inverseRelationship = inverse._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, inverse, this.key,  { options: {} });
    }

    return inverseRelationship;
  }
}



/**
 * @class BelongsToRelationship
 * @extends Relationship
 * @private
 */
export class BelongsToRelationship extends Relationship {
  /**
   * @method setInverse
   * @param {InternalModel} inverse
   *
   * Updates the currentState (change buffer) for the relationship, or
   * removes it if given a false-y value.
   */
  setInverse(inverse) {
    if (!inverse) {
      this.removeInverse(inverse);
    } else {
      this.addInverse(inverse);
    }

    // TODO I'm unconvinced this method belongs affecting state
    this.hasData = true;
    this.hasLoaded = true;
  }

  /**
   * @method setCanonicalInverse
   * @param {InternalModel} newInverse
   *
   * Updates the canonicalState (source of truth) for the
   * relationship, or empties it if given a false-y value.
   */
  setCanonicalInverse(newInverse) {
    if (!newInverse) {
      this.removeCanonicalInverse();
    } else {
      this.addCanonicalInverse(newInverse);
    }
  }

  /**
   * @method addCanonicalInverse
   * @param {InternalModel} inverse
   */
  // TODO we send an extra "bounce" or "ping" back after add, we should eliminate
  addCanonicalInverse(inverse) {
    if (this.canonicalState === inverse) {
      return;
    }

    if (this.canonicalState) {
      this.removeCanonicalInverse();
    }

    this.canonicalState = inverse;
    this.getInverseRelationship(inverse).addCanonicalInverse(this.internalModel);

    this.hasData = true;
    this.hasLoaded = true;
    this.flushCanonicalLater();
  }

  /**
   * @method removeCanonicalInverse
   */
  // TODO we send an extra "bounce" or "ping" back after remove, we should eliminate
  removeCanonicalInverse() {
    if (this.canonicalState) {
      this.canonicalState = null;

      this.getInverseRelationship(inverse).removeCanonicalInverse();
    }

    // TODO do we need to set hasLoaded / hasData here?
    this.flushCanonicalLater();
  }

  /**
   * @method flushCanonicalLater
   *
   * Called after changes are made to canonicalState. This will
   * schedule updating currentState to match canonicalState if
   * the states do not match.
   */
  flushCanonicalLater() {
    if (this.currentState !== this.canonicalState) {
      super.flushCanonicalLater();
    }
  }

  /**
   * @method flushCanonical
   *
   * This will update currentState to match canonicalState if
   * they do not match, and schedule an update notification for
   * the ui if so.
   *
   * It will keep currentState if the new canonicalState is empty
   * and currentState holds a newly created record.
   */
  flushCanonical() {
    this.willSyncState = false;
    if (!this.canonicalState && this.currentState && this.currentState.isNew()) {
      return;
    }

    // we double check the states are mismatched because they may re-align post-schedule
    if (this.currentState !== this.canonicalState) {
      this.currentState = this.canonicalState;
      this.internalModel.notifyBelongsToChanged(this.key);
    }
  }

  addInverse(inverse) {
    let oldInverse = this.currentState;

    if (oldInverse !== inverse) {
      assertPolymorphicType(this.internalModel, this.relationshipMeta, inverse);

      this.currentState = inverse;

      if (oldInverse) {
        // TODO we need to do the below but it needs a guard
        // this.getInverseRelationship(oldInverse).removeInverse();
      }

      this.getInverseRelationship(inverse).addInverse(this.internalModel);
      this.internalModel.notifyBelongsToChanged(this.key);
      // this.internalModel.updateRecordArraysLater();
    }

    this.hasData = true;
  }

  removeInverse() {
    if (this.currentState) {
      this.currentState = null;

      this.getInverseRelationship(inverse).removeInverse();
      this.internalModel.notifyBelongsToChanged(this.key);
      // this.internalModel.updateRecordArrays();
    }
  }

  // TODO this is poorly named as we do not wait on this promise at all
  // TODO  nor do we set it as a "promise" for the record
  // TODO  "getInverseFromPromise" may be a better name?
  setRecordPromise(newPromise) {
    let content = newPromise.get && newPromise.get('content');
    assert("You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.", content !== undefined);

    // TODO we should probably typecheck _internalModel / content
    this.setInverse(content ? content._internalModel : content);
  }

  // TODO remove these methods once we have a locking mechanism for updating inverses
  // TODO   Left here for reference
  /*
  removeRecordFromInverse(record) {
    heimdall.increment(removeRecordFromInverse);
    let inverseRelationship = record._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeRecordFromOwn(this.internalModel);
    }
  }

  removeRecordFromOwn(record) {
    if (!this.members.has(record)) { return;}
    this.inverseRecord = null;
    this.members.delete(record);
    this.notifyRecordRelationshipRemoved(record);
    this.internalModel.updateRecordArrays();
    this.internalModel.notifyBelongsToChanged(this.key);
  }

  removeCanonicalRecordFromInverse(record) {
    heimdall.increment(removeCanonicalRecordFromInverse);
    let inverseRelationship = record._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeCanonicalRecordFromOwn(this.internalModel);
    }
  }

  removeCanonicalRecordFromOwn(record) {
    if (!this.canonicalMembers.has(record)) { return;}
    this.canonicalState = null;
    this.canonicalMembers.delete(record);
    this.flushCanonicalLater();
  }
  */

  findRecord() {
    if (this.currentState) {
      return this.store._findByInternalModel(this.currentState);
    } else {
      return Ember.RSVP.Promise.resolve(null);
    }
  }

  fetchLink() {
    return this.store.findBelongsTo(this.internalModel, this.link, this.relationshipMeta)
      .then((internalModel) => {
        if (internalModel) {
          // TODO shouldn't this be canonical?
          this.addInverse(internalModel);
        }

        return internalModel;
      });
  }

  updateLink(link) {
    warn(`You pushed a record of type '${this.internalModel.type.modelName}' with a relationship '${this.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`, this.isAsync || this.hasData , {
      id: 'ds.store.push-link-for-sync-relationship'
    });
    assert("You have pushed a record of type '" + this.internalModel.type.modelName + "' with '" + this.key + "' as a link, but the value of that link is not a string.", typeof link === 'string' || link === null);

    this.link = link;
    this.linkPromise = null;

    // TODO notifying that the link has changed seems incorrect
    // TODO   I suspect this is to enable refetch? We can notify once when
    // TODO   pushing or updating data.
    this.internalModel.notifyPropertyChange(this.key);
  }

  findLink() {
    if (!this.linkPromise) {
      this.linkPromise = this.fetchLink();
    }

    return this.linkPromise;
  }

  /**
   * @method getRecord
   * @returns {PromiseObject|DS.Model}
   */
  // TODO this should always go through `adapter.findBelongsTo()`
  // TODO make this promise based, this should not have two different kinds of return values
  getRecord() {
    this.flushCanonical();

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
        content: this.currentState ? this.currentState.getRecord() : null
      });
    }

    if (this.currentState === null) {
      return null;
    }

    let toReturn = this.currentState.getRecord();
    assert(`You looked up the '${this.key}' relationship on a '${this.internalModel.modelName}' with id ${this.internalModel.id} but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (\`DS.belongsTo({ async: true })\`)`, toReturn === null || !toReturn.get('isEmpty'));
    return toReturn;
  }

  /**
   * @method reload
   * @returns {Promise}
   *
   * Reloads the relationship. Repeated calls will currently race and clobber.
   */
  // TODO handle cancellation case when reload() is triggered multiple times
  // TODO like above, this should always go through `adapter.findBelongsTo()`
  reload() {
    if (this.link) {
      return this.fetchLink();
    }

    // reload record, if it is already loaded
    if (this.currentState && this.currentState.hasRecord) {
      return this.currentState.record.reload();
    }

    return this.findRecord();
  }

  /*
   `push` for a relationship allows the store to push a JSON API Relationship
   Object onto the relationship. The relationship will then extract and set the
   meta, data and links of that relationship.

   `push` use `updateMeta`, `updateData` and `updateLink` to update the state
   of the relationship.
   */
  push(payload) {
    let hasData = false;
    let hasLink = false;

    if (payload.meta) {
      this.updateMeta(payload.meta);
    }

    if (payload.data !== undefined) {
      hasData = true;
      this.updateData(payload.data);
    }

    if (payload.links && payload.links.related) {
      let relatedLink = _normalizeLink(payload.links.related);
      if (relatedLink && relatedLink.href && relatedLink.href !== this.link) {
        hasLink = true;
        this.updateLink(relatedLink.href);
      }
    }

    /*
     Data being pushed into the relationship might contain only data or links,
     or a combination of both.

      TODO The below explanation is incorrect. It is highly possible we have a data
      TODO   key but are in a partial/incomplete/empty state. We should do a dirty
      TODO   check that is essentially "dataIsReferece"
     If we got data we want to set both hasData and hasLoaded to true since
     this would indicate that we should prefer the local state instead of
     trying to fetch the link or call findRecord().

     If we have no data but a link is present we want to set hasLoaded to false
     without modifying the hasData flag. This will ensure we fetch the updated
     link next time the relationship is accessed.
     */
    if (hasData) {
      this.setHasData(true);
      this.setHasLoaded(true);
    } else if (hasLink) {
      this.setHasLoaded(false);
    }
  }

  updateData(data) {
    let internalModel = this.store._pushResourceIdentifier(this, data);
    this.setCanonicalRecord(internalModel);
  }

  updateMeta(meta) {
    heimdall.increment(updateMeta);
    this.meta = meta;
  }

  clear() {
    heimdall.increment(clear);
    this.removeInverse();
  }
}
