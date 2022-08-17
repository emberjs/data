import type { Links, Meta, PaginationLinks, SingleResourceRelationship } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordDataStoreWrapper } from '@ember-data/types/q/record-data-store-wrapper';

import type { Graph } from '../../graph';
import type { UpgradedMeta } from '../../graph/-edge-definition';
import type { RelationshipState } from '../../graph/-state';
import { createState } from '../../graph/-state';
import { isNew, notifyChange } from '../../graph/-utils';

export default class BelongsToRelationship {
  declare localState: StableRecordIdentifier | null;
  declare remoteState: StableRecordIdentifier | null;
  declare transactionRef: number;

  declare graph: Graph;
  declare store: RecordDataStoreWrapper;
  declare definition: UpgradedMeta;
  declare identifier: StableRecordIdentifier;
  declare _state: RelationshipState | null;

  declare meta: Meta | null;
  declare links: Links | PaginationLinks | null;

  constructor(graph: Graph, definition: UpgradedMeta, identifier: StableRecordIdentifier) {
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

    notifyChange(this.graph, this.identifier, this.definition.key);
  }

  getData(): SingleResourceRelationship {
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

    return payload;
  }

  clear() {
    this.localState = null;
    this.remoteState = null;
    this.state.hasReceivedData = false;
    this.state.isEmpty = true;
  }
}
