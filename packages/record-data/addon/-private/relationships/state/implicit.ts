import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type { Graph } from '../../graph';
import type { UpgradedMeta } from '../../graph/-edge-definition';

/**
  @module @ember-data/store
*/
export default class ImplicitRelationship {
  declare graph: Graph;
  declare definition: UpgradedMeta;
  declare identifier: StableRecordIdentifier;

  declare members: Set<StableRecordIdentifier>;
  declare canonicalMembers: Set<StableRecordIdentifier>;

  constructor(graph: Graph, definition: UpgradedMeta, identifier: StableRecordIdentifier) {
    this.graph = graph;
    this.definition = definition;
    this.identifier = identifier;

    this.members = new Set<StableRecordIdentifier>();
    this.canonicalMembers = new Set<StableRecordIdentifier>();
  }

  removeCompletelyFromOwn(recordData: StableRecordIdentifier) {
    this.canonicalMembers.delete(recordData);
    this.members.delete(recordData);
  }

  clear() {
    this.canonicalMembers.clear();
    this.members.clear();
  }
}
