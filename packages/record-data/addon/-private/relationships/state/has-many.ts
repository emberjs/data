import { assert } from '@ember/debug';

import type { RecordDataStoreWrapper } from '@ember-data/store/-private';
import type {
  CollectionResourceRelationship,
  Links,
  Meta,
  PaginationLinks,
} from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';

import type { BelongsToRelationship } from '../..';
import type { Graph } from '../../graph';
import type { UpgradedMeta } from '../../graph/-edge-definition';
import type { RelationshipState } from '../../graph/-state';
import { createState } from '../../graph/-state';
import { isImplicit, isNew } from '../../graph/-utils';

export default class ManyRelationship {
  declare graph: Graph;
  declare store: RecordDataStoreWrapper;
  declare definition: UpgradedMeta;
  declare identifier: StableRecordIdentifier;
  declare _state: RelationshipState | null;
  declare transactionRef: number;

  declare members: Set<StableRecordIdentifier>;
  declare canonicalMembers: Set<StableRecordIdentifier>;
  declare meta: Meta | null;
  declare links: Links | PaginationLinks | null;

  declare canonicalState: StableRecordIdentifier[];
  declare currentState: StableRecordIdentifier[];
  declare _willUpdateManyArray: boolean;
  declare _pendingManyArrayUpdates: any;

  constructor(graph: Graph, definition: UpgradedMeta, identifier: StableRecordIdentifier) {
    this.graph = graph;
    this.store = graph.store;
    this.definition = definition;
    this.identifier = identifier;
    this._state = null;
    this.transactionRef = 0;

    this.members = new Set<StableRecordIdentifier>();
    this.canonicalMembers = new Set<StableRecordIdentifier>();

    this.meta = null;
    this.links = null;

    // persisted state
    this.canonicalState = [];
    // local client state
    this.currentState = [];
    this._willUpdateManyArray = false;
    this._pendingManyArrayUpdates = null;
  }

  get state(): RelationshipState {
    let { _state } = this;
    if (!_state) {
      _state = this._state = createState();
    }
    return _state;
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
      assert(`expected no implicit`, !isImplicit(relationship));

      // For canonical members, it is possible that inverseRecordData has already been associated to
      // to another record. For such cases, do not dematerialize the inverseRecordData
      if (
        relationship.definition.kind !== 'belongsTo' ||
        !(relationship as BelongsToRelationship).localState ||
        this.identifier === (relationship as BelongsToRelationship).localState
      ) {
        (relationship as ManyRelationship | BelongsToRelationship).inverseDidDematerialize(this.identifier);
      }
    });
  }

  forAllMembers(callback: (im: StableRecordIdentifier | null) => void) {
    // ensure we don't walk anything twice if an entry is
    // in both members and canonicalMembers
    let seen = Object.create(null);

    for (let i = 0; i < this.currentState.length; i++) {
      const inverseInternalModel = this.currentState[i];
      const id = inverseInternalModel.lid;
      if (!seen[id]) {
        seen[id] = true;
        callback(inverseInternalModel);
      }
    }

    for (let i = 0; i < this.canonicalState.length; i++) {
      const inverseInternalModel = this.canonicalState[i];
      const id = inverseInternalModel.lid;
      if (!seen[id]) {
        seen[id] = true;
        callback(inverseInternalModel);
      }
    }
  }

  clear() {
    this.members.clear();
    this.canonicalMembers.clear();
    this.currentState = [];
    this.canonicalState = [];
  }

  inverseDidDematerialize(inverseRecordData: StableRecordIdentifier) {
    if (!this.definition.isAsync || (inverseRecordData && isNew(inverseRecordData))) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      // if the record being unloaded only exists on the client, we similarly
      // treat it as a client side delete
      this.removeCompletelyFromOwn(inverseRecordData);
    } else {
      this.state.hasDematerializedInverse = true;
    }

    this.notifyHasManyChange();
  }

  /*
    Removes the given RecordData from BOTH canonical AND current state.

    This method is useful when either a deletion or a rollback on a new record
    needs to entirely purge itself from an inverse relationship.
  */
  removeCompletelyFromOwn(recordData: StableRecordIdentifier) {
    this.canonicalMembers.delete(recordData);
    this.members.delete(recordData);

    const canonicalIndex = this.canonicalState.indexOf(recordData);
    if (canonicalIndex !== -1) {
      this.canonicalState.splice(canonicalIndex, 1);
    }

    const currentIndex = this.currentState.indexOf(recordData);
    if (currentIndex !== -1) {
      this.currentState.splice(currentIndex, 1);
      // This allows dematerialized inverses to be rematerialized
      // we shouldn't be notifying here though, figure out where
      // a notification was missed elsewhere.
      this.notifyHasManyChange();
    }
  }

  notifyHasManyChange() {
    const { store, identifier: recordData } = this;
    store.notifyHasManyChange(recordData.type, recordData.id, recordData.lid, this.definition.key);
  }

  getData(): CollectionResourceRelationship {
    let payload: any = {};
    if (this.state.hasReceivedData) {
      payload.data = this.currentState.slice();
    }
    if (this.links) {
      payload.links = this.links;
    }
    if (this.meta) {
      payload.meta = this.meta;
    }

    return payload;
  }
}
