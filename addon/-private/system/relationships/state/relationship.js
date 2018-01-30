/* global heimdall */
import { guidFor } from '@ember/object/internals';
import { get } from '@ember/object';

import { assert, warn } from '@ember/debug';
import OrderedSet from '../../ordered-set';
import _normalizeLink from '../../normalize-link';

const {
  addCanonicalModelData,
  addCanonicalModelDatas,
  addModelData,
  addModelDatas,
  clear,
  flushCanonical,
  flushCanonicalLater,
  newRelationship,
  push,
  removeCanonicalModelData,
  removeCanonicalModelDataFromInverse,
  removeCanonicalModelDataFromOwn,
  removeCanonicalModelDatas,
  removeModelData,
  removeModelDataFromInverse,
  removeModelDataFromOwn,
  removeModelDatas,
  setHasData,
  setHasLoaded,
  updateLink,
  updateMeta,
  updateModelDatasFromAdapter
} = heimdall.registerMonitor('system.relationships.state.relationship',
  'addCanonicalModelData',
  'addCanonicalModelDatas',
  'addModelData',
  'addModelDatas',
  'clear',
  'flushCanonical',
  'flushCanonicalLater',
  'newRelationship',
  'push',
  'removeCanonicalModelData',
  'removeCanonicalModelDataFromInverse',
  'removeCanonicalModelDataFromOwn',
  'removeCanonicalModelDatas',
  'removeModelData',
  'removeModelDataFromInverse',
  'removeModelDataFromOwn',
  'removeModelDatas',
  'setHasData',
  'setHasLoaded',
  'updateLink',
  'updateMeta',
  'updateModelDatasFromAdapter'
);

export default class Relationship {
  constructor(store, inverseKey, relationshipMeta, modelData, inverseIsAsync) {
    heimdall.increment(newRelationship);
    this.inverseIsAsync = inverseIsAsync;
    let async = relationshipMeta.options.async;
    this.modelData = modelData;
    this.members = new OrderedSet();
    this.canonicalMembers = new OrderedSet();
    this.store = store;
    this.key = relationshipMeta.key;
    this.inverseKey = inverseKey;
    this.isAsync = typeof async === 'undefined' ? true : async;
    this.relationshipMeta = relationshipMeta;
    //This probably breaks for polymorphic relationship in complex scenarios, due to
    //multiple possible modelNames
    this.inverseKeyForImplicit = this._tempModelName + this.key;
    this.linkPromise = null;
    this.meta = null;
    this.hasData = false;
    this.hasLoaded = false;
    this.__inverseMeta = undefined;
    this.updatedLink = false;
  }

  _inverseIsAsync() {
    return this.inverseIsAsync;
  }

  _inverseIsSync() {
    return this.inverseKey && !this.inverseIsAsync;
  }

  get _inverseMeta() {
    if (this.__inverseMeta === undefined) {
      let inverseMeta = null;

      if (this.inverseKey) {
        let inverseModelClass = this.store.modelFor(this.relationshipMeta.type);
        let inverseRelationships = get(inverseModelClass, 'relationshipsByName');
        inverseMeta = inverseRelationships.get(this.inverseKey);
      }

      this.__inverseMeta = inverseMeta;
    }
    return this.__inverseMeta;
  }

  get parentType() {
    return this.internalModel.modelName;
  }

  modelDataDidDematerialize() {
    if (!this.inverseKey) { return; }
    // we actually want a union of members and canonicalMembers
    // they should be disjoint but currently are not due to a bug
    this.forAllMembers((inverseModelData) => {
      let relationship = inverseModelData._relationships.get(this.inverseKey);
      relationship.inverseDidDematerialize(this.modelData);
    });
  }

  forAllMembers(callback) {
    let seen = Object.create(null);

    for (let i = 0; i < this.members.list.length; i++) {
      const inverseInternalModel = this.members.list[i];
      const id = guidFor(inverseInternalModel);
      if (!seen[id]) {
        seen[id] = true;
        callback(inverseInternalModel);
      }
    }

    for (let i = 0; i < this.canonicalMembers.list.length; i++) {
      const inverseInternalModel = this.canonicalMembers.list[i];
      const id = guidFor(inverseInternalModel);
      if (!seen[id]) {
        seen[id] = true;
        callback(inverseInternalModel);
      }
    }
  }


