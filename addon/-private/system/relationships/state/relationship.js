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
  updateInternalModelsFromAdapter,
} = heimdall.registerMonitor(
  'system.relationships.state.relationship',
  'addCanonicalInternalModel',
  'addCanonicalInternalModels',
  'addInternalModel',
  'addInternalModels',
  'clear',
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
    this.kind = relationshipMeta.kind;
    this.inverseKey = inverseKey;
    this.internalModel = internalModel;
    this.isAsync = typeof async === 'undefined' ? true : async;
    this.isPolymorphic = typeof polymorphic === 'undefined' ? false : polymorphic;
    this.relationshipMeta = relationshipMeta;
    //This probably breaks for polymorphic relationship in complex scenarios, due to
    //multiple possible modelNames
    this.inverseKeyForImplicit = this.internalModel.modelName + this.key;
    this.fetchPromise = null;
    this._promiseProxy = null;
    this.meta = null;
    this.__inverseMeta = undefined;

    /*
      This flag forces fetch. `true` for a single request once `reload()`
        has been called `false` at all other times.
     */
    this.shouldForceReload = false;

    /*
       This flag indicates whether we should
        re-fetch the relationship the next time
        it is accessed.

        The difference between this flag and `shouldForceReload`
        is in how we treat the presence of partially missing data:
          - for a forced reload, we will reload the link or EVERY record
          - for a stale reload, we will reload the link (if present) else only MISSING records

        Ideally these flags could be merged, but because we don't give the
        request layer the option of deciding how to resolve the data being queried
        we are forced to differentiate for now.

        It is also possible for a relationship to remain stale after a forced reload; however,
        in this case `hasFailedLoadAttempt` ought to be `true`.

      false when
        => internalModel.isNew() on initial setup
        => a previously triggered request has resolved
        => we get relationship data via push

      true when
        => !internalModel.isNew() on initial setup
        => an inverse has been unloaded
        => we get a new link for the relationship
     */
    this.relationshipIsStale = !this.isNew;

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
      Flag that indicates whether we have explicitly attempted a load for the relationship
      (which may have failed)
     */
    this.hasFailedLoadAttempt = false;

    /*
      true when
        => hasAnyRelationshipData is true
        AND
        => members (NOT canonicalMembers) @each !isEmpty

      TODO, consider changing the conditional here from !isEmpty to !hiddenFromRecordArrays
     */
  }

  get isNew() {
    return this.internalModel.isNew();
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
    if (!this.inverseKey) {
      return;
    }

    this.forAllMembers(inverseInternalModel => {
      let relationship = inverseInternalModel._relationships.get(this.inverseKey);
      relationship.inverseDidDematerialize(this.internalModel);
    });
  }

  inverseDidDematerialize(inverseInternalModel) {
    this.fetchPromise = null;
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
    internalModels.forEach(internalModel => this.removeInternalModel(internalModel));
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
    for (let i = 0; i < internalModels.length; i++) {
      if (idx !== undefined) {
        this.addCanonicalInternalModel(internalModels[i], i + idx);
      } else {
        this.addCanonicalInternalModel(internalModels[i]);
      }
    }
  }

  addCanonicalInternalModel(internalModel, idx) {
    heimdall.increment(addCanonicalInternalModel);
    if (!this.canonicalMembers.has(internalModel)) {
      this.canonicalMembers.addWithIndex(internalModel, idx);
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
        relationship = relationships[this.inverseKeyForImplicit] = new Relationship(
          this.store,
          internalModel,
          this.key,
          { options: { async: this.isAsync }, type: this.parentType }
        );
      }
      relationship.addCanonicalInternalModel(this.internalModel);
    }
  }

  removeCanonicalInternalModels(internalModels, idx) {
    heimdall.increment(removeCanonicalInternalModels);
    for (let i = 0; i < internalModels.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalInternalModel(internalModels[i], i + idx);
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
          internalModel._implicitRelationships[
            this.inverseKeyForImplicit
          ].removeCanonicalInternalModel(this.internalModel);
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
        internalModel._implicitRelationships[this.inverseKeyForImplicit].addInternalModel(
          this.internalModel
        );
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
          internalModel._implicitRelationships[this.inverseKeyForImplicit].removeInternalModel(
            this.internalModel
          );
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
    if (!this.inverseKey) {
      return;
    }

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

  updateLink(link) {
    heimdall.increment(updateLink);
    warn(
      `You pushed a record of type '${this.internalModel.modelName}' with a relationship '${
        this.key
      }' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload. EmberData will treat this relationship as known-to-be-empty.`,
      this.isAsync || this.hasAnyRelationshipData,
      {
        id: 'ds.store.push-link-for-sync-relationship',
      }
    );
    assert(
      `You have pushed a record of type '${this.internalModel.modelName}' with '${
        this.key
      }' as a link, but the value of that link is not a string.`,
      typeof link === 'string' || link === null
    );

    this.link = link;
    this.fetchPromise = null;
    this.setRelationshipIsStale(true);
  }

  reload(options) {
    if (this._promiseProxy) {
      if (this._promiseProxy.get('isPending')) {
        return this._promiseProxy;
      }
    }

    this.setHasFailedLoadAttempt(false);
    this.setShouldForceReload(true);
    this.getData(options, true);

    return this._promiseProxy;
  }

  shouldMakeRequest() {
    let {
      relationshipIsStale,
      hasFailedLoadAttempt,
      allInverseRecordsAreLoaded,
      hasAnyRelationshipData,
      shouldForceReload,
      relationshipIsEmpty,
      isAsync,
      isNew,
      fetchPromise,
    } = this;

    // never make a request if this record doesn't exist server side yet
    if (isNew === true) {
      return false;
    }

    // do not re-request if we are already awaiting a request
    if (fetchPromise !== null) {
      return false;
    }

    // Always make a request when forced
    //  failed attempts must call `reload()`.
    //
    // For legacy reasons, when a relationship is missing only
    //   some of it's data we rely on individual `findRecord`
    //   calls which may resolve from cache in the non-link case.
    //   This determination is made elsewhere.
    //
    if (shouldForceReload === true || relationshipIsStale === true) {
      return !hasFailedLoadAttempt;
    }

    // never make a request if we've explicitly attempted to at least once
    // since the last update to canonical state
    // this includes failed attempts
    //  e.g. to re-attempt `reload()` must be called force the attempt.
    if (hasFailedLoadAttempt === true) {
      return false;
    }

    // we were explicitly told that there is no inverse relationship
    if (relationshipIsEmpty === true) {
      return false;
    }

    // we were explicitly told what the inverse is, and we have the inverse records available
    if (hasAnyRelationshipData === true && allInverseRecordsAreLoaded === true) {
      return false;
    }

    // if this is a sync relationship, we should not need to fetch, so getting here is an error
    assert(
      `You looked up the '${this.key}' relationship on a '${
        this.internalModel.type.modelName
      }' with id ${
        this.internalModel.id
      } but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (\`DS.${
        this.relationshipMeta.kind
      }({ async: true })\`)`,
      isAsync === true
    );

    return true;
  }

  _updateLoadingPromise(promise, content) {
    if (this._promiseProxy) {
      if (content !== undefined) {
        this._promiseProxy.set('content', content);
      }
      this._promiseProxy.set('promise', promise);
    } else {
      this._promiseProxy = this._createProxy(promise, content);
    }

    return this._promiseProxy;
  }

  updateInternalModelsFromAdapter(internalModels) {
    heimdall.increment(updateInternalModelsFromAdapter);
    this.setHasAnyRelationshipData(true);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(internalModels);
  }

  notifyRecordRelationshipAdded() {}

  setHasAnyRelationshipData(value) {
    this.hasAnyRelationshipData = value;
  }

  setHasFailedLoadAttempt(value) {
    this.hasFailedLoadAttempt = value;
  }

  setRelationshipIsStale(value) {
    this.relationshipIsStale = value;
  }

  setRelationshipIsEmpty(value) {
    this.relationshipIsEmpty = value;
  }

  setShouldForceReload(value) {
    this.shouldForceReload = value;
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
    } else if (this.isAsync === false) {
      hasRelationshipDataProperty = true;
      let data = this.kind === 'hasMany' ? [] : null;

      this.updateData(data, initial);
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

     IF contains only data
     IF contains both links and data
      relationshipIsEmpty -> true if is empty array (has-many) or is null (belongs-to)
      hasAnyRelationshipData -> true
      relationshipIsStale -> false
      allInverseRecordsAreLoaded -> run-check-to-determine

     IF contains only links
      relationshipIsStale -> true
     */
    this.setHasFailedLoadAttempt(false);
    if (hasRelationshipDataProperty) {
      let relationshipIsEmpty =
        payload.data === null || (Array.isArray(payload.data) && payload.data.length === 0);

      this.setHasAnyRelationshipData(true);
      this.setRelationshipIsStale(false);
      this.setRelationshipIsEmpty(relationshipIsEmpty);
    } else if (hasLink) {
      this.setRelationshipIsStale(true);

      if (!initial) {
        this.internalModel.notifyPropertyChange(this.key);
      }
    }
  }

  _createProxy() {}

  updateData() {}

  destroy() {}
}
