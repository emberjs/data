import { assert, warn } from '@ember/debug';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import { assertPolymorphicType } from '@ember-data/store/-debug';
import { recordDataFor as peekRecordData } from '@ember-data/store/-private';

import { createState } from '../../graph/-state';
import _normalizeLink from '../../normalize-link';
import OrderedSet, { guidFor } from '../../ordered-set';

type Links = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').Links;

type Meta = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').Meta;

type Graph = import('../../graph').Graph;
type UpgradedMeta = import('../../graph/-edge-definition').UpgradedMeta;
type RelationshipState = import('../../graph/-state').RelationshipState;
type BelongsToRelationship = import('../..').BelongsToRelationship;
type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type RecordData = import('@ember-data/store/-private/ts-interfaces/record-data').RecordData;
type RelationshipRecordData = import('../../ts-interfaces/relationship-record-data').RelationshipRecordData;
type PaginationLinks = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').PaginationLinks;
type JsonApiRelationship = import('@ember-data/store/-private/ts-interfaces/record-data-json-api').JsonApiRelationship;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;

/**
  @module @ember-data/store
*/
export function isNew(identifier: StableRecordIdentifier): boolean {
  if (!identifier.id) {
    return true;
  }
  const recordData = peekRecordData(identifier);
  return recordData ? isRelationshipRecordData(recordData) && recordData.isNew() : false;
}

export function isRelationshipRecordData(
  recordData: RecordData | RelationshipRecordData
): recordData is RelationshipRecordData {
  return typeof (recordData as RelationshipRecordData).isNew === 'function';
}

export default class Relationship {
  declare graph: Graph;
  declare store: RecordDataStoreWrapper;
  declare definition: UpgradedMeta;
  declare identifier: StableRecordIdentifier;
  declare _state: RelationshipState | null;

  declare members: OrderedSet<StableRecordIdentifier>;
  declare canonicalMembers: OrderedSet<StableRecordIdentifier>;
  declare meta: Meta | null;
  declare links: Links | PaginationLinks | null;
  declare willSync: boolean;

  constructor(graph: Graph, definition: UpgradedMeta, identifier: StableRecordIdentifier) {
    this.graph = graph;
    this.store = graph.store;
    this.definition = definition;
    this.identifier = identifier;
    this._state = null;

    this.members = new OrderedSet<StableRecordIdentifier>();
    this.canonicalMembers = new OrderedSet<StableRecordIdentifier>();

    this.meta = null;
    this.links = null;
    this.willSync = false;
  }

  get state(): RelationshipState {
    let { _state } = this;
    if (!_state) {
      _state = this._state = createState();
    }
    return _state;
  }

  get isNew(): boolean {
    return isNew(this.identifier);
  }

  recordDataDidDematerialize() {
    if (this.definition.inverseIsImplicit) {
      return;
    }

    const inverseKey = this.definition.inverseKey;
    this.forAllMembers((inverseIdentifier) => {
      inverseIdentifier;
      if (!inverseIdentifier || !this.graph.has(inverseIdentifier, inverseKey)) {
        return;
      }
      let relationship = this.graph.get(inverseIdentifier, inverseKey);

      // For canonical members, it is possible that inverseRecordData has already been associated to
      // to another record. For such cases, do not dematerialize the inverseRecordData
      if (
        relationship.definition.kind !== 'belongsTo' ||
        !(relationship as BelongsToRelationship).localState ||
        this.identifier === (relationship as BelongsToRelationship).localState
      ) {
        relationship.inverseDidDematerialize(this.identifier);
      }
    });
  }

