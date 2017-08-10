/* global heimdall */
import { assert, warn } from '@ember/debug';
import OrderedSet from '../../ordered-set';
import _normalizeLink from '../../normalize-link';
import Ember from 'ember';

const { guidFor } = Ember;

const {
  addCanonicalInternalModel,
  addCanonicalInternalModels,
  addInternalModel,
  addInternalModels,
  clear,
  findLink,
  flushCanonical,
  flushCanonicalLater,
  newRelationship,
  push,
  removeCanonicalInternalModel,
  removeCanonicalInternalModelFromInverse,
  removeCanonicalInternalModelFromOwn,
  removeCanonicalInternalModels,
  removeInternalModel,
  removeInternalModelFromInverse,
  removeInternalModelFromOwn,
  removeInternalModels,
  setHasData,
  setHasLoaded,
  updateLink,
  updateMeta,
  updateInternalModelsFromAdapter
} = heimdall.registerMonitor('system.relationships.state.relationship',
  'addCanonicalInternalModel',
  'addCanonicalInternalModels',
  'addInternalModel',
  'addInternalModels',
  'clear',
  'findLink',
  'flushCanonical',
  'flushCanonicalLater',
  'newRelationship',
  'push',
  'removeCanonicalInternalModel',
  'removeCanonicalInternalModelFromInverse',
  'removeCanonicalInternalModelFromOwn',
  'removeCanonicalInternalModels',
  'removeInternalModel',
  'removeInternalModelFromInverse',
  'removeInternalModelFromOwn',
  'removeInternalModels',
  'setHasData',
  'setHasLoaded',
  'updateLink',
  'updateMeta',
  'updateInternalModelsFromAdapter'
);

