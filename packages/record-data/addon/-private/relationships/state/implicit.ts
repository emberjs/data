import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { ResolvedRegistry } from '@ember-data/types';
import type { RecordField, RecordType } from '@ember-data/types/utils';

import type { Graph } from '../../graph';
import type { UpgradedRelationshipMeta } from '../../graph/-edge-definition';

/**
  @module @ember-data/store
*/
export default class ImplicitRelationship<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  K extends RecordField<R, T>,
  RT extends RecordType<R>
> {
  declare graph: Graph<R>;
  declare definition: UpgradedRelationshipMeta<R, T, K, RT>;
  declare identifier: StableRecordIdentifier<T>;

  declare members: Set<StableRecordIdentifier<RT>>;
  declare canonicalMembers: Set<StableRecordIdentifier<RT>>;

  constructor(
    graph: Graph<R>,
    definition: UpgradedRelationshipMeta<R, T, K, RT>,
    identifier: StableRecordIdentifier<T>
  ) {
    this.graph = graph;
    this.definition = definition;
    this.identifier = identifier;

    this.members = new Set();
    this.canonicalMembers = new Set();
  }

  addCanonicalMember(identifier: StableRecordIdentifier<RT>, idx?: number) {
    if (!this.canonicalMembers.has(identifier)) {
      this.canonicalMembers.add(identifier);
      this.members.add(identifier);
    }
  }

  addMember(identifier: StableRecordIdentifier<RT>, idx?: number) {
    if (!this.members.has(identifier)) {
      this.members.add(identifier);
    }
  }

  removeMember(identifier: StableRecordIdentifier<RT> | null) {
    if (identifier && this.members.has(identifier)) {
      this.members.delete(identifier);
    }
  }

  removeCompletelyFromOwn(identifier: StableRecordIdentifier<RT>) {
    this.canonicalMembers.delete(identifier);
    this.members.delete(identifier);
  }

  clear() {
    this.canonicalMembers.clear();
    this.members.clear();
  }
}