  forAllMembers(callback: (im: StableRecordIdentifier | null) => void) {
    // ensure we don't walk anything twice if an entry is
    // in both members and canonicalMembers
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

  inverseDidDematerialize(inverseRecordData: StableRecordIdentifier | null) {
    if (!this.definition.isAsync || (inverseRecordData && isNew(inverseRecordData))) {
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

  removeRecordDatas(recordDatas: StableRecordIdentifier[]) {
    recordDatas.forEach((recordData) => this.removeRecordData(recordData));
  }

  addRecordDatas(recordDatas: StableRecordIdentifier[], idx?: number) {
    recordDatas.forEach((recordData) => {
      this.addRecordData(recordData, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  }

  addCanonicalRecordData(recordData: StableRecordIdentifier, idx?: number) {
    if (!this.canonicalMembers.has(recordData)) {
      if (this.definition.type !== recordData.type) {
        assertPolymorphicType(
          this.store.recordDataFor(this.identifier.type, this.identifier.id, this.identifier.lid),
          this.definition,
          this.store.recordDataFor(recordData.type, recordData.id, recordData.lid),
          this.store._store
        );
        this.graph.registerPolymorphicType(this.definition.type, recordData.type);
      }
      this.canonicalMembers.add(recordData);
      this.graph.get(recordData, this.definition.inverseKey).addCanonicalRecordData(this.identifier);
    }
    this.flushCanonicalLater();
    this.setHasReceivedData(true);
  }

  removeCanonicalRecordDatas(recordDatas: StableRecordIdentifier[], idx?: number) {
    for (let i = 0; i < recordDatas.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalRecordData(recordDatas[i], i + idx);
      } else {
        this.removeCanonicalRecordData(recordDatas[i]);
      }
    }
  }

  removeCanonicalRecordData(recordData: StableRecordIdentifier | null, idx?: number) {
    if (this.canonicalMembers.has(recordData)) {
      this.removeCanonicalRecordDataFromOwn(recordData, idx);

      if (!recordData || this.definition.isImplicit) {
        return;
      }

      const { inverseKey } = this.definition;
      if (this.graph.has(recordData, inverseKey)) {
        this.graph.get(recordData, inverseKey).removeCanonicalRecordData(this.identifier);
      }

      this.flushCanonicalLater(); // TODO does this need to be in the outer context
    }
  }

  addRecordData(recordData: StableRecordIdentifier, idx?: number) {
    if (!this.members.has(recordData)) {
      this.members.addWithIndex(recordData, idx);
      this.notifyRecordRelationshipAdded(recordData, idx);

      this.graph.get(recordData, this.definition.inverseKey).addRecordData(this.identifier);
    }
    this.setHasReceivedData(true);
  }

  removeRecordData(recordData: StableRecordIdentifier | null) {
    if (this.members.has(recordData)) {
      this.removeRecordDataFromOwn(recordData);
      if (!this.definition.inverseIsImplicit) {
        this.removeRecordDataFromInverse(recordData);
      } else {
        if (!recordData) {
          return;
        }
        const { inverseKey } = this.definition;
        // TODO is this check ever false?
        if (this.graph.has(recordData, inverseKey)) {
          this.graph.get(recordData, inverseKey).removeRecordData(this.identifier);
        }
      }
    }
  }

  removeRecordDataFromInverse(recordData: StableRecordIdentifier | null) {
    if (!recordData) {
      return;
    }
    if (!this.definition.inverseIsImplicit) {
      let inverseRelationship = this.graph.get(recordData, this.definition.inverseKey);
      //Need to check for existence, as the record might unloading at the moment
      if (inverseRelationship) {
        inverseRelationship.removeRecordDataFromOwn(this.identifier);
      }
    }
  }

  removeRecordDataFromOwn(recordData: StableRecordIdentifier | null, idx?: number) {
    this.members.delete(recordData);
  }

  removeCanonicalRecordDataFromOwn(recordData: StableRecordIdentifier | null, idx?: number) {
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
    // we actually want a union of members and canonicalMembers
    // they should be disjoint but currently are not due to a bug
    const seen = Object.create(null);
    const { identifier } = this;
    const { inverseKey } = this.definition;

    const unload = (inverseIdentifier: StableRecordIdentifier) => {
      const id = inverseIdentifier.lid;

      if (seen[id] === undefined) {
        if (this.graph.has(inverseIdentifier, inverseKey)) {
          this.graph.get(inverseIdentifier, inverseKey).removeCompletelyFromOwn(identifier);
        }
        seen[id] = true;
      }
    };

    this.members.toArray().forEach(unload);
    this.canonicalMembers.toArray().forEach(unload);

    if (!this.definition.isAsync) {
      this.clear();
    }
  }

  /*
      Removes the given RecordData from BOTH canonical AND current state.
  
      This method is useful when either a deletion or a rollback on a new record
      needs to entirely purge itself from an inverse relationship.
     */
  removeCompletelyFromOwn(recordData: StableRecordIdentifier) {
    this.canonicalMembers.delete(recordData);
    this.members.delete(recordData);
  }

  flushCanonical() {
    let list = this.members.list as StableRecordIdentifier[];
    this.willSync = false;
    //a hack for not removing new RecordDatas
    //TODO remove once we have proper diffing
    let newRecordDatas: StableRecordIdentifier[] = [];
    for (let i = 0; i < list.length; i++) {
      // TODO Igor deal with this
      if (isNew(list[i])) {
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
    this.store._store._updateRelationshipState(this);
  }

  updateLinks(links: PaginationLinks): void {
    this.links = links;
  }

  notifyRecordRelationshipAdded(recordData?, idxs?) {}

  setHasReceivedData(value: boolean) {
    this.state.hasReceivedData = value;
  }

  setHasDematerializedInverse(value: boolean) {
    this.state.hasDematerializedInverse = value;
  }

  setRelationshipIsStale(value: boolean) {
    this.state.isStale = value;
  }

  setRelationshipIsEmpty(value: boolean) {
    this.state.isEmpty = value;
  }

  setShouldForceReload(value: boolean) {
    this.state.shouldForceReload = value;
  }

  setHasFailedLoadAttempt(value: boolean) {
    this.state.hasFailedLoadAttempt = value;
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
    } else if (this.definition.isAsync === false && !this.state.hasReceivedData) {
      hasRelationshipDataProperty = true;
      let data = this.definition.kind === 'hasMany' ? [] : null;

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
            `You pushed a record of type '${this.identifier.type}' with a relationship '${this.definition.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload. EmberData will treat this relationship as known-to-be-empty.`,
            this.definition.isAsync || this.state.hasReceivedData,
            {
              id: 'ds.store.push-link-for-sync-relationship',
            }
          );
          assert(
            `You have pushed a record of type '${this.identifier.type}' with '${this.definition.key}' as a link, but the value of that link is not a string.`,
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
        state.isEmpty -> true if is empty array (has-many) or is null (belongs-to)
        state.hasReceivedData -> true
        hasDematerializedInverse -> false
        state.isStale -> false
        allInverseRecordsAreLoaded -> run-check-to-determine
  
       IF contains only links
        state.isStale -> true
       */
    this.setHasFailedLoadAttempt(false);
    if (hasRelationshipDataProperty) {
      let relationshipIsEmpty = payload.data === null || (Array.isArray(payload.data) && payload.data.length === 0);

      this.setHasReceivedData(true);
      this.setRelationshipIsStale(false);
      this.setHasDematerializedInverse(false);
      this.setRelationshipIsEmpty(relationshipIsEmpty);
    } else if (hasLink) {
      this.setRelationshipIsStale(true);

      let recordData = this.identifier;
      let storeWrapper = this.store;
      if (CUSTOM_MODEL_CLASS) {
        storeWrapper.notifyBelongsToChange(recordData.type, recordData.id, recordData.lid, this.definition.key);
      } else {
        storeWrapper.notifyPropertyChange(recordData.type, recordData.id, recordData.lid, this.definition.key);
      }
    }
  }

  updateData(payload?) {}

  destroy() {}
}
