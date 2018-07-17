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
  updateLink,
  updateMeta,
  updateModelDatasFromAdapter,
} = heimdall.registerMonitor(
  'system.relationships.state.relationship',
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
  'updateLink',
  'updateMeta',
  'updateModelDatasFromAdapter'
);

export default class Relationship {
  constructor(store, inverseKey, relationshipMeta, modelData, inverseIsAsync) {
    heimdall.increment(newRelationship);
    this.inverseIsAsync = inverseIsAsync;
    let async = relationshipMeta.options.async;
    let polymorphic = relationshipMeta.options.polymorphic;
    this.modelData = modelData;
    this.members = new OrderedSet();
    this.canonicalMembers = new OrderedSet();
    this.store = store;
    this.key = relationshipMeta.key;
    this.inverseKey = inverseKey;
    this.isAsync = typeof async === 'undefined' ? true : async;
    this.isPolymorphic = typeof polymorphic === 'undefined' ? false : polymorphic;
    this.relationshipMeta = relationshipMeta;
    //This probably breaks for polymorphic relationship in complex scenarios, due to
    //multiple possible modelNames
    this.inverseKeyForImplicit = this._tempModelName + this.key;
    this.meta = null;
    this.__inverseMeta = undefined;

    /*
       This flag indicates whether we should
        re-fetch the relationship the next time
        it is accessed.

      false when
        => initial setup
        => a previously triggered request has resolved
        => we get relationship data via push

      true when
        => relationship.reload() has been called
        => we get a new link for the relationship
     */
    this.relationshipIsStale = false;

    /*
     This flag indicates whether we should
      **partially** re-fetch the relationship the
      next time it is accessed.

    false when
      => initial setup
      => a previously triggered request has resolved

    true when
      => an inverse has been unloaded
    */
    this.hasDematerializedInverse = false;

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
      Flag def here for reference, defined as getter below

      true when
        => hasAnyRelationshipData is true
        AND
        => members (NOT canonicalMembers) @each !isEmpty

      TODO, consider changing the conditional here from !isEmpty to !hiddenFromRecordArrays
    */
    // this.allInverseRecordsAreLoaded = false;

    // TODO do we want this anymore? Seems somewhat useful
    //   especially if we rename to `hasUpdatedLink`
    //   which would tell us slightly more about why the
    //   relationship is stale
    // this.updatedLink = false;
  }

  get allInverseRecordsAreLoaded() {
    return !this.localStateIsEmpty();
  }

  _inverseIsAsync() {
    return this.inverseIsAsync;
  }

  _inverseIsSync() {
    return this.inverseKey && !this.inverseIsAsync;
  }

  _hasSupportForImplicitRelationships(modelData) {
    return (
      modelData._implicitRelationships !== undefined && modelData._implicitRelationships !== null
    );
  }

