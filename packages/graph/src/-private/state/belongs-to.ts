import type { Links, Meta, PaginationLinks, SingleResourceRelationship } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type { UpgradedMeta } from '../-edge-definition';
import type { RelationshipState } from '../-state';
import { createState } from '../-state';

export default class BelongsToRelationship {
  declare definition: UpgradedMeta;
  declare identifier: StableRecordIdentifier;
  declare _state: RelationshipState | null;
  declare transactionRef: number;

  declare localState: StableRecordIdentifier | null;
  declare remoteState: StableRecordIdentifier | null;
  declare meta: Meta | null;
  declare links: Links | PaginationLinks | null;

  constructor(definition: UpgradedMeta, identifier: StableRecordIdentifier) {
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

  getData(): SingleResourceRelationship {
    let data!: StableRecordIdentifier | null;
    let payload: {
      data?: StableRecordIdentifier | null;
      links?: Links;
      meta?: Meta;
    } = {};

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
}
