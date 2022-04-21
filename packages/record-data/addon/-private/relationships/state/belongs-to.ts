import type { RecordDataStoreWrapper } from '@ember-data/store/-private';
import type { Links, Meta, PaginationLinks } from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { ResolvedRegistry } from '@ember-data/types';
import type { RecordField, RecordType } from '@ember-data/types/utils';

import type { ManyRelationship } from '../..';
import type { Graph } from '../../graph';
import type { UpgradedRelationshipMeta } from '../../graph/-edge-definition';
import type { RelationshipState } from '../../graph/-state';
import { createState } from '../../graph/-state';
import { isNew } from '../../graph/-utils';
import type { DefaultSingleResourceRelationship } from '../../ts-interfaces/relationship-record-data';

export default class BelongsToRelationship<
  R extends ResolvedRegistry,
  T extends RecordType<R> = RecordType<R>,
  K extends RecordField<R, T> = RecordField<R, T>,
  RT extends RecordType<R> = RecordType<R>
> {
  declare localState: StableRecordIdentifier<RT> | null;
  declare remoteState: StableRecordIdentifier<RT> | null;
  declare transactionRef: number;

  declare graph: Graph<R>;
  declare store: RecordDataStoreWrapper<R>;
  declare definition: UpgradedRelationshipMeta;
  declare identifier: StableRecordIdentifier<T>;
  declare _state: RelationshipState | null;

  declare meta: Meta | null;
  declare links: Links | PaginationLinks | null;

  constructor(graph: Graph<R>, definition: UpgradedRelationshipMeta, identifier: StableRecordIdentifier<T>) {
    this.graph = graph;
    this.store = graph.store;
    this.definition = definition;
    this.identifier = identifier;
    this._state = null;
    this.transactionRef = 0;

    this.meta = null;
    this.links = null;

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
        (relationship as BelongsToRelationship | ManyRelationship).inverseDidDematerialize(this.identifier);
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
      if (this.localState === inverseRecordData && inverseRecordData !== null) {
        this.localState = null;
      }

      if (this.remoteState === inverseRecordData && inverseRecordData !== null) {
        this.remoteState = null;
        this.state.hasReceivedData = true;
        this.state.isEmpty = true;
        if (this.localState && !isNew(this.localState)) {
          this.localState = null;
        }
      }
    } else {
      this.state.hasDematerializedInverse = true;
    }
    this.notifyBelongsToChange();
  }

  getData(): DefaultSingleResourceRelationship<R, T, K> {
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
      // This allows dematerialized inverses to be rematerialized
      // we shouldn't be notifying here though, figure out where
      // a notification was missed elsewhere.
      this.notifyBelongsToChange();
    }
  }

  notifyBelongsToChange() {
    let recordData = this.identifier;
    this.store.notifyBelongsToChange(recordData.type, recordData.id, recordData.lid, this.definition.key);
  }

  clear() {
    this.localState = null;
    this.remoteState = null;
    this.state.hasReceivedData = false;
    this.state.isEmpty = true;
  }
}
