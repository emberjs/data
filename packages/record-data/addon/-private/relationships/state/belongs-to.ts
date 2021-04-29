import { assert, inspect, warn } from '@ember/debug';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import { assertPolymorphicType } from '@ember-data/store/-debug';
import { identifierCacheFor } from '@ember-data/store/-private';

import { createState } from '../../graph/-state';
import _normalizeLink from '../../normalize-link';
import { isNew } from './relationship';

type UpgradedMeta = import('../../graph/-edge-definition').UpgradedMeta;
type Graph = import('../../graph').Graph;
type ExistingResourceIdentifierObject = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').ExistingResourceIdentifierObject;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type DefaultSingleResourceRelationship = import('../../ts-interfaces/relationship-record-data').DefaultSingleResourceRelationship;

type Links = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').Links;

type Meta = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').Meta;

type RelationshipState = import('../../graph/-state').RelationshipState;
type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type PaginationLinks = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').PaginationLinks;
type JsonApiRelationship = import('@ember-data/store/-private/ts-interfaces/record-data-json-api').JsonApiRelationship;

export default class BelongsToRelationship {
  declare localState: StableRecordIdentifier | null;
  declare remoteState: StableRecordIdentifier | null;

  declare graph: Graph;
  declare store: RecordDataStoreWrapper;
  declare definition: UpgradedMeta;
  declare identifier: StableRecordIdentifier;
  declare _state: RelationshipState | null;

  declare meta: Meta | null;
  declare links: Links | PaginationLinks | null;
  declare willSync: boolean;

  constructor(graph: Graph, definition: UpgradedMeta, identifier: StableRecordIdentifier) {
    this.graph = graph;
    this.store = graph.store;
    this.definition = definition;
    this.identifier = identifier;
    this._state = null;

    this.meta = null;
    this.links = null;
    this.willSync = false;

    this.localState = null;
    this.remoteState = null;
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

  recordDataDidDematerialize() {
    if (this.definition.inverseIsImplicit) {
      return;
    }

    const inverseKey = this.definition.inverseKey;
    const callback = (inverseIdentifier) => {
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
    };

    if (this.remoteState) {
      callback(this.remoteState);
    }
    if (this.localState && this.localState !== this.remoteState) {
      callback(this.localState);
    }
  }

  inverseDidDematerialize() {
    const inverseRecordData = this.localState;
    if (!this.definition.isAsync || (inverseRecordData && isNew(inverseRecordData))) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      // if the record being unloaded only exists on the client, we similarly
      // treat it as a client side delete
      this.removeRecordDataFromOwn(inverseRecordData!);
      if (this.remoteState === inverseRecordData && inverseRecordData !== null) {
        this.remoteState = null;
        this.setHasReceivedData(true);
        this.setRelationshipIsEmpty(true);
        this.flushCanonicalLater();
        this.setRelationshipIsEmpty(true);
      }
    } else {
      this.setHasDematerializedInverse(true);
    }
    this.notifyBelongsToChange();
  }

