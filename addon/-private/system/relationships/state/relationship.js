/* global heimdall */
import { guidFor } from '@ember/object/internals';
import { get } from '@ember/object';

import { assert, warn } from '@ember/debug';
import OrderedSet from '../../ordered-set';
import _normalizeLink from '../../normalize-link';

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
    this.isPolymorphic = typeof polymorphic === 'undefined' ? false : polymorphic;
    this.relationshipMeta = relationshipMeta;
    //This probably breaks for polymorphic relationship in complex scenarios, due to
    //multiple possible modelNames
    this.inverseKeyForImplicit = this.internalModel.modelName + this.key;
    this.linkPromise = null;
    this.meta = null;
    this.__inverseMeta = undefined;

    /*
       This flag indicates whether we should
        re-fetch the relationship the next time
        it is accessed.

      false when
        => internalModel.isNew() on initial setup
        => a previously triggered request has resolved
        => we get relationship data via push

      true when
        => !internalModel.isNew() on initial setup
        => an inverse has been unloaded
        => relationship.reload() has been called
        => we get a new link for the relationship
     */
    this.relationshipIsStale = !internalModel.isNew();

    /*
      This flag indicates whether we should consider the content
       of this relationship "known".

      If we have no relationship knowledge, and the relationship
       is `async`, we will attempt to fetch the relationship on
       access if it is also stale.

     Snapshot uses this to tell the difference between unknown
      (`undefined`) or empty (`null`). The reason for this is that
      we wouldn't want to serialize  unknown relationships as `null`
      as that might overwrite remote state.

      All relationships for a newly created (`store.createRecord()`) are
       considered known (`hasAnyRelationshipData === true`).

      true when
        => we receive a push with either new data or explicit empty (`[]` or `null`)
        => the relationship is a belongsTo and we have received data from
             the other side.

      false when
        => we have received no signal about what data belongs in this relationship
        => the relationship is a hasMany and we have only received data from
            the other side.
     */
    this.hasAnyRelationshipData = false;

    /*
      Flag that indicates whether an empty relationship is explicitly empty
        (signaled by push giving us an empty array or null relationship)
        e.g. an API response has told us that this relationship is empty.

      Thus far, it does not appear that we actually need this flag; however,
        @runspired has found it invaluable when debugging relationship tests
        to determine whether (and why if so) we are in an incorrect state.

      true when
        => we receive a push with explicit empty (`[]` or `null`)
        => we have received no signal about what data belongs in this relationship
        => on initial create (as no signal is known yet)

      false at all other times
     */
    this.relationshipIsEmpty = true;

    /*
      true when
        => hasAnyRelationshipData is true
        AND
        => members (NOT canonicalMembers) @each !isEmpty

      TODO, consider changing the conditional here from !isEmpty to !hiddenFromRecordArrays
     */
    this.hasRelatedResources = false;
  }

  _inverseIsSync() {
    let inverseMeta = this._inverseMeta;
    if (!inverseMeta) {
      return false;
    }

    let inverseAsync = inverseMeta.options.async;
    return typeof inverseAsync === 'undefined' ? false : !inverseAsync;
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

  internalModelDidDematerialize() {
    if (!this.inverseKey) { return; }

    this.forAllMembers((inverseInternalModel) => {
      let relationship = inverseInternalModel._relationships.get(this.inverseKey);
      relationship.inverseDidDematerialize(this.internalModel);
    });
  }

  inverseDidDematerialize(inverseInternalModel) {
    this.linkPromise = null;
    this.setRelationshipIsStale(true);

    if (!this.isAsync) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      this.removeInternalModelFromOwn(inverseInternalModel);
      this.removeCanonicalInternalModelFromOwn(inverseInternalModel);
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
      this.removeInternalModel(member);
    }

    let canonicalMembers = this.canonicalMembers.list;
    while (canonicalMembers.length > 0) {
      let member = canonicalMembers[0];
      this.removeCanonicalInternalModel(member);
    }
  }

  removeAllInternalModelsFromOwn() {
    this.members.clear();
    this.internalModel.updateRecordArrays();
  }

  removeAllCanonicalInternalModelsFromOwn() {
    this.canonicalMembers.clear();
    this.flushCanonicalLater();
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
    this.setHasAnyRelationshipData(true);
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
        new Relationship(this.store, internalModel, this.key, { options: { async: this.isAsync }, type: this.parentType });
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
          internalModel._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(
            this.store,
            internalModel,
            this.key,
            { options: { async: this.isAsync }, type: this.parentType }
          );
        }
        internalModel._implicitRelationships[this.inverseKeyForImplicit].addInternalModel(this.internalModel);
      }
      this.internalModel.updateRecordArrays();
    }
    this.setHasAnyRelationshipData(true);
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

    if (!this.isAsync) {
      this.clear();
    }
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
    warn(`You pushed a record of type '${this.internalModel.modelName}' with a relationship '${this.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`, this.isAsync || this.hasAnyRelationshipData , {
      id: 'ds.store.push-link-for-sync-relationship'
    });
    assert(`You have pushed a record of type '${this.internalModel.modelName}' with '${this.key}' as a link, but the value of that link is not a string.`, typeof link === 'string' || link === null);

    this.link = link;
    this.linkPromise = null;
    this.setRelationshipIsStale(true);

    if (!initial) {
      this.internalModel.notifyPropertyChange(this.key);
    }
  }

  _shouldFindViaLink() {
    if (!this.link) {
      return false;
    }

    return this.relationshipIsStale ||
      !this.hasRelatedResources;
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
    this.setHasAnyRelationshipData(true);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(internalModels);
  }

  notifyRecordRelationshipAdded() { }

  setHasAnyRelationshipData(value) {
    this.hasAnyRelationshipData = value;
  }

  setHasRelatedResources(v) {
    this.hasRelatedResources = v;
  }

  setRelationshipIsStale(value) {
    this.relationshipIsStale = value;
  }

  setRelationshipIsEmpty(value) {
    this.relationshipIsEmpty = value;
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

    let hasRelationshipDataProperty = false;
    let hasLink = false;

    if (payload.meta) {
      this.updateMeta(payload.meta);
    }

    if (payload.data !== undefined) {
      hasRelationshipDataProperty = true;
      this.updateData(payload.data, initial);
    } else if (payload._partialData !== undefined) {
      this.updateData(payload._partialData, initial);
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

     IF contains only data
     IF contains both links and data
      relationshipIsEmpty -> true if is empty array (has-many) or is null (belongs-to)
      hasAnyRelationshipData -> true
      relationshipIsStale -> false
      hasRelatedResources -> run-check-to-determine

     IF contains only links
      relationshipIsStale -> true
     */

    if (hasRelationshipDataProperty) {
      let relationshipIsEmpty = payload.data === null ||
        (Array.isArray(payload.data) && payload.data.length === 0);

      this.setHasAnyRelationshipData(true);
      this.setRelationshipIsStale(false);
      this.setRelationshipIsEmpty(relationshipIsEmpty);
      this.setHasRelatedResources(
        relationshipIsEmpty || !this.localStateIsEmpty()
      );
    } else if (hasLink) {
      this.setRelationshipIsStale(true);
    }
  }

  updateData() {}

  destroy() {
  }
}
