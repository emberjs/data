import { TestContext } from '@ember/test-helpers';

import type { EmberHooks } from '@warp-drive/diagnostic';

import { graphFor } from '@ember-data/graph/-private';
import type { CollectionEdge } from '@ember-data/graph/-private/edges/collection';
import type { ImplicitEdge } from '@ember-data/graph/-private/edges/implicit';
import type { ResourceEdge } from '@ember-data/graph/-private/edges/resource';
import type { Graph, GraphEdge } from '@ember-data/graph/-private/graph';
import type Model from '@ember-data/model';
import type Store from '@ember-data/store';
import type { CollectionRelationship } from '@ember-data/types/cache/relationship';
import type {
  CollectionResourceDocument,
  EmptyResourceDocument,
  JsonApiDocument,
  SingleResourceDocument,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import { setupTest } from '@warp-drive/diagnostic/ember';

class AbstractMap {
  constructor(
    private store: Store,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    private isImplicit: boolean
  ) {}

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

  get(identifier: StableRecordIdentifier, propertyName: string): GraphEdge {
    return graphFor(this.store).get(identifier, propertyName);
  }

  getImplicit(identifier: StableRecordIdentifier): Record<string, ImplicitEdge> {
    const rels = graphFor(this.store).identifiers.get(identifier);
    let implicits = Object.create(null) as Record<string, ImplicitEdge>;
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

export function isBelongsTo(relationship: GraphEdge): relationship is ResourceEdge {
  return relationship.definition.kind === 'belongsTo';
}

export function isImplicit(relationship: GraphEdge): relationship is ImplicitEdge {
  return relationship.definition.isImplicit;
}

export function isHasMany(relationship: GraphEdge): relationship is CollectionEdge {
  return relationship.definition.kind === 'hasMany';
}

function setToArray<T>(set: Set<T>): T[] {
  return Array.from(set);
}

export function stateOf(
  graph: Graph,
  rel: GraphEdge
): {
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
    // ensure we calculate what is otherwise lazy
    const data = graph.getData(rel.identifier, rel.definition.key) as CollectionRelationship;
    local = data.data || [];
    remote = rel.remoteState;
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
    return Promise.resolve({ data: null });
  }
}
class Serializer {
  static create() {
    return new this();
  }
  normalizeResponse(_, __, data: unknown) {
    return data;
  }
}

export interface UserRecord extends Model {
  name?: string;
  bestFriend?: UserRecord;
  bestFriends?: UserRecord[];
}

export interface Context extends TestContext {
  store: TestStore<UserRecord>;
  graph: AbstractGraph;
}

interface TestStore<T extends RecordInstance> extends Store {
  push(data: EmptyResourceDocument): null;
  push(data: SingleResourceDocument): T;
  push(data: CollectionResourceDocument): T[];
  push(data: JsonApiDocument): T | T[] | null;
}

export function setupGraphTest(hooks: EmberHooks<Context>) {
  setupTest(hooks);
  hooks.beforeEach(function (this: Context) {
    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', Serializer);
    this.store = this.owner.lookup('service:store') as TestStore<UserRecord>;
    this.graph = graphForTest(this.store);
  });
}