  _hasSupportForRelationships(modelData) {
    return modelData._relationships !== undefined && modelData._relationships !== null;
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
    if (!this.inverseKey) {
      return;
    }
    // we actually want a union of members and canonicalMembers
    // they should be disjoint but currently are not due to a bug
    this.forAllMembers(inverseModelData => {
      if (!this._hasSupportForRelationships(inverseModelData)) {
        return;
      }
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
      this.setRelationshipIsEmpty(true);
    } else {
      this.setHasDematerializedInverse(true);
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
    this.setRelationshipIsStale(true);
    this.members.clear();
  }

  removeAllCanonicalModelDatasFromOwn() {
    this.canonicalMembers.clear();
    this.flushCanonicalLater();
  }

  removeModelDatas(modelDatas) {
    heimdall.increment(removeModelDatas);
    modelDatas.forEach(modelData => this.removeModelData(modelData));
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
    for (let i = 0; i < modelDatas.length; i++) {
      if (idx !== undefined) {
        this.addCanonicalModelData(modelDatas[i], i + idx);
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
    this.setHasAnyRelationshipData(true);
  }

  setupInverseRelationship(modelData) {
    if (this.inverseKey) {
      if (!this._hasSupportForRelationships(modelData)) {
        return;
      }
      let relationships = modelData._relationships;
      let relationship = relationships.get(this.inverseKey);
      // if we have only just initialized the inverse relationship, then it
      // already has this.modelData in its canonicalMembers, so skip the
      // unnecessary work.  The exception to this is polymorphic
      // relationships whose members are determined by their inverse, as those
      // relationships cannot efficiently find their inverse payloads.
      relationship.addCanonicalModelData(this.modelData);
    } else {
      if (!this._hasSupportForImplicitRelationships(modelData)) {
        return;
      }
      let relationships = modelData._implicitRelationships;
      let relationship = relationships[this.inverseKeyForImplicit];
      if (!relationship) {
        relationship = relationships[this.inverseKeyForImplicit] = new Relationship(
          this.store,
          this.key,
          { options: { async: this.isAsync } },
          modelData
        );
      }
      relationship.addCanonicalModelData(this.modelData);
    }
  }

  removeCanonicalModelDatas(modelDatas, idx) {
    heimdall.increment(removeCanonicalModelDatas);
    for (let i = 0; i < modelDatas.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalModelData(modelDatas[i], i + idx);
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
        if (
          this._hasSupportForImplicitRelationships(modelData) &&
          modelData._implicitRelationships[this.inverseKeyForImplicit]
        ) {
          modelData._implicitRelationships[this.inverseKeyForImplicit].removeCanonicalModelData(
            this.modelData
          );
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
      if (this._hasSupportForRelationships(modelData) && this.inverseKey) {
        modelData._relationships.get(this.inverseKey).addModelData(this.modelData);
      } else {
        if (this._hasSupportForImplicitRelationships(modelData)) {
          if (!modelData._implicitRelationships[this.inverseKeyForImplicit]) {
            modelData._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(
              this.store,
              this.key,
              { options: { async: this.isAsync } },
              modelData,
              this.isAsync
            );
          }
          modelData._implicitRelationships[this.inverseKeyForImplicit].addModelData(this.modelData);
        }
      }
    }
    this.setHasAnyRelationshipData(true);
  }

  removeModelData(modelData) {
    heimdall.increment(removeModelData);
    if (this.members.has(modelData)) {
      this.removeModelDataFromOwn(modelData);
      if (this.inverseKey) {
        this.removeModelDataFromInverse(modelData);
      } else {
        if (
          this._hasSupportForImplicitRelationships(modelData) &&
          modelData._implicitRelationships[this.inverseKeyForImplicit]
        ) {
          modelData._implicitRelationships[this.inverseKeyForImplicit].removeModelData(
            this.modelData
          );
        }
      }
    }
  }

  removeModelDataFromInverse(modelData) {
    heimdall.increment(removeModelDataFromInverse);
    if (!this._hasSupportForRelationships(modelData)) {
      return;
    }
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
    if (!this._hasSupportForRelationships(modelData)) {
      return;
    }
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
    if (!this.inverseKey) {
      return;
    }

    // we actually want a union of members and canonicalMembers
    // they should be disjoint but currently are not due to a bug
    let seen = Object.create(null);
    const modelData = this.modelData;

    const unload = inverseModelData => {
      const id = guidFor(inverseModelData);

      if (this._hasSupportForRelationships(inverseModelData) && seen[id] === undefined) {
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

  updateLink(link, initial) {
    heimdall.increment(updateLink);
    warn(
      `You pushed a record of type '${this.modelData.modelName}' with a relationship '${
        this.key
      }' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`,
      this.isAsync || this.hasAnyRelationshipData,
      {
        id: 'ds.store.push-link-for-sync-relationship',
      }
    );
    assert(
      `You have pushed a record of type '${this.modelData.modelName}' with '${
        this.key
      }' as a link, but the value of that link is not a string.`,
      typeof link === 'string' || link === null
    );

    this.link = link;
    this.setRelationshipIsStale(true);

    if (!initial) {
      let modelData = this.modelData;
      let storeWrapper = this.modelData.storeWrapper;
      storeWrapper.notifyPropertyChange(
        modelData.modelName,
        modelData.id,
        modelData.clientId,
        this.key
      );
    }
  }

  updateModelDatasFromAdapter(modelDatas) {
    heimdall.increment(updateModelDatasFromAdapter);
    this.setHasAnyRelationshipData(true);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(modelDatas);
  }

  notifyRecordRelationshipAdded() {}

  setHasAnyRelationshipData(value) {
    this.hasAnyRelationshipData = value;
  }

  setHasDematerializedInverse(value) {
    this.hasDematerializedInverse = value;
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
      hasDematerializedInverse -> false
      relationshipIsStale -> false
      allInverseRecordsAreLoaded -> run-check-to-determine

     IF contains only links
      relationshipIsStale -> true
     */
    if (hasRelationshipDataProperty) {
      let relationshipIsEmpty =
        payload.data === null || (Array.isArray(payload.data) && payload.data.length === 0);

      this.setHasAnyRelationshipData(true);
      this.setRelationshipIsStale(false);
      this.setHasDematerializedInverse(false);
      this.setRelationshipIsEmpty(relationshipIsEmpty);
    } else if (hasLink) {
      this.setRelationshipIsStale(true);
    }
  }

  localStateIsEmpty() {}

  updateData() {}

  destroy() {}
}
