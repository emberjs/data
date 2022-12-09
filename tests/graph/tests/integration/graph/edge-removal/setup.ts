import { setupTest } from 'ember-qunit';

import { graphFor } from '@ember-data/graph/-private';
import type { ImplicitRelationship } from '@ember-data/graph/-private/graph';
import type BelongsToRelationship from '@ember-data/graph/-private/relationships/state/belongs-to';
import type ManyRelationship from '@ember-data/graph/-private/relationships/state/has-many';
import Store from '@ember-data/store';
import type { DSModel } from '@ember-data/types/q/ds-model';
import type {
  CollectionResourceDocument,
  EmptyResourceDocument,
  JsonApiDocument,
  SingleResourceDocument,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { Dict } from '@ember-data/types/q/utils';

class AbstractMap {
  constructor(private store: Store, private isImplicit: boolean) {}

  has(identifier: StableRecordIdentifier) {
    let graph = graphFor(this.store);
    return graph.identifiers.has(identifier);
  }
}

class AbstractGraph {
  public identifiers: AbstractMap;
  public implicit: { has(identifier: StableRecordIdentifier): boolean };

  constructor(private store: Store) {
    this.identifiers = new AbstractMap(store, false);
    this.implicit = {
      has: (identifier) => {
        return Object.keys(this.getImplicit(identifier)).length > 0;
      },
    };
  }

  get(
    identifier: StableRecordIdentifier,
    propertyName: string
  ): ManyRelationship | BelongsToRelationship | ImplicitRelationship {
    return graphFor(this.store).get(identifier, propertyName);
  }

  getImplicit(identifier: StableRecordIdentifier): Dict<ImplicitRelationship> {
    const rels = graphFor(this.store).identifiers.get(identifier);
    let implicits = Object.create(null);
    if (rels) {
      Object.keys(rels).forEach((key) => {
        let rel = rels[key]!;
        if (rel && isImplicit(rel)) {
          implicits[key] = rel;
        }
      });
    }
    return implicits;
  }
}

function graphForTest(store: Store) {
  return new AbstractGraph(store);
}

export function isBelongsTo(
  relationship: ManyRelationship | ImplicitRelationship | BelongsToRelationship
): relationship is BelongsToRelationship {
  return relationship.definition.kind === 'belongsTo';
}

export function isImplicit(
  relationship: ManyRelationship | ImplicitRelationship | BelongsToRelationship
): relationship is ImplicitRelationship {
  return relationship.definition.isImplicit;
}

export function isHasMany(
  relationship: ManyRelationship | ImplicitRelationship | BelongsToRelationship
): relationship is ManyRelationship {
  return relationship.definition.kind === 'hasMany';
}

function setToArray<T>(set: Set<T>): T[] {
  return Array.from(set);
}

export function stateOf(rel: BelongsToRelationship | ManyRelationship | ImplicitRelationship): {
  remote: StableRecordIdentifier[];
  local: StableRecordIdentifier[];
} {
  let local: StableRecordIdentifier[];
  let remote: StableRecordIdentifier[];

  if (isBelongsTo(rel)) {
    // we cast these to array form to make the tests more legible
    local = rel.localState ? [rel.localState] : [];
    remote = rel.remoteState ? [rel.remoteState] : [];
  } else if (isHasMany(rel)) {
    local = rel.localState.filter((m) => m !== null) as StableRecordIdentifier[];
    remote = rel.remoteState.filter((m) => m !== null) as StableRecordIdentifier[];
  } else {
    local = setToArray<StableRecordIdentifier>(rel.localMembers);
    remote = setToArray<StableRecordIdentifier>(rel.remoteMembers);
  }
  return {
    local,
    remote,
  };
}

class Adapter {
  static create() {
    return new this();
  }
  static updateRecord() {
    return Promise.resolve();
  }
  async deleteRecord() {
    return { data: null };
  }
}
class Serializer {
  static create() {
    return new this();
  }
  normalizeResponse(_, __, data) {
    return data;
  }
}

export interface UserRecord extends DSModel {
  name?: string;
  bestFriend?: UserRecord;
  bestFriends?: UserRecord[];
}

export interface Context {
  store: TestStore<UserRecord>;
  graph: AbstractGraph;
  owner: any;
}

interface TestStore<T extends RecordInstance> extends Store {
  push(data: EmptyResourceDocument): null;
  push(data: SingleResourceDocument): T;
  push(data: CollectionResourceDocument): T[];
  push(data: JsonApiDocument): T | T[] | null;
}

export function setupGraphTest(hooks) {
  setupTest(hooks);
  hooks.beforeEach(function (this: Context) {
    this.owner.register('service:store', Store);
    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', Serializer);
    this.store = this.owner.lookup('service:store');
    this.graph = graphForTest(this.store);
  });
}
