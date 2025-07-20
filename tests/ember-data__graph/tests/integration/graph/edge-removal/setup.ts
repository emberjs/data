import type { Store } from '@warp-drive/core';
import type { CollectionEdge, Graph, GraphEdge, ImplicitEdge, ResourceEdge } from '@warp-drive/core/graph/-private';
import { graphFor } from '@warp-drive/core/graph/-private';
import type { ModelSchema } from '@warp-drive/core/types';
import type { CollectionRelationship } from '@warp-drive/core/types/cache/relationship';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { Type } from '@warp-drive/core/types/symbols';
import type { Hooks } from '@warp-drive/diagnostic/-types';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { setupTest } from '@warp-drive/diagnostic/ember';
import type Model from '@warp-drive/legacy/model';

class AbstractMap {
  declare private store: Store;
  declare private isImplicit: boolean;
  constructor(
    store: Store,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    isImplicit: boolean
  ) {
    this.store = store;
    this.isImplicit = isImplicit;
  }

  has(identifier: ResourceKey) {
    const graph = graphFor(this.store);
    return graph.identifiers.has(identifier);
  }
}

class AbstractGraph {
  public identifiers: AbstractMap;
  public implicit: { has(identifier: ResourceKey): boolean };
  declare private store: Store;

  constructor(store: Store) {
    this.store = store;
    this.identifiers = new AbstractMap(store, false);
    this.implicit = {
      has: (identifier) => {
        return Object.keys(this.getImplicit(identifier)).length > 0;
      },
    };
  }

  get(identifier: ResourceKey, propertyName: string): GraphEdge {
    return graphFor(this.store).get(identifier, propertyName);
  }

  getImplicit(identifier: ResourceKey): Record<string, ImplicitEdge> {
    const rels = graphFor(this.store).identifiers.get(identifier);
    const implicits = Object.create(null) as Record<string, ImplicitEdge>;
    if (rels) {
      Object.keys(rels).forEach((key) => {
        const rel = rels[key];
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
  remote: ResourceKey[];
  local: ResourceKey[];
} {
  let local: ResourceKey[];
  let remote: ResourceKey[];

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
    local = setToArray<ResourceKey>(rel.localMembers);
    remote = setToArray<ResourceKey>(rel.remoteMembers);
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
  normalizeResponse(_: Store, __: ModelSchema, data: unknown) {
    return data;
  }
}

export type UserRecord = Model & {
  name?: string;
  bestFriend?: UserRecord;
  bestFriends?: UserRecord[];
  [Type]: 'user';
};

export interface Context extends RenderingTestContext {
  store: Store;
  graph: AbstractGraph;
}

export function setupGraphTest(hooks: Hooks<Context>) {
  setupTest(hooks);
  hooks.beforeEach(function (this: Context) {
    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', Serializer);
    this.store = this.owner.lookup('service:store') as Store;
    this.graph = graphForTest(this.store);
  });
}