export default class Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    heimdall.increment(newRelationship);
    let async = relationshipMeta.options.async;
    let polymorphic = relationshipMeta.options.polymorphic;
    this.members = new OrderedSet();
    this.canonicalMembers = new OrderedSet();
    this.store = store;
    this.key = relationshipMeta.key;
    this.inverseKey = inverseKey;
    this.internalModel = internalModel;
    this.isAsync = typeof async === 'undefined' ? true : async;
    this.isPolymorphic = typeof polymorphic === 'undefined' ? true : polymorphic;
    this.relationshipMeta = relationshipMeta;
    //This probably breaks for polymorphic relationship in complex scenarios, due to
    //multiple possible modelNames
    this.inverseKeyForImplicit = this.internalModel.modelName + this.key;
    this.linkPromise = null;
    this.meta = null;
    this.hasData = false;
    this.hasLoaded = false;
  }

  get parentType() {
    return this.internalModel.modelName;
  }

  _inverseIsAsync() {
    if (!this.inverseKey || !this.inverseInternalModel) {
      return false;
    }
    return this.inverseInternalModel._relationships.get(this.inverseKey).isAsync;
  }

  removeInverseRelationships() {
    if (!this.inverseKey) { return; }

    let allMembers =
      // we actually want a union of members and canonicalMembers
      // they should be disjoint but currently are not due to a bug
      this.members.toArray().concat(this.canonicalMembers.toArray());

    allMembers.forEach(inverseInternalModel => {
      let relationship = inverseInternalModel._relationships.get(this.inverseKey);
      relationship.inverseDidDematerialize();
    });
  }

  inverseDidDematerialize() {}

  updateMeta(meta) {
    heimdall.increment(updateMeta);
    this.meta = meta;
  }

  clear() {
    heimdall.increment(clear);

    let members = this.members.list;
    while (members.length > 0) {
      let member = members[0];
      this.removeInternalModel(member);
    }

    let canonicalMembers = this.canonicalMembers.list;
    while (canonicalMembers.length > 0) {
      let member = canonicalMembers[0];
      this.removeCanonicalInternalModel(member);
    }
  }

  removeInternalModels(internalModels) {
    heimdall.increment(removeInternalModels);
    internalModels.forEach((internalModel) => this.removeInternalModel(internalModel));
  }

  addInternalModels(internalModels, idx) {
    heimdall.increment(addInternalModels);
    internalModels.forEach(internalModel => {
      this.addInternalModel(internalModel, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  }

  addCanonicalInternalModels(internalModels, idx) {
    heimdall.increment(addCanonicalInternalModels);
    for (let i=0; i<internalModels.length; i++) {
      if (idx !== undefined) {
        this.addCanonicalInternalModel(internalModels[i], i+idx);
      } else {
        this.addCanonicalInternalModel(internalModels[i]);
      }
    }
  }

  addCanonicalInternalModel(internalModel, idx) {
    heimdall.increment(addCanonicalInternalModel);
    if (!this.canonicalMembers.has(internalModel)) {
      this.canonicalMembers.add(internalModel);
      this.setupInverseRelationship(internalModel);
    }
    this.flushCanonicalLater();
    this.setHasData(true);
  }

  setupInverseRelationship(internalModel) {
    if (this.inverseKey) {
      let relationships = internalModel._relationships;
      let relationshipExisted = relationships.has(this.inverseKey);
      let relationship = relationships.get(this.inverseKey);
      if (relationshipExisted || this.isPolymorphic) {
        // if we have only just initialized the inverse relationship, then it
        // already has this.internalModel in its canonicalMembers, so skip the
        // unnecessary work.  The exception to this is polymorphic
        // relationships whose members are determined by their inverse, as those
        // relationships cannot efficiently find their inverse payloads.
        relationship.addCanonicalInternalModel(this.internalModel);
      }
    } else {
      let relationships = internalModel._implicitRelationships;
      let relationship = relationships[this.inverseKeyForImplicit];
      if (!relationship) {
        relationship = relationships[this.inverseKeyForImplicit] =
          new Relationship(this.store, internalModel, this.key,  { options: { async: this.isAsync } });
      }
      relationship.addCanonicalInternalModel(this.internalModel);
    }
  }

  removeCanonicalInternalModels(internalModels, idx) {
    heimdall.increment(removeCanonicalInternalModels);
    for (let i=0; i<internalModels.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalInternalModel(internalModels[i], i+idx);
      } else {
        this.removeCanonicalInternalModel(internalModels[i]);
      }
    }
  }

  removeCanonicalInternalModel(internalModel, idx) {
    heimdall.increment(removeCanonicalInternalModel);
    if (this.canonicalMembers.has(internalModel)) {
      this.removeCanonicalInternalModelFromOwn(internalModel);
      if (this.inverseKey) {
        this.removeCanonicalInternalModelFromInverse(internalModel);
      } else {
        if (internalModel._implicitRelationships[this.inverseKeyForImplicit]) {
          internalModel._implicitRelationships[this.inverseKeyForImplicit].removeCanonicalInternalModel(this.internalModel);
        }
      }
    }
    this.flushCanonicalLater();
  }

  addInternalModel(internalModel, idx) {
    heimdall.increment(addInternalModel);
    if (!this.members.has(internalModel)) {
      this.members.addWithIndex(internalModel, idx);
      this.notifyRecordRelationshipAdded(internalModel, idx);
      if (this.inverseKey) {
        internalModel._relationships.get(this.inverseKey).addInternalModel(this.internalModel);
      } else {
        if (!internalModel._implicitRelationships[this.inverseKeyForImplicit]) {
          internalModel._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, internalModel, this.key,  { options: { async: this.isAsync } });
        }
        internalModel._implicitRelationships[this.inverseKeyForImplicit].addInternalModel(this.internalModel);
      }
      this.internalModel.updateRecordArrays();
    }
    this.setHasData(true);
  }

  removeInternalModel(internalModel) {
    heimdall.increment(removeInternalModel);
    if (this.members.has(internalModel)) {
      this.removeInternalModelFromOwn(internalModel);
      if (this.inverseKey) {
        this.removeInternalModelFromInverse(internalModel);
      } else {
        if (internalModel._implicitRelationships[this.inverseKeyForImplicit]) {
          internalModel._implicitRelationships[this.inverseKeyForImplicit].removeInternalModel(this.internalModel);
        }
      }
    }
  }

  removeInternalModelFromInverse(internalModel) {
    heimdall.increment(removeInternalModelFromInverse);
    let inverseRelationship = internalModel._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeInternalModelFromOwn(this.internalModel);
    }
  }

  removeInternalModelFromOwn(internalModel) {
    heimdall.increment(removeInternalModelFromOwn);
    this.members.delete(internalModel);
    this.internalModel.updateRecordArrays();
  }

  removeCanonicalInternalModelFromInverse(internalModel) {
    heimdall.increment(removeCanonicalInternalModelFromInverse);
    let inverseRelationship = internalModel._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeCanonicalInternalModelFromOwn(this.internalModel);
    }
  }

  removeCanonicalInternalModelFromOwn(internalModel) {
    heimdall.increment(removeCanonicalInternalModelFromOwn);
    this.canonicalMembers.delete(internalModel);
    this.flushCanonicalLater();
  }

  /*
    Call this method once a record deletion has been persisted
    to purge it from BOTH current and canonical state of all
    relationships.

    @method removeCompletelyFromInverse
    @private
   */
  removeCompletelyFromInverse() {
    if (!this.inverseKey) { return; }

    // we actually want a union of members and canonicalMembers
    // they should be disjoint but currently are not due to a bug
    let seen = Object.create(null);
    const internalModel = this.internalModel;

    const unload = inverseInternalModel => {
      const id = guidFor(inverseInternalModel);

      if (seen[id] === undefined) {
        const relationship = inverseInternalModel._relationships.get(this.inverseKey);
        relationship.removeCompletelyFromOwn(internalModel);
        seen[id] = true;
      }
    };

    this.members.forEach(unload);
    this.canonicalMembers.forEach(unload);
  }

  /*
    Removes the given internalModel from BOTH canonical AND current state.

    This method is useful when either a deletion or a rollback on a new record
    needs to entirely purge itself from an inverse relationship.
   */
  removeCompletelyFromOwn(internalModel) {
    this.canonicalMembers.delete(internalModel);
    this.members.delete(internalModel);
    this.internalModel.updateRecordArrays();
  }

  flushCanonical() {
    heimdall.increment(flushCanonical);
    let list = this.members.list;
    this.willSync = false;
    //a hack for not removing new internalModels
    //TODO remove once we have proper diffing
    let newInternalModels = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].isNew()) {
        newInternalModels.push(list[i]);
      }
    }

    //TODO(Igor) make this less abysmally slow
    this.members = this.canonicalMembers.copy();
    for (let i = 0; i < newInternalModels.length; i++) {
      this.members.add(newInternalModels[i]);
    }
  }

  flushCanonicalLater() {
    heimdall.increment(flushCanonicalLater);
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    this.store._updateRelationshipState(this);
  }

  updateLink(link, initial) {
    heimdall.increment(updateLink);
    warn(`You pushed a record of type '${this.internalModel.modelName}' with a relationship '${this.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`, this.isAsync || this.hasData , {
      id: 'ds.store.push-link-for-sync-relationship'
    });
    assert(`You have pushed a record of type '${this.internalModel.modelName}' with '${this.key}' as a link, but the value of that link is not a string.`, typeof link === 'string' || link === null);

    this.link = link;
    this.linkPromise = null;

    if (!initial) {
      this.internalModel.notifyPropertyChange(this.key);
    }
  }

  findLink() {
    heimdall.increment(findLink);
    if (this.linkPromise) {
      return this.linkPromise;
    } else {
      let promise = this.fetchLink();
      this.linkPromise = promise;
      return promise.then((result) => result);
    }
  }

  updateInternalModelsFromAdapter(internalModels) {
    heimdall.increment(updateInternalModelsFromAdapter);
    this.setHasData(true);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(internalModels);
  }

  notifyRecordRelationshipAdded() { }

  /*
   `hasData` for a relationship is a flag to indicate if we consider the
   content of this relationship "known". Snapshots uses this to tell the
   difference between unknown (`undefined`) or empty (`null`). The reason for
   this is that we wouldn't want to serialize unknown relationships as `null`
   as that might overwrite remote state.

   All relationships for a newly created (`store.createRecord()`) are
   considered known (`hasData === true`).
   */
  setHasData(value) {
    heimdall.increment(setHasData);
    this.hasData = value;
  }

  /*
   `hasLoaded` is a flag to indicate if we have gotten data from the adapter or
   not when the relationship has a link.

   This is used to be able to tell when to fetch the link and when to return
   the local data in scenarios where the local state is considered known
   (`hasData === true`).

   Updating the link will automatically set `hasLoaded` to `false`.
   */
  setHasLoaded(value) {
    heimdall.increment(setHasLoaded);
    this.hasLoaded = value;
  }

  /*
   `push` for a relationship allows the store to push a JSON API Relationship
   Object onto the relationship. The relationship will then extract and set the
   meta, data and links of that relationship.

   `push` use `updateMeta`, `updateData` and `updateLink` to update the state
   of the relationship.
   */
  push(payload, initial) {
    heimdall.increment(push);

    let hasData = false;
    let hasLink = false;

    if (payload.meta) {
      this.updateMeta(payload.meta);
    }

    if (payload.data !== undefined) {
      hasData = true;
      this.updateData(payload.data, initial);
    }

    if (payload.links && payload.links.related) {
      let relatedLink = _normalizeLink(payload.links.related);
      if (relatedLink && relatedLink.href && relatedLink.href !== this.link) {
        hasLink = true;
        this.updateLink(relatedLink.href, initial);
      }
    }

    /*
     Data being pushed into the relationship might contain only data or links,
     or a combination of both.

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

  updateData() {}

  destroy() {
  }
}
