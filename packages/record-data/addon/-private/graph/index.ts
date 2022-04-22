import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { RecordDataStoreWrapper, WeakCache } from '@ember-data/store/-private';
import type Store from '@ember-data/store/-private/system/store';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { ResolvedRegistry } from '@ember-data/types';
import type {
  BelongsToRelationshipFieldsFor,
  HasManyRelationshipFieldsFor,
  RecordType,
  RelatedType,
  RelationshipFieldsFor,
} from '@ember-data/types/utils';

import BelongsToRelationship from '../relationships/state/belongs-to';
import ManyRelationship from '../relationships/state/has-many';
import ImplicitRelationship from '../relationships/state/implicit';
import type { EdgeCache } from './-edge-definition';
import { isLHS, upgradeDefinition } from './-edge-definition';
import type {
  DeleteRecordOperation,
  LocalRelationshipOperation,
  RemoteRelationshipOperation,
  UnknownOperation,
} from './-operations';
import { assertValidRelationshipPayload, isBelongsTo, isHasMany, isImplicit } from './-utils';
import addToRelatedRecords from './operations/add-to-related-records';
import removeFromRelatedRecords from './operations/remove-from-related-records';
import replaceRelatedRecord from './operations/replace-related-record';
import replaceRelatedRecords, { syncRemoteToLocal } from './operations/replace-related-records';
import updateRelationshipOperation from './operations/update-relationship';

export type RelationshipEdge<
  R extends ResolvedRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> =
  | ImplicitRelationship<R, T, F, RelatedType<R, T, F>>
  | ManyRelationship<R, T, F, RelatedType<R, T, F>>
  | BelongsToRelationship<R, T, F, RelatedType<R, T, F>>;

const Graphs = new WeakCache<RecordDataStoreWrapper<ResolvedRegistry>, Graph<ResolvedRegistry>>(DEBUG ? 'graph' : '');
Graphs._generator = <R extends ResolvedRegistry>(wrapper: RecordDataStoreWrapper<R>) => {
  const graph = new Graph(wrapper);

  // in DEBUG we attach the graph to the main store for improved debuggability
  if (DEBUG) {
    Graphs.set(wrapper._store as unknown as RecordDataStoreWrapper<ResolvedRegistry>, graph);
  }

  return graph;
};

function isStore<R extends ResolvedRegistry>(maybeStore: Store<R> | RecordDataStoreWrapper<R>): maybeStore is Store<R> {
  return (maybeStore as Store<R>)._storeWrapper !== undefined;
}

function getWrapper<R extends ResolvedRegistry>(
  store: RecordDataStoreWrapper<R> | Store<R>
): RecordDataStoreWrapper<R> {
  return isStore(store) ? store._storeWrapper : store;
}

export function peekGraph<R extends ResolvedRegistry>(
  store: RecordDataStoreWrapper<R> | Store<R>
): Graph<R> | undefined {
  const store1 = getWrapper(store);
  return Graphs.get<RecordDataStoreWrapper<R>, Graph<R>>(store1);
}

export function graphFor<R extends ResolvedRegistry>(store: RecordDataStoreWrapper<R> | Store<R>): Graph<R> {
  return Graphs.lookup(getWrapper(store));
}

type RelationshipEdgeMap<
  R extends ResolvedRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> = {
  [F1 in F]: RelationshipEdge<R, T, F1>;
};

interface MappedEdges<R extends ResolvedRegistry> {
  clear(): void;
  delete<T extends RecordType<R>>(key: StableRecordIdentifier<T>): boolean;
  forEach<I>(
    callbackfn: <T extends RecordType<R>>(
      this: I,
      value: RelationshipEdgeMap<R, T>,
      key: StableRecordIdentifier<T>,
      map: MappedEdges<R>
    ) => void,
    thisArg: I
  ): void;
  get<T extends RecordType<R>>(key: StableRecordIdentifier<T>): RelationshipEdgeMap<R, T> | undefined;
  has<T extends RecordType<R>>(key: StableRecordIdentifier<T>): boolean;
  set<T extends RecordType<R>>(key: StableRecordIdentifier<T>, value: RelationshipEdgeMap<R, T>): this;
  readonly size: number;
}

export type PolymorphicLookupCache<R extends ResolvedRegistry> = {
  [T in RecordType<R>]: {
    [PT in RecordType<R>]: boolean;
  };
};

