import { setupTest } from 'ember-qunit';

import type {
  BelongsToRelationship,
  ManyRelationship,
  Relationship as ImplicitRelationship,
} from '@ember-data/record-data/-private';
import { graphFor } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { Dict } from '@ember-data/store/-private/ts-interfaces/utils';
import { ResolvedRegistry } from '@ember-data/types';
import {
  BelongsToRelationshipFieldsFor,
  HasManyRelationshipFieldsFor,
  RecordType,
  RelationshipFieldsFor,
} from '@ember-data/types/utils';

class AbstractMap<R extends ResolvedRegistry> {
  constructor(private store: Store<R>, private isImplicit: boolean) {}

  has<T extends RecordType<R>>(identifier: StableRecordIdentifier<T>) {
    let graph = graphFor(this.store._storeWrapper);
    return graph.identifiers.has(identifier);
  }
}

class AbstractGraph<R extends ResolvedRegistry> {
  public identifiers: AbstractMap<R>;
  public implicit: { has<T extends RecordType<R>>(identifier: StableRecordIdentifier<T>): boolean };

  constructor(private store: Store<R>) {
    this.identifiers = new AbstractMap(store, false);
    this.implicit = {
      has: (identifier) => {
        return Object.keys(this.getImplicit(identifier)).length > 0;
      },
    };
  }

  get<T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
    identifier: StableRecordIdentifier<T>,
    propertyName: F
  ): ManyRelationship<R, T, F> | BelongsToRelationship<R, T, F> | ImplicitRelationship<R, T, F> {
    return graphFor(this.store._storeWrapper).get(identifier, propertyName);
  }

  getImplicit<T extends RecordType<R>>(identifier: StableRecordIdentifier<T>): Dict<ImplicitRelationship<R, T>> {
    const rels = graphFor(this.store._storeWrapper).identifiers.get(identifier);
    let implicits = Object.create(null);
    if (rels) {
      Object.keys(rels).forEach((key) => {
        let rel = rels[key]!;
        if (isImplicit(rel)) {
          implicits[key] = rel;
        }
      });
    }
    return implicits;
  }
}

function graphForTest<R extends ResolvedRegistry>(store: Store<R>) {
  return new AbstractGraph(store);
}

export function isBelongsTo<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  MF extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>,
  BF extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>,
  IF extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
>(
  relationship:
    | ManyRelationship<R, T, IF>
    | ManyRelationship<R, T, MF>
    | ImplicitRelationship<R, T, IF>
    | BelongsToRelationship<R, T, BF>
    | BelongsToRelationship<R, T, IF>
): relationship is BelongsToRelationship<R, T, BF> {
  return relationship.definition.kind === 'belongsTo';
}

export function isImplicit<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  MF extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>,
  BF extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>,
  IF extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
>(
  relationship:
    | ManyRelationship<R, T, IF>
    | ManyRelationship<R, T, MF>
    | ImplicitRelationship<R, T, IF>
    | BelongsToRelationship<R, T, IF>
    | BelongsToRelationship<R, T, BF>
): relationship is ImplicitRelationship<R, T, IF> {
  return relationship.definition.isImplicit;
}

export function isHasMany<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  MF extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>,
  BF extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>,
  IF extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
>(
  relationship:
    | ManyRelationship<R, T, IF>
    | ManyRelationship<R, T, MF>
    | ImplicitRelationship<R, T, IF>
    | BelongsToRelationship<R, T, IF>
    | BelongsToRelationship<R, T, BF>
): relationship is ManyRelationship<R, T, MF> {
  return relationship.definition.kind === 'hasMany';
}

function setToArray<T>(set: Set<T>): T[] {
  return Array.from(set);
}

export function stateOf<R extends ResolvedRegistry, T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
  rel: BelongsToRelationship<R, T, F> | ManyRelationship<R, T, F> | ImplicitRelationship<R, T, F>
): {
  remote: StableRecordIdentifier<string>[];
  local: StableRecordIdentifier<string>[];
} {
  let local: StableRecordIdentifier<string>[];
  let remote: StableRecordIdentifier<string>[];

  if (isBelongsTo(rel)) {
    // we cast these to array form to make the tests more legible
    local = rel.localState ? [rel.localState] : [];
    remote = rel.remoteState ? [rel.remoteState] : [];
  } else if (isHasMany(rel)) {
    local = rel.currentState.filter((m) => m !== null) as StableRecordIdentifier[];
    remote = rel.canonicalState.filter((m) => m !== null) as StableRecordIdentifier[];
  } else if (isImplicit(rel)) {
    local = setToArray<StableRecordIdentifier>(rel.members);
    remote = setToArray<StableRecordIdentifier>(rel.canonicalMembers);
  } else {
    throw new Error(`unknown relationship type`);
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

export interface Context<R extends ResolvedRegistry> {
  store: TestStore<R>;
  graph: AbstractGraph<R>;
  owner: any;
}

interface TestStore<R extends ResolvedRegistry> extends Store<R> {}

export function setupGraphTest<R extends ResolvedRegistry>(hooks) {
  setupTest(hooks);
  hooks.beforeEach(function (this: Context<R>) {
    this.owner.register('service:store', Store);
    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', Serializer);
    this.store = this.owner.lookup('service:store');
    this.graph = graphForTest(this.store);
  });
}
