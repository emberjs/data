import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type { UpgradedMeta } from '../../graph/-edge-definition';

/**
  @module @ember-data/store
*/
export default class ImplicitRelationship {
  declare definition: UpgradedMeta;
  declare identifier: StableRecordIdentifier;

  declare members: Set<StableRecordIdentifier>;
  declare canonicalMembers: Set<StableRecordIdentifier>;

  constructor(definition: UpgradedMeta, identifier: StableRecordIdentifier) {
    this.definition = definition;
    this.identifier = identifier;

    this.members = new Set<StableRecordIdentifier>();
    this.canonicalMembers = new Set<StableRecordIdentifier>();
  }

  clear() {
    this.canonicalMembers.clear();
    this.members.clear();
    throw new Error('clear called');
  }
}