/*
 * Graph acts as the cache for relationship data. It allows for
 * us to ask about and update relationships for a given Identifier
 * without requiring other objects for that Identifier to be
 * instantiated (such as `InternalModel`, `RecordData` or a `Record`)
 *
 * This also allows for us to make more substantive changes to relationships
 * with increasingly minor alterations to other portions of the internals
 * over time.
 *
 * The graph is made up of nodes and edges. Each unique identifier gets
 * its own node, which is a dictionary with a list of that node's edges
 * (or connections) to other nodes. In `Model` terms, a node represents a
 * record instance, with each key (an edge) in the dictionary correlating
 * to either a `hasMany` or `belongsTo` field on that record instance.
 *
 * The value for each key, or `edge` is the identifier(s) the node relates
 * to in the graph from that key.
 */
export class Graph<R extends ResolvedRegistry> {
  declare _definitionCache: EdgeCache<R>;
  declare _potentialPolymorphicTypes: PolymorphicLookupCache<R>;
  declare identifiers: MappedEdges<R>;
  declare store: RecordDataStoreWrapper<R>;
  declare _willSyncRemote: boolean;
  declare _willSyncLocal: boolean;
  declare _pushedUpdates: {
    belongsTo: RemoteRelationshipOperation<R>[];
    hasMany: RemoteRelationshipOperation<R>[];
    deletions: DeleteRecordOperation<R>[];
  };
  declare _updatedRelationships: Set<ManyRelationship<R>>;
  declare _transaction: Set<ManyRelationship<R> | BelongsToRelationship<R>> | null;

  constructor(store: RecordDataStoreWrapper<R>) {
    this._definitionCache = Object.create(null);
    this._potentialPolymorphicTypes = Object.create(null);
    this.identifiers = new Map();
    this.store = store;
    this._willSyncRemote = false;
    this._willSyncLocal = false;
    this._pushedUpdates = { belongsTo: [], hasMany: [], deletions: [] };
    this._updatedRelationships = new Set();
    this._transaction = null;
  }