  getData(): DefaultSingleResourceRelationship {
    let data;
    let payload: any = {};
    if (this.localState) {
      data = this.localState;
    }
    if (this.localState === null && this.state.hasReceivedData) {
      data = null;
    }
    if (this.links) {
      payload.links = this.links;
    }
    if (data !== undefined) {
      payload.data = data;
    }
    if (this.meta) {
      payload.meta = this.meta;
    }

    payload._relationship = this;
    return payload;
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
      this.updateData(payload.data as ExistingResourceIdentifierObject);
    } else if (this.definition.isAsync === false && !this.state.hasReceivedData) {
      hasRelationshipDataProperty = true;

      this.updateData(null!);
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
      let relationshipIsEmpty = payload.data === null;

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

  updateLinks(links: PaginationLinks): void {
    this.links = links;
  }

  updateMeta(meta: any) {
    this.meta = meta;
  }

  updateData(resource: ExistingResourceIdentifierObject) {
    assert(
      `Ember Data expected the data for the ${
        this.definition.key
      } relationship on a ${this.identifier.toString()} to be in a JSON API format and include an \`id\` and \`type\` property but it found ${inspect(
        resource
      )}. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
      resource === null || (resource.id !== undefined && resource.type !== undefined)
    );

    const identifier = resource ? identifierCacheFor(this.store._store).getOrCreateRecordIdentifier(resource) : null;

    if (identifier) {
      this.addCanonicalRecordData(identifier);
    } else if (this.remoteState) {
      this.removeCanonicalRecordData(this.remoteState);
    }
    this.flushCanonicalLater();
  }

  /**
   * External method for updating local state
   */
  setRecordData(recordData: StableRecordIdentifier | null) {
    if (recordData) {
      this.addRecordData(recordData);
    } else if (this.localState) {
      this.removeRecordData(this.localState);
    }

    this.setHasReceivedData(true);
    this.setRelationshipIsEmpty(false);
  }

  addCanonicalRecordData(recordData: StableRecordIdentifier) {
    if (this.remoteState === recordData) {
      return;
    }

    if (this.remoteState) {
      this.removeCanonicalRecordData(this.remoteState);
    }

    this.remoteState = recordData;
    if (this.definition.type !== recordData.type) {
      assertPolymorphicType(
        this.store.recordDataFor(this.identifier.type, this.identifier.id, this.identifier.lid),
        this.definition,
        this.store.recordDataFor(recordData.type, recordData.id, recordData.lid),
        this.store._store
      );
      this.graph.registerPolymorphicType(this.definition.type, recordData.type);
    }
    this.graph.get(recordData, this.definition.inverseKey).addCanonicalRecordData(this.identifier);
    this.flushCanonicalLater();
    this.setHasReceivedData(true);
    this.setRelationshipIsEmpty(false);
  }

  addRecordData(recordData: StableRecordIdentifier) {
    let existingState = this.localState;
    if (existingState === recordData) {
      return;
    }

    if (this.definition.type !== recordData.type) {
      assertPolymorphicType(
        this.store.recordDataFor(this.identifier.type, this.identifier.id, this.identifier.lid),
        this.definition,
        this.store.recordDataFor(recordData.type, recordData.id, recordData.lid),
        this.store._store
      );
      this.graph.registerPolymorphicType(this.definition.type, recordData.type);
    }

    if (existingState) {
      this.removeRecordData(existingState);
    }

    this.localState = recordData;
    this.graph.get(recordData, this.definition.inverseKey).addRecordData(this.identifier);

    this.setHasReceivedData(true);
    this.notifyBelongsToChange();
  }

  removeRecordData(inverseIdentifier: StableRecordIdentifier | null) {
    if (this.localState === inverseIdentifier && inverseIdentifier !== null) {
      const { inverseKey } = this.definition;
      this.localState = null;
      this.notifyBelongsToChange();
      if (this.graph.has(inverseIdentifier, inverseKey)) {
        if (!this.definition.inverseIsImplicit) {
          this.graph.get(inverseIdentifier, inverseKey).removeRecordDataFromOwn(this.identifier);
        } else {
          this.graph.get(inverseIdentifier, inverseKey).removeRecordData(this.identifier);
        }
      }
    }
  }

  /*
      Removes the given RecordData from BOTH canonical AND current state.
  
      This method is useful when either a deletion or a rollback on a new record
      needs to entirely purge itself from an inverse relationship.
     */
  removeCompletelyFromOwn(recordData: StableRecordIdentifier) {
    if (this.remoteState === recordData) {
      this.remoteState = null;
    }

    if (this.localState === recordData) {
      this.localState = null;
      this.notifyBelongsToChange();
    }
  }

  /**
   * can be called by the other side
   */
  removeRecordDataFromOwn(recordData: StableRecordIdentifier) {
    if (this.localState !== recordData || recordData === null) {
      return;
    }
    this.localState = null;
    this.notifyBelongsToChange();
  }

  /**
   * can be called by the graph
   */
  removeAllRecordDatasFromOwn() {
    this.setRelationshipIsStale(true);
    this.localState = null;
    this.notifyBelongsToChange();
  }

  /**
   * can be called by the graph
   */
  removeAllCanonicalRecordDatasFromOwn() {
    this.remoteState = null;
    this.flushCanonicalLater();
  }

  /*
   Can be called from the other side
  */
  removeCanonicalRecordData(inverseIdentifier: StableRecordIdentifier | null) {
    if (this.remoteState === inverseIdentifier && inverseIdentifier !== null) {
      this.remoteState = null;
      this.setHasReceivedData(true);
      this.setRelationshipIsEmpty(true);
      this.flushCanonicalLater();
      this.setRelationshipIsEmpty(true);

      const { inverseKey } = this.definition;
      if (!this.definition.isImplicit && this.graph.has(inverseIdentifier, inverseKey)) {
        this.graph.get(inverseIdentifier, inverseKey).removeCanonicalRecordData(this.identifier);
      }
    }
  }

  /*
      Call this method once a record deletion has been persisted
      to purge it from BOTH current and canonical state of all
      relationships.
  
      @method removeCompletelyFromInverse
      @private
     */
  removeCompletelyFromInverse() {
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

    if (this.localState) {
      unload(this.localState);
    }
    if (this.remoteState) {
      unload(this.remoteState);
    }

    if (!this.definition.isAsync) {
      this.clear();
    }

    this.localState = null;
  }

  flushCanonical() {
    //temporary fix to not remove newly created records if server returned null.
    //TODO remove once we have proper diffing
    if (this.localState && isNew(this.localState) && !this.remoteState) {
      this.willSync = false;
      return;
    }
    if (this.localState !== this.remoteState) {
      this.localState = this.remoteState;
      this.notifyBelongsToChange();
    }
    this.willSync = false;
  }

  flushCanonicalLater() {
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    // Reaching back into the store to use ED's runloop
    this.store._store._updateRelationshipState(this);
  }

  notifyBelongsToChange() {
    let recordData = this.identifier;
    this.store.notifyBelongsToChange(recordData.type, recordData.id, recordData.lid, this.definition.key);
  }

  clear() {
    if (this.localState) {
      this.removeRecordData(this.localState);
    }
    if (this.remoteState) {
      this.removeCanonicalRecordData(this.remoteState);
    }
  }

  destroy() {}
}
