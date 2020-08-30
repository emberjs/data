import { assert, warn } from '@ember/debug';
import { get } from '@ember/object';
import { guidFor } from '@ember/object/internals';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';

import _normalizeLink from '../../normalize-link';
import OrderedSet from '../../ordered-set';
import { implicitRelationshipStateFor, relationshipStateFor } from '../../record-data-for';

type PaginationLinks = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').PaginationLinks;
type RelationshipSchema = import('@ember-data/store/-private/ts-interfaces/record-data-schemas').RelationshipSchema;
type JsonApiRelationship = import('@ember-data/store/-private/ts-interfaces/record-data-json-api').JsonApiRelationship;
type RelationshipRecordData = import('../../ts-interfaces/relationship-record-data').RelationshipRecordData;

/**
  @module @ember-data/store
*/

interface ImplicitRelationshipMeta {
  key?: string;
  kind?: string;
  options: any;
}

export default class Relationship {
  inverseIsAsync: boolean | undefined;
  kind?: string;
  recordData: RelationshipRecordData;
  members: OrderedSet<RelationshipRecordData>;
  canonicalMembers: OrderedSet<RelationshipRecordData>;
  store: any;
  key: string | null;
  inverseKey: string | null;
  isAsync: boolean;
  isPolymorphic: boolean;
  relationshipMeta: ImplicitRelationshipMeta | RelationshipSchema;
  inverseKeyForImplicit: string;
  meta: any;
  __inverseMeta: any;
  _tempModelName: string;
  shouldForceReload: boolean = false;
  relationshipIsStale: boolean;
  hasDematerializedInverse: boolean;
  hasAnyRelationshipData: boolean;
  relationshipIsEmpty: boolean;
  hasFailedLoadAttempt: boolean = false;
  links?: PaginationLinks;
  willSync?: boolean;

  constructor(
    store: any,
    inverseKey: string | null,
    relationshipMeta: ImplicitRelationshipMeta,
    recordData: RelationshipRecordData,
    inverseIsAsync?: boolean
  ) {
    this.inverseIsAsync = inverseIsAsync;
    this.kind = relationshipMeta.kind;
    let async = relationshipMeta.options.async;
    let polymorphic = relationshipMeta.options.polymorphic;
    this.recordData = recordData;
    this.members = new OrderedSet();
    this.canonicalMembers = new OrderedSet();
    this.store = store;
    this.key = relationshipMeta.key || null;
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
     This flag forces fetch. `true` for a single request once `reload()`
       has been called `false` at all other times.
    */
    // this.shouldForceReload = false;

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
        => recordData.isNew() on initial setup
        => a previously triggered request has resolved
        => we get relationship data via push

      true when
        => !recordData.isNew() on initial setup
        => an inverse has been unloaded
        => we get a new link for the relationship

      TODO @runspired unskip the acceptance tests and fix these flags
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
      Flag def here for reference, defined as getter in has-many.js / belongs-to.js

      true when
        => hasAnyRelationshipData is true
        AND
        => members (NOT canonicalMembers) @each !isEmpty

      TODO, consider changing the conditional here from !isEmpty to !hiddenFromRecordArrays
    */

    // TODO do we want this anymore? Seems somewhat useful
    //   especially if we rename to `hasUpdatedLink`
    //   which would tell us slightly more about why the
    //   relationship is stale
    // this.updatedLink = false;
  }

  get isNew(): boolean {
    return this.recordData.isNew();
  }

  _inverseIsAsync(): boolean {
    return !!this.inverseIsAsync;
  }

  _inverseIsSync(): boolean {
    return !!(this.inverseKey && !this.inverseIsAsync);
  }

  _hasSupportForImplicitRelationships(recordData: RelationshipRecordData): boolean {
    return recordData._implicitRelationships !== undefined && recordData._implicitRelationships !== null;
  }

  _hasSupportForRelationships(recordData: RelationshipRecordData): recordData is RelationshipRecordData {
    return recordData._relationships !== undefined && recordData._relationships !== null;
  }

  get _inverseMeta(): RelationshipSchema {
    if (this.__inverseMeta === undefined) {
      let inverseMeta = null;

      if (this.inverseKey) {
        // We know we have a full inverse relationship
        let type = (this.relationshipMeta as RelationshipSchema).type;
        let inverseModelClass = this.store.modelFor(type);
        let inverseRelationships = get(inverseModelClass, 'relationshipsByName');
        inverseMeta = inverseRelationships.get(this.inverseKey);
      }

      this.__inverseMeta = inverseMeta;
    }
    return this.__inverseMeta;
  }