  has<T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
    identifier: StableRecordIdentifier<T>,
    propertyName: F
  ): boolean {
    let relationships = this.identifiers.get(identifier);
    if (!relationships) {
      return false;
    }
    return relationships[propertyName] !== undefined;
  }

  get<T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
    identifier: StableRecordIdentifier<T>,
    propertyName: F
  ): RelationshipEdge<R, T, F> {
    assert(`expected propertyName`, propertyName);
    let relationships = this.identifiers.get(identifier);
    if (!relationships) {
      relationships = Object.create(null) as RelationshipEdgeMap<R, T>;
      this.identifiers.set(identifier, relationships);
    }

    let relationship = relationships[propertyName];
    if (!relationship) {
      const info = upgradeDefinition(this, identifier, propertyName);
      assert(`Could not determine relationship information for ${identifier.type}.${propertyName}`, info !== null);
      const meta = isLHS(info, identifier.type, propertyName) ? info.lhs_definition : info.rhs_definition!;
      const Klass =
        meta.kind === 'hasMany'
          ? ManyRelationship
          : meta.kind === 'belongsTo'
          ? BelongsToRelationship
          : ImplicitRelationship;
      // @ts-expect-error the construct signatures do "match" in JS land, TS unhappy about sub-types
      relationship = relationships[propertyName] = new Klass(this, meta, identifier);
    }

    return relationship;
  }

  /*
   * Allows for the graph to dynamically discover polymorphic connections
   * without needing to walk prototype chains.
   *
   * Used by edges when an added `type` does not match the expected `type`
   * for that edge.
   *
   * Currently we assert before calling this. For a public API we will want
   * to call out to the schema manager to ask if we should consider these
   * types as equivalent for a given relationship.
   */
  registerPolymorphicType(type1: string, type2: string): void {
    const typeCache = this._potentialPolymorphicTypes;
    let t1 = typeCache[type1];
    if (!t1) {
      t1 = typeCache[type1] = Object.create(null);
    }
    t1![type2] = true;

    let t2 = typeCache[type2];
    if (!t2) {
      t2 = typeCache[type2] = Object.create(null);
    }
    t2![type1] = true;
  }

  /*
   TODO move this comment somewhere else
   implicit relationships are relationships which have not been declared but the inverse side exists on
   another record somewhere

   For example if there was:

   ```app/models/comment.js
   import Model, { attr } from '@ember-data/model';

   export default class Comment extends Model {
     @attr text;
   }
   ```

   and there is also:

   ```app/models/post.js
   import Model, { attr, hasMany } from '@ember-data/model';

   export default class Post extends Model {
     @attr title;
     @hasMany('comment') comments;
   }
   ```

   Then we would have a implicit 'post' relationship for the comment record in order
   to be do things like remove the comment from the post if the comment were to be deleted.
  */

  isReleasable<T extends RecordType<R>>(identifier: StableRecordIdentifier<T>): boolean {
    const relationships = this.identifiers.get(identifier) as RelationshipEdgeMap<R, T>;
    if (!relationships) {
      return true;
    }
    const keys = Object.keys(relationships);
    for (let i = 0; i < keys.length; i++) {
      const relationship = relationships[keys[i]];
      assert(`Expected a relationship`, relationship);
      if (relationship.definition.inverseIsAsync) {
        return false;
      }
    }
    return true;
  }

  unload<T extends RecordType<R>>(identifier: StableRecordIdentifier<T>) {
    const relationships = this.identifiers.get(identifier);

    if (relationships) {
      // cleans up the graph but retains some nodes
      // to allow for rematerialization
      Object.keys(relationships).forEach((key) => {
        let rel = relationships[key]!;
        destroyRelationship(rel);
        if (isImplicit(rel)) {
          delete relationships[key];
        }
      });
    }
  }

  remove<T extends RecordType<R>>(identifier: StableRecordIdentifier<T>) {
    this.unload(identifier);
    this.identifiers.delete(identifier);
  }

  /*
   * Remote state changes
   */
  push<T extends RecordType<R>, F extends RelationshipFieldsFor<R, T> | BelongsToRelationshipFieldsFor<R, T>>(
    op: RemoteRelationshipOperation<R, T, F>
  ) {
    if (op.op === 'deleteRecord') {
      this._pushedUpdates.deletions.push(op);
    } else if (op.op === 'replaceRelatedRecord') {
      this._pushedUpdates.belongsTo.push(op as unknown as RemoteRelationshipOperation<R, RecordType<R>>);
    } else {
      const relationship = this.get(op.record, op.field);
      assert(`Cannot push a remote update for an implicit relationship`, !relationship.definition.isImplicit);
      this._pushedUpdates[relationship.definition.kind].push(op);
    }
    if (!this._willSyncRemote) {
      this._willSyncRemote = true;
      const backburner = this.store._store._backburner;
      backburner.schedule('coalesce', this, this._flushRemoteQueue);
    }
  }

  /*
   * Local state changes
   */
  update(op: RemoteRelationshipOperation<R>, isRemote: true): void;
  update(op: LocalRelationshipOperation<R>, isRemote?: false): void;
  update(
    op: LocalRelationshipOperation<R> | RemoteRelationshipOperation<R> | UnknownOperation<R>,
    isRemote: boolean = false
  ): void {
    assert(
      `Cannot update an implicit relationship`,
      op.op === 'deleteRecord' || !isImplicit(this.get(op.record, op.field))
    );

    switch (op.op) {
      case 'updateRelationship':
        assert(`Can only perform the operation updateRelationship on remote state`, isRemote);
        if (DEBUG) {
          // in debug, assert payload validity eagerly
          // TODO add deprecations/assertion here for duplicates
          assertValidRelationshipPayload(this, op);
        }
        updateRelationshipOperation(this, op);
        break;
      case 'deleteRecord': {
        assert(`Can only perform the operation deleteRelationship on remote state`, isRemote);
        const identifier = op.record;
        const relationships = this.identifiers.get(identifier);

        if (relationships) {
          Object.keys(relationships).forEach((key) => {
            const rel = relationships[key]!;
            // works together with the has check
            delete relationships[key];
            removeCompletelyFromInverse(rel);
          });
          this.identifiers.delete(identifier);
        }
        break;
      }
      case 'replaceRelatedRecord':
        replaceRelatedRecord(this, op, isRemote);
        break;
      case 'addToRelatedRecords':
        addToRelatedRecords(this, op, isRemote);
        break;
      case 'removeFromRelatedRecords':
        removeFromRelatedRecords(this, op, isRemote);
        break;
      case 'replaceRelatedRecords':
        replaceRelatedRecords(this, op, isRemote);
        break;
      default:
        assert(`No local relationship update operation exists for '${op.op}'`);
    }
  }

  _scheduleLocalSync<T extends RecordType<R>, F extends HasManyRelationshipFieldsFor<R, T>>(
    relationship: ManyRelationship<R, T, F>
  ): void {
    this._updatedRelationships.add(relationship as unknown as ManyRelationship<R>);
    if (!this._willSyncLocal) {
      this._willSyncLocal = true;
      const backburner = this.store._store._backburner;
      backburner.schedule('sync', this, this._flushLocalQueue);
    }
  }

  _flushRemoteQueue(): void {
    if (!this._willSyncRemote) {
      return;
    }
    this._transaction = new Set();
    this._willSyncRemote = false;
    const { deletions, hasMany, belongsTo } = this._pushedUpdates;
    this._pushedUpdates.deletions = [];
    this._pushedUpdates.hasMany = [];
    this._pushedUpdates.belongsTo = [];

    for (let i = 0; i < deletions.length; i++) {
      this.update(deletions[i], true);
    }

    for (let i = 0; i < hasMany.length; i++) {
      this.update(hasMany[i], true);
    }

    for (let i = 0; i < belongsTo.length; i++) {
      this.update(belongsTo[i], true);
    }
    this._finalize();
  }

  _addToTransaction<T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
    relationship: ManyRelationship<R, T, F> | BelongsToRelationship<R, T, F>
  ): void {
    assert(`expected a transaction`, this._transaction !== null);
    relationship.transactionRef++;
    this._transaction.add(relationship as unknown as ManyRelationship<R>);
  }

  _finalize(): void {
    if (this._transaction) {
      this._transaction.forEach((v) => (v.transactionRef = 0));
      this._transaction = null;
    }
  }

  _flushLocalQueue(): void {
    if (!this._willSyncLocal) {
      return;
    }
    this._willSyncLocal = false;
    let updated = this._updatedRelationships;
    this._updatedRelationships = new Set();
    updated.forEach(syncRemoteToLocal);
  }

  willDestroy(): void {
    this.identifiers.clear();
    this.store = null as unknown as RecordDataStoreWrapper<R>;
  }

  destroy(): void {
    Graphs.delete(this.store);

    if (DEBUG) {
      Graphs.delete(this.store._store);
    }
  }
}