  inverseDidDematerialize(inverseModelData) {
    if (!this.isAsync) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      this.removeModelDataFromOwn(inverseModelData);
      this.removeCanonicalModelDataFromOwn(inverseModelData);
    }
  }

  updateMeta(meta) {
    heimdall.increment(updateMeta);
    this.meta = meta;
  }

  clear() {
    heimdall.increment(clear);

    let members = this.members.list;
    while (members.length > 0) {
      let member = members[0];
      this.removeModelData(member);
    }

    let canonicalMembers = this.canonicalMembers.list;
    while (canonicalMembers.length > 0) {
      let member = canonicalMembers[0];
      this.removeCanonicalModelData(member);
    }
  }

  removeAllModelDatasFromOwn() {
    this.members.clear();
  }

  removeAllCanonicalModelDatasFromOwn() {
    this.canonicalMembers.clear();
    this.flushCanonicalLater();
  }

  removeModelDatas(modelDatas) {
    heimdall.increment(removeModelDatas);
    modelDatas.forEach((modelData) => this.removeModelData(modelData));
  }

  addModelDatas(modelDatas, idx) {
    heimdall.increment(addModelDatas);
    modelDatas.forEach(modelData => {
      this.addModelData(modelData, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  }

  addCanonicalModelDatas(modelDatas, idx) {
    heimdall.increment(addCanonicalModelDatas);
    for (let i=0; i<modelDatas.length; i++) {
      if (idx !== undefined) {
        this.addCanonicalModelData(modelDatas[i], i+idx);
      } else {
        this.addCanonicalModelData(modelDatas[i]);
      }
    }
  }

  addCanonicalModelData(modelData, idx) {
    heimdall.increment(addCanonicalModelData);
    if (!this.canonicalMembers.has(modelData)) {
      this.canonicalMembers.add(modelData);
      this.setupInverseRelationship(modelData);
    }
    this.flushCanonicalLater();
    this.setHasData(true);
  }

  setupInverseRelationship(modelData) {
    if (this.inverseKey) {
      let relationships = modelData._relationships;
      let relationship = relationships.get(this.inverseKey);
        // if we have only just initialized the inverse relationship, then it
        // already has this.modelData in its canonicalMembers, so skip the
        // unnecessary work.  The exception to this is polymorphic
        // relationships whose members are determined by their inverse, as those
        // relationships cannot efficiently find their inverse payloads.
      relationship.addCanonicalModelData(this.modelData);
    } else {
      let relationships = modelData._implicitRelationships;
      let relationship = relationships[this.inverseKeyForImplicit];
      if (!relationship) {
        relationship = relationships[this.inverseKeyForImplicit] =
          new Relationship(this.store, this.key,  { options: { async: this.isAsync } }, modelData);
      }
      relationship.addCanonicalModelData(this.modelData);
    }
  }

  removeCanonicalModelDatas(modelDatas, idx) {
    heimdall.increment(removeCanonicalModelDatas);
    for (let i=0; i<modelDatas.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalModelData(modelDatas[i], i+idx);
      } else {
        this.removeCanonicalModelData(modelDatas[i]);
      }
    }
  }

  removeCanonicalModelData(modelData, idx) {
    heimdall.increment(removeCanonicalModelData);
    if (this.canonicalMembers.has(modelData)) {
      this.removeCanonicalModelDataFromOwn(modelData);
      if (this.inverseKey) {
        this.removeCanonicalModelDataFromInverse(modelData);
      } else {
        if (modelData._implicitRelationships[this.inverseKeyForImplicit]) {
          modelData._implicitRelationships[this.inverseKeyForImplicit].removeCanonicalModelData(this.modelData);
        }
      }
    }
    this.flushCanonicalLater();
  }

  addModelData(modelData, idx) {
    heimdall.increment(addModelData);
    if (!this.members.has(modelData)) {
      this.members.addWithIndex(modelData, idx);
      this.notifyRecordRelationshipAdded(modelData, idx);
      if (this.inverseKey) {
        modelData._relationships.get(this.inverseKey).addModelData(this.modelData);
      } else {
        if (!modelData._implicitRelationships[this.inverseKeyForImplicit]) {
          modelData._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, this.key,  { options: { async: this.isAsync } }, modelData, this.isAsync);
        }
        modelData._implicitRelationships[this.inverseKeyForImplicit].addModelData(this.modelData);
      }
    }
    this.setHasData(true);
  }

  removeModelData(modelData) {
    heimdall.increment(removeModelData);
    if (this.members.has(modelData)) {
      this.removeModelDataFromOwn(modelData);
      if (this.inverseKey) {
        this.removeModelDataFromInverse(modelData);
      } else {
        if (modelData._implicitRelationships[this.inverseKeyForImplicit]) {
          modelData._implicitRelationships[this.inverseKeyForImplicit].removeModelData(this.modelData);
        }
      }
    }
  }

  removeModelDataFromInverse(modelData) {
    heimdall.increment(removeModelDataFromInverse);
    let inverseRelationship = modelData._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeModelDataFromOwn(this.modelData);
    }
  }

  removeModelDataFromOwn(modelData) {
    heimdall.increment(removeModelDataFromOwn);
    this.members.delete(modelData);
  }

  removeCanonicalModelDataFromInverse(modelData) {
    heimdall.increment(removeCanonicalModelDataFromInverse);
    let inverseRelationship = modelData._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeCanonicalModelDataFromOwn(this.modelData);
    }
  }

  removeCanonicalModelDataFromOwn(modelData) {
    heimdall.increment(removeCanonicalModelDataFromOwn);
    this.canonicalMembers.delete(modelData);
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
    const modelData = this.modelData;

    const unload = inverseModelData => {
      const id = guidFor(inverseModelData);

      if (seen[id] === undefined) {
        const relationship = inverseModelData._relationships.get(this.inverseKey);
        relationship.removeCompletelyFromOwn(modelData);
        seen[id] = true;
      }
    };

    this.members.forEach(unload);
    this.canonicalMembers.forEach(unload);

    if (!this.isAsync) {
      this.clear();
    }
  }

  /*
    Removes the given ModelData from BOTH canonical AND current state.

    This method is useful when either a deletion or a rollback on a new record
    needs to entirely purge itself from an inverse relationship.
   */
  removeCompletelyFromOwn(modelData) {
    this.canonicalMembers.delete(modelData);
    this.members.delete(modelData);
  }

  flushCanonical() {
    heimdall.increment(flushCanonical);
    let list = this.members.list;
    this.willSync = false;
    //a hack for not removing new ModelDatas
    //TODO remove once we have proper diffing
    let newModelDatas = [];
    for (let i = 0; i < list.length; i++) {
      // TODO Igor deal with this
      if (list[i].isNew()) {
        newModelDatas.push(list[i]);
      }
    }

    //TODO(Igor) make this less abysmally slow
    this.members = this.canonicalMembers.copy();
    for (let i = 0; i < newModelDatas.length; i++) {
      this.members.add(newModelDatas[i]);
    }
  }

  flushCanonicalLater() {
    heimdall.increment(flushCanonicalLater);
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    // Reaching back into the store to use ED's runloop
    this.store._updateRelationshipState(this);
  }

  updateLink(link, initial, alsoUpdatedData) {
    heimdall.increment(updateLink);
    warn(`You pushed a record of type '${this.modelData.modelName}' with a relationship '${this.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`, this.isAsync || this.hasData , {
      id: 'ds.store.push-link-for-sync-relationship'
    });
    assert(`You have pushed a record of type '${this.modelData.modelName}' with '${this.key}' as a link, but the value of that link is not a string.`, typeof link === 'string' || link === null);

    if (!alsoUpdatedData) {
      this.updatedLink = true;
    } else {
      this.updatedLink = false;
    }

    this.link = link;
    this.linkPromise = null;
    this.hasLoaded = false;
    if (!initial) {
      let modelData = this.modelData;
      let storeWrapper = this.modelData.storeWrapper;
      storeWrapper.notifyPropertyChange(modelData.modelName, modelData.id, modelData.clientId, this.key);
    }
  }

  updateModelDatasFromAdapter(modelDatas) {
    heimdall.increment(updateModelDatasFromAdapter);
    this.setHasData(true);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(modelDatas);
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
        this.updateLink(relatedLink.href, initial, hasData);
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