  recordDataDidDematerialize() {
    const inverseKey = this.inverseKey;
    if (!inverseKey) {
      return;
    }

    // we actually want a union of members and canonicalMembers
    // they should be disjoint but currently are not due to a bug
    this.forAllMembers(inverseRecordData => {
      if (!this._hasSupportForRelationships(inverseRecordData)) {
        return;
      }
      let relationship = relationshipStateFor(inverseRecordData, inverseKey);
      let belongsToRelationship = inverseRecordData.getBelongsTo(inverseKey)._relationship;

      // For canonical members, it is possible that inverseRecordData has already been associated to
      // to another record. For such cases, do not dematerialize the inverseRecordData
      if (
        !belongsToRelationship ||
        !belongsToRelationship.inverseRecordData ||
        this.recordData === belongsToRelationship.inverseRecordData
      ) {
        relationship.inverseDidDematerialize(this.recordData);
      }
    });
  }

  forAllMembers(callback: (im: RelationshipRecordData) => void) {
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

  inverseDidDematerialize(inverseRecordData: RelationshipRecordData | null) {
    if (!this.isAsync || (inverseRecordData && inverseRecordData.isNew())) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      // if the record being unloaded only exists on the client, we similarly
      // treat it as a client side delete
      this.removeRecordDataFromOwn(inverseRecordData);
      this.removeCanonicalRecordDataFromOwn(inverseRecordData);
      this.setRelationshipIsEmpty(true);
    } else {
      this.setHasDematerializedInverse(true);
    }
  }

  updateMeta(meta: any) {
    this.meta = meta;
  }

  clear() {
    let members = this.members.list;
    while (members.length > 0) {
      let member = members[0];
      this.removeRecordData(member);
    }

    let canonicalMembers = this.canonicalMembers.list;
    while (canonicalMembers.length > 0) {
      let member = canonicalMembers[0];
      this.removeCanonicalRecordData(member);
    }
  }

  removeAllRecordDatasFromOwn() {
    this.setRelationshipIsStale(true);
    this.members.clear();
  }

  removeAllCanonicalRecordDatasFromOwn() {
    this.canonicalMembers.clear();
    this.flushCanonicalLater();
  }

  removeRecordDatas(recordDatas: RelationshipRecordData[]) {
    recordDatas.forEach(recordData => this.removeRecordData(recordData));
  }

