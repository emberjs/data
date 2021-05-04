type Graph = import('../../graph').Graph;
type UpgradedMeta = import('../../graph/-edge-definition').UpgradedMeta;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;

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

  addCanonicalRecordData(recordData: StableRecordIdentifier, idx?: number) {
    if (!this.canonicalMembers.has(recordData)) {
      this.canonicalMembers.add(recordData);
      this.members.add(recordData);
    }
  }

  addRecordData(recordData: StableRecordIdentifier, idx?: number) {
    if (!this.members.has(recordData)) {
      this.members.add(recordData);
    }
  }

  removeRecordData(recordData: StableRecordIdentifier | null) {
    if (recordData && this.members.has(recordData)) {
      this.members.delete(recordData);
    }
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