// Handle dematerialization for relationship `rel`.  In all cases, notify the
// relationship of the dematerialization: this is done so the relationship can
// notify its inverse which needs to update state
//
// If the inverse is sync, unloading this record is treated as a client-side
// delete, so we remove the inverse records from this relationship to
// disconnect the graph.  Because it's not async, we don't need to keep around
// the internalModel as an id-wrapper for references and because the graph is
// disconnected we can actually destroy the internalModel when checking for
// orphaned models.
function destroyRelationship<R extends ResolvedRegistry, T extends RecordType<R>>(rel: RelationshipEdge<R, T>) {
  if (isImplicit(rel)) {
    if (rel.graph.isReleasable(rel.identifier)) {
      removeCompletelyFromInverse(rel);
    }
    return;
  }

  rel.recordDataDidDematerialize();

  if (!rel.definition.inverseIsImplicit && !rel.definition.inverseIsAsync) {
    rel.state.isStale = true;
    rel.clear();

    // necessary to clear relationships in the ui from dematerialized records
    // hasMany is managed by InternalModel which calls `retreiveLatest` after
    // dematerializing the recordData instance.
    // but sync belongsTo require this since they don't have a proxy to update.
    // so we have to notify so it will "update" to null.
    // we should discuss whether we still care about this, probably fine to just
    // leave the ui relationship populated since the record is destroyed and
    // internally we've fully cleaned up.
    if (!rel.definition.isAsync) {
      if (isBelongsTo(rel)) {
        rel.notifyBelongsToChange();
      } else {
        rel.notifyHasManyChange();
      }
    }
  }
}

function removeCompletelyFromInverse<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>
>(relationship: RelationshipEdge<R, T, F>) {
  // we actually want a union of members and canonicalMembers
  // they should be disjoint but currently are not due to a bug
  const seen = Object.create(null);
  const { identifier } = relationship;
  const { inverseKey } = relationship.definition;

  const unload = <T1 extends RelatedType<R, T, F>>(inverseIdentifier: StableRecordIdentifier<T1>) => {
    const id = inverseIdentifier.lid;

    if (seen[id] === undefined) {
      if (relationship.graph.has(inverseIdentifier, inverseKey as RelationshipFieldsFor<R, T1>)) {
        const rel = relationship.graph.get(inverseIdentifier, inverseKey as RelationshipFieldsFor<R, T1>);
        rel.removeCompletelyFromOwn(identifier as StableRecordIdentifier<typeof rel.definition.type>);
      }
      seen[id] = true;
    }
  };

  if (isBelongsTo(relationship)) {
    if (relationship.localState) {
      unload(relationship.localState);
    }
    if (relationship.remoteState) {
      unload(relationship.remoteState);
    }

    if (!relationship.definition.isAsync) {
      relationship.clear();
    }

    relationship.localState = null;
  } else if (isHasMany(relationship)) {
    relationship.members.forEach(unload);
    relationship.canonicalMembers.forEach(unload);

    if (!relationship.definition.isAsync) {
      relationship.clear();
      relationship.notifyHasManyChange();
    }
  } else {
    relationship.members.forEach(unload);
    relationship.canonicalMembers.forEach(unload);
    relationship.clear();
  }
}