  addRecordDatas(recordDatas: RelationshipRecordData[], idx?: number) {
    recordDatas.forEach(recordData => {
      this.addRecordData(recordData, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  }

  addCanonicalRecordData(recordData: RelationshipRecordData, idx?: number) {
    if (!this.canonicalMembers.has(recordData)) {
      this.canonicalMembers.add(recordData);
      this.setupInverseRelationship(recordData);
    }
    this.flushCanonicalLater();
    this.setHasAnyRelationshipData(true);
  }

  setupInverseRelationship(recordData: RelationshipRecordData) {
    if (this.inverseKey) {
      if (!this._hasSupportForRelationships(recordData)) {
        return;
      }
      let relationship = relationshipStateFor(recordData, this.inverseKey);
      // if we have only just initialized the inverse relationship, then it
      // already has this.recordData in its canonicalMembers, so skip the
      // unnecessary work.  The exception to this is polymorphic
      // relationships whose members are determined by their inverse, as those
      // relationships cannot efficiently find their inverse payloads.
      relationship.addCanonicalRecordData(this.recordData);
    } else {
      if (!this._hasSupportForImplicitRelationships(recordData)) {
        return;
      }
      let relationships = recordData._implicitRelationships;
      let relationship = relationships[this.inverseKeyForImplicit];
      if (!relationship) {
        relationship = relationships[this.inverseKeyForImplicit] = new Relationship(
          this.store,
          this.key,
          { options: { async: this.isAsync } },
          recordData
        );
      }
      relationship.addCanonicalRecordData(this.recordData);
    }
  }

  removeCanonicalRecordDatas(recordDatas: RelationshipRecordData[], idx?: number) {
    for (let i = 0; i < recordDatas.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalRecordData(recordDatas[i], i + idx);
      } else {
        this.removeCanonicalRecordData(recordDatas[i]);
      }
    }
  }

  removeCanonicalRecordData(recordData: RelationshipRecordData, idx?: number) {
    if (this.canonicalMembers.has(recordData)) {
      this.removeCanonicalRecordDataFromOwn(recordData, idx);
      if (this.inverseKey) {
        this.removeCanonicalRecordDataFromInverse(recordData);
      } else {
        if (
          this._hasSupportForImplicitRelationships(recordData) &&
          recordData._implicitRelationships[this.inverseKeyForImplicit]
        ) {
          recordData._implicitRelationships[this.inverseKeyForImplicit].removeCanonicalRecordData(this.recordData);
        }
      }
    }
    this.flushCanonicalLater();
  }

  addRecordData(recordData: RelationshipRecordData, idx?: number) {
    if (!this.members.has(recordData)) {
      this.members.addWithIndex(recordData, idx);
      this.notifyRecordRelationshipAdded(recordData, idx);
      if (this._hasSupportForRelationships(recordData) && this.inverseKey) {
        relationshipStateFor(recordData, this.inverseKey).addRecordData(this.recordData);
      } else {
        if (this._hasSupportForImplicitRelationships(recordData)) {
          if (!recordData._implicitRelationships[this.inverseKeyForImplicit]) {
            recordData._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(
              this.store,
              this.key,
              { options: { async: this.isAsync } },
              recordData,
              this.isAsync
            );
          }
          recordData._implicitRelationships[this.inverseKeyForImplicit].addRecordData(this.recordData);
        }
      }
    }
    this.setHasAnyRelationshipData(true);
  }

  removeRecordData(recordData: RelationshipRecordData) {
    if (this.members.has(recordData)) {
      this.removeRecordDataFromOwn(recordData);
      if (this.inverseKey) {
        this.removeRecordDataFromInverse(recordData);
      } else {
        if (
          this._hasSupportForImplicitRelationships(recordData) &&
          recordData._implicitRelationships[this.inverseKeyForImplicit]
        ) {
          recordData._implicitRelationships[this.inverseKeyForImplicit].removeRecordData(this.recordData);
        }
      }
    }
  }

  removeRecordDataFromInverse(recordData: RelationshipRecordData) {
    if (!this._hasSupportForRelationships(recordData)) {
      return;
    }
    if (this.inverseKey) {
      let inverseRelationship = relationshipStateFor(recordData, this.inverseKey);
      //Need to check for existence, as the record might unloading at the moment
      if (inverseRelationship) {
        inverseRelationship.removeRecordDataFromOwn(this.recordData);
      }
    }
  }

  removeRecordDataFromOwn(recordData: RelationshipRecordData | null, idx?: number) {
    this.members.delete(recordData);
  }

  removeCanonicalRecordDataFromInverse(recordData: RelationshipRecordData) {
    if (!this._hasSupportForRelationships(recordData)) {
      return;
    }
    if (this.inverseKey) {
      let inverseRelationship = relationshipStateFor(recordData, this.inverseKey);
      //Need to check for existence, as the record might unloading at the moment
      if (inverseRelationship) {
        inverseRelationship.removeCanonicalRecordDataFromOwn(this.recordData);
      }
    }
  }

  removeCanonicalRecordDataFromOwn(recordData: RelationshipRecordData | null, idx?: number) {
    this.canonicalMembers.deleteWithIndex(recordData, idx);
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
    if (!this.inverseKey && !this.inverseKeyForImplicit) {
      return;
    }

    // we actually want a union of members and canonicalMembers
    // they should be disjoint but currently are not due to a bug
    let seen = Object.create(null);
    const recordData = this.recordData;

    let unload;
    if (this.inverseKey) {
      unload = inverseRecordData => {
        const id = guidFor(inverseRecordData);

        if (this._hasSupportForRelationships(inverseRecordData) && seen[id] === undefined) {
          if (this.inverseKey) {
            const relationship = relationshipStateFor(inverseRecordData, this.inverseKey);
            relationship.removeCompletelyFromOwn(recordData);
          }
          seen[id] = true;
        }
      };
    } else {
      unload = inverseRecordData => {
        const id = guidFor(inverseRecordData);

        if (this._hasSupportForImplicitRelationships(inverseRecordData) && seen[id] === undefined) {
          const relationship = implicitRelationshipStateFor(inverseRecordData, this.inverseKeyForImplicit);
          relationship.removeCompletelyFromOwn(recordData);
          seen[id] = true;
        }
      };
    }

    this.members.forEach(unload);
    this.canonicalMembers.forEach(unload);

    if (!this.isAsync) {
      this.clear();
    }
  }

  /*
    Removes the given RecordData from BOTH canonical AND current state.

    This method is useful when either a deletion or a rollback on a new record
    needs to entirely purge itself from an inverse relationship.
   */
  removeCompletelyFromOwn(recordData: RelationshipRecordData) {
    this.canonicalMembers.delete(recordData);
    this.members.delete(recordData);
  }

  flushCanonical() {
    let list = this.members.list as RelationshipRecordData[];
    this.willSync = false;
    //a hack for not removing new RecordDatas
    //TODO remove once we have proper diffing
    let newRecordDatas: RelationshipRecordData[] = [];
    for (let i = 0; i < list.length; i++) {
      // TODO Igor deal with this
      if (list[i].isNew()) {
        newRecordDatas.push(list[i]);
      }
    }

    //TODO(Igor) make this less abysmally slow
    this.members = this.canonicalMembers.copy();
    for (let i = 0; i < newRecordDatas.length; i++) {
      this.members.add(newRecordDatas[i]);
    }
  }

  flushCanonicalLater() {
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    // Reaching back into the store to use ED's runloop
    this.store._updateRelationshipState(this);
  }

  updateLinks(links: PaginationLinks): void {
    this.links = links;
  }

  updateRecordDatasFromAdapter(recordDatas?: RelationshipRecordData[]) {
    this.setHasAnyRelationshipData(true);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(recordDatas);
  }

  computeChanges(recordDatas?: RelationshipRecordData[]) {}

  notifyRecordRelationshipAdded(recordData?, idxs?) {}

  setHasAnyRelationshipData(value: boolean) {
    this.hasAnyRelationshipData = value;
  }

  setHasDematerializedInverse(value: boolean) {
    this.hasDematerializedInverse = value;
  }

  setRelationshipIsStale(value: boolean) {
    this.relationshipIsStale = value;
  }

  setRelationshipIsEmpty(value: boolean) {
    this.relationshipIsEmpty = value;
  }

  setShouldForceReload(value: boolean) {
    this.shouldForceReload = value;
  }

  setHasFailedLoadAttempt(value: boolean) {
    this.hasFailedLoadAttempt = value;
  }

  /*
   `push` for a relationship allows the store to push a JSON API Relationship
   Object onto the relationship. The relationship will then extract and set the
   meta, data and links of that relationship.

   `push` use `updateMeta`, `updateData` and `updateLink` to update the state
   of the relationship.
   */
  push(payload: JsonApiRelationship) {
    let hasRelationshipDataProperty = false;
    let hasLink = false;

    if (payload.meta) {
      this.updateMeta(payload.meta);
    }

    if (payload.data !== undefined) {
      hasRelationshipDataProperty = true;
      this.updateData(payload.data);
    } else if (this.isAsync === false && !this.hasAnyRelationshipData) {
      hasRelationshipDataProperty = true;
      let data = this.kind === 'hasMany' ? [] : null;

      this.updateData(data);
    }

    if (payload.links) {
      let originalLinks = this.links;
      this.updateLinks(payload.links);
      if (payload.links.related) {
        let relatedLink = _normalizeLink(payload.links.related);
        let currentLink = originalLinks && originalLinks.related ? _normalizeLink(originalLinks.related) : null;
        let currentLinkHref = currentLink ? currentLink.href : null;

        if (relatedLink && relatedLink.href && relatedLink.href !== currentLinkHref) {
          warn(
            `You pushed a record of type '${this.recordData.modelName}' with a relationship '${this.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload. EmberData will treat this relationship as known-to-be-empty.`,
            this.isAsync || this.hasAnyRelationshipData,
            {
              id: 'ds.store.push-link-for-sync-relationship',
            }
          );
          assert(
            `You have pushed a record of type '${this.recordData.modelName}' with '${this.key}' as a link, but the value of that link is not a string.`,
            typeof relatedLink.href === 'string' || relatedLink.href === null
          );
          hasLink = true;
        }
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
    this.setHasFailedLoadAttempt(false);
    if (hasRelationshipDataProperty) {
      let relationshipIsEmpty = payload.data === null || (Array.isArray(payload.data) && payload.data.length === 0);

      this.setHasAnyRelationshipData(true);
      this.setRelationshipIsStale(false);
      this.setHasDematerializedInverse(false);
      this.setRelationshipIsEmpty(relationshipIsEmpty);
    } else if (hasLink) {
      this.setRelationshipIsStale(true);

      let recordData = this.recordData;
      let storeWrapper = this.recordData.storeWrapper;
      if (CUSTOM_MODEL_CLASS) {
        storeWrapper.notifyBelongsToChange(recordData.modelName, recordData.id, recordData.clientId, this.key!);
      } else {
        storeWrapper.notifyPropertyChange(
          recordData.modelName,
          recordData.id,
          recordData.clientId,
          // We know we are not an implicit relationship here
          this.key!
        );
      }
    }
  }

  localStateIsEmpty() {}

  updateData(payload?) {}

  destroy() {}
}
