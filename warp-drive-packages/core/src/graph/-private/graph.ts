import { LOG_GRAPH } from '@warp-drive/core/build-config/debugging';
import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { Store } from '../../store/-private.ts';
import type { CacheCapabilitiesManager, StableRecordIdentifier } from '../../types.ts';
import { getOrSetGlobal, peekTransient, setTransient } from '../../types/-private.ts';
import type { RelationshipDiff } from '../../types/cache.ts';
import type { MergeOperation } from '../../types/cache/operations.ts';
import type { CollectionRelationship, ResourceRelationship } from '../../types/cache/relationship.ts';
import type {
  DeleteRecordOperation,
  LocalRelationshipOperation,
  RemoteRelationshipOperation,
  UnknownOperation,
} from '../../types/graph.ts';
import { rollbackRelationship } from './-diff.ts';
import type { EdgeCache, UpgradedMeta } from './-edge-definition.ts';
import { isLHS, upgradeDefinition } from './-edge-definition.ts';
import {
  assertValidRelationshipPayload,
  checkIfNew,
  forAllRelatedIdentifiers,
  getStore,
  isBelongsTo,
  isHasMany,
  isImplicit,
  notifyChange,
  removeIdentifierCompletelyFromRelationship,
} from './-utils.ts';
import { type CollectionEdge, createCollectionEdge, legacyGetCollectionRelationshipData } from './edges/collection.ts';
import type { ImplicitEdge, ImplicitMeta } from './edges/implicit.ts';
import { createImplicitEdge } from './edges/implicit.ts';
import { createResourceEdge, legacyGetResourceRelationshipData, type ResourceEdge } from './edges/resource.ts';
import addToRelatedRecords from './operations/add-to-related-records.ts';
import { mergeIdentifier } from './operations/merge-identifier.ts';
import removeFromRelatedRecords from './operations/remove-from-related-records.ts';
import replaceRelatedRecord from './operations/replace-related-record.ts';
import replaceRelatedRecords from './operations/replace-related-records.ts';
import updateRelationshipOperation from './operations/update-relationship.ts';

export type GraphEdge = ImplicitEdge | CollectionEdge | ResourceEdge;

export const Graphs: Map<CacheCapabilitiesManager, Graph> = getOrSetGlobal(
  'Graphs',
  new Map<CacheCapabilitiesManager, Graph>()
);

type PendingOps = {
  belongsTo?: Map<string, Map<string, RemoteRelationshipOperation[]>>;
  hasMany?: Map<string, Map<string, RemoteRelationshipOperation[]>>;
  deletions: DeleteRecordOperation[];
};

/*
 * Graph acts as the cache for relationship data. It allows for
 * us to ask about and update relationships for a given Identifier
 * without requiring other objects for that Identifier to be
 * instantiated (such as `RecordData` or a `Record`)
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
export class Graph {
  declare _definitionCache: EdgeCache;
  declare _metaCache: Record<string, Record<string, UpgradedMeta>>;
  declare _potentialPolymorphicTypes: Record<string, Record<string, boolean>>;
  declare identifiers: Map<StableRecordIdentifier, Record<string, GraphEdge>>;
  declare store: CacheCapabilitiesManager;
  declare _realStore: Store;
  declare isDestroyed: boolean;
  declare _willSyncRemote: boolean;
  declare _willSyncLocal: boolean;
  declare silenceNotifications: boolean;
  declare _pushedUpdates: PendingOps;
  declare _updatedRelationships: Set<CollectionEdge>;
  declare _transaction: number | null;
  declare _removing: StableRecordIdentifier | null;

  constructor(store: CacheCapabilitiesManager) {
    this._definitionCache = Object.create(null) as EdgeCache;
    this._metaCache = Object.create(null) as Record<string, Record<string, UpgradedMeta>>;
    this._potentialPolymorphicTypes = Object.create(null) as Record<string, Record<string, boolean>>;
    this.identifiers = new Map();
    this.store = store;
    this._realStore = (store as unknown as { _store: Store })._store;
    this.isDestroyed = false;
    this._willSyncRemote = false;
    this._willSyncLocal = false;
    this._pushedUpdates = {
      belongsTo: undefined,
      hasMany: undefined,
      deletions: [],
    };
    this._updatedRelationships = new Set();
    this._transaction = null;
    this._removing = null;
    this.silenceNotifications = false;
  }

  has(identifier: StableRecordIdentifier, propertyName: string): boolean {
    const relationships = this.identifiers.get(identifier);
    if (!relationships) {
      return false;
    }
    return relationships[propertyName] !== undefined;
  }

  getDefinition(identifier: StableRecordIdentifier, propertyName: string): UpgradedMeta {
    let defs = this._metaCache[identifier.type];
    let meta: UpgradedMeta | null | undefined = defs?.[propertyName];
    if (!meta) {
      const info = /*#__NOINLINE__*/ upgradeDefinition(this, identifier, propertyName);
      assert(`Could not determine relationship information for ${identifier.type}.${propertyName}`, info !== null);

      // if (info.rhs_definition?.kind === 'implicit') {
      // we should possibly also do this
      // but it would result in being extremely permissive for other relationships by accident
      // this.registerPolymorphicType(info.rhs_baseModelName, identifier.type);
      // }

      meta = /*#__NOINLINE__*/ isLHS(info, identifier.type, propertyName) ? info.lhs_definition : info.rhs_definition!;
      defs = this._metaCache[identifier.type] = defs || {};
      defs[propertyName] = meta;
    }
    return meta;
  }

  get(identifier: StableRecordIdentifier, propertyName: string): GraphEdge {
    assert(`expected propertyName`, propertyName);
    let relationships = this.identifiers.get(identifier);
    if (!relationships) {
      relationships = Object.create(null) as Record<string, GraphEdge>;
      this.identifiers.set(identifier, relationships);
    }

    let relationship = relationships[propertyName];
    if (!relationship) {
      const meta = this.getDefinition(identifier, propertyName);

      if (meta.kind === 'belongsTo') {
        relationship = relationships[propertyName] = createResourceEdge(meta, identifier);
      } else if (meta.kind === 'hasMany') {
        relationship = relationships[propertyName] = createCollectionEdge(meta, identifier);
      } else {
        assert(`Expected kind to be implicit`, meta.kind === 'implicit' && meta.isImplicit === true);
        relationship = relationships[propertyName] = createImplicitEdge(meta as ImplicitMeta, identifier);
      }
    }

    return relationship;
  }

  getData(identifier: StableRecordIdentifier, propertyName: string): ResourceRelationship | CollectionRelationship {
    const relationship = this.get(identifier, propertyName);

    assert(`Cannot getData() on an implicit relationship`, !isImplicit(relationship));

    if (isBelongsTo(relationship)) {
      return legacyGetResourceRelationshipData(relationship, false);
    }

    return legacyGetCollectionRelationshipData(relationship, false);
  }

  getRemoteData(
    identifier: StableRecordIdentifier,
    propertyName: string
  ): ResourceRelationship | CollectionRelationship {
    const relationship = this.get(identifier, propertyName);

    assert(`Cannot getRemoteData() on an implicit relationship`, !isImplicit(relationship));

    if (isBelongsTo(relationship)) {
      return legacyGetResourceRelationshipData(relationship, true);
    }

    return legacyGetCollectionRelationshipData(relationship, true);
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
      t1 = typeCache[type1] = Object.create(null) as Record<string, boolean>;
    }
    t1[type2] = true;

    let t2 = typeCache[type2];
    if (!t2) {
      t2 = typeCache[type2] = Object.create(null) as Record<string, boolean>;
    }
    t2[type1] = true;
  }

  isReleasable(identifier: StableRecordIdentifier): boolean {
    const relationships = this.identifiers.get(identifier);
    if (!relationships) {
      if (LOG_GRAPH) {
        // eslint-disable-next-line no-console
        console.log(`graph: RELEASABLE ${String(identifier)}`);
      }
      return true;
    }
    const keys = Object.keys(relationships);
    for (let i = 0; i < keys.length; i++) {
      const relationship: GraphEdge = relationships[keys[i]];
      // account for previously unloaded relationships
      // typically from a prior deletion of a record that pointed to this one implicitly
      if (relationship === undefined) {
        continue;
      }
      assert(`Expected a relationship`, relationship);
      if (relationship.definition.inverseIsAsync && !checkIfNew(this._realStore, identifier)) {
        if (LOG_GRAPH) {
          // eslint-disable-next-line no-console
          console.log(`graph: <<NOT>> RELEASABLE ${String(identifier)}`);
        }
        return false;
      }
    }
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`graph: RELEASABLE ${String(identifier)}`);
    }
    return true;
  }

  unload(identifier: StableRecordIdentifier, silenceNotifications?: boolean): void {
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`graph: unload ${String(identifier)}`);
    }
    const relationships = this.identifiers.get(identifier);

    if (relationships) {
      // cleans up the graph but retains some nodes
      // to allow for rematerialization
      Object.keys(relationships).forEach((key) => {
        const rel = relationships[key];
        if (!rel) {
          return;
        }
        /*#__NOINLINE__*/ destroyRelationship(this, rel, silenceNotifications);
        if (/*#__NOINLINE__*/ isImplicit(rel)) {
          // @ts-expect-error
          relationships[key] = undefined;
        }
      });
    }
  }

  _isDirty(identifier: StableRecordIdentifier, field: string): boolean {
    const relationships = this.identifiers.get(identifier);
    if (!relationships) {
      return false;
    }
    const relationship = relationships[field];
    if (!relationship) {
      return false;
    }
    if (isBelongsTo(relationship)) {
      return relationship.localState !== relationship.remoteState;
    } else if (isHasMany(relationship)) {
      const hasAdditions = relationship.additions !== null && relationship.additions.size > 0;
      const hasRemovals = relationship.removals !== null && relationship.removals.size > 0;
      return hasAdditions || hasRemovals || isReordered(relationship);
    }
    return false;
  }

  getChanged(identifier: StableRecordIdentifier): Map<string, RelationshipDiff> {
    const relationships = this.identifiers.get(identifier);
    const changed = new Map<string, RelationshipDiff>();

    if (!relationships) {
      return changed;
    }

    const keys = Object.keys(relationships);
    for (let i = 0; i < keys.length; i++) {
      const field = keys[i];
      const relationship = relationships[field];
      if (!relationship) {
        continue;
      }
      if (isBelongsTo(relationship)) {
        if (relationship.localState !== relationship.remoteState) {
          changed.set(field, {
            kind: 'resource',
            remoteState: relationship.remoteState,
            localState: relationship.localState,
          });
        }
      } else if (isHasMany(relationship)) {
        const hasAdditions = relationship.additions !== null && relationship.additions.size > 0;
        const hasRemovals = relationship.removals !== null && relationship.removals.size > 0;
        const reordered = isReordered(relationship);

        if (hasAdditions || hasRemovals || reordered) {
          changed.set(field, {
            kind: 'collection',
            additions: new Set(relationship.additions),
            removals: new Set(relationship.removals),
            remoteState: relationship.remoteState,
            localState: legacyGetCollectionRelationshipData(relationship, false).data || [],
            reordered,
          });
        }
      }
    }

    return changed;
  }

  hasChanged(identifier: StableRecordIdentifier): boolean {
    const relationships = this.identifiers.get(identifier);
    if (!relationships) {
      return false;
    }
    const keys = Object.keys(relationships);
    for (let i = 0; i < keys.length; i++) {
      if (this._isDirty(identifier, keys[i])) {
        return true;
      }
    }
    return false;
  }

  rollback(identifier: StableRecordIdentifier): string[] {
    const relationships = this.identifiers.get(identifier);
    const changed: string[] = [];
    if (!relationships) {
      return changed;
    }
    const keys = Object.keys(relationships);
    for (let i = 0; i < keys.length; i++) {
      const field = keys[i];
      const relationship = relationships[field];
      if (!relationship) {
        continue;
      }

      if (this._isDirty(identifier, field)) {
        rollbackRelationship(this, identifier, field, relationship as CollectionEdge | ResourceEdge);
        changed.push(field);
      }
    }

    return changed;
  }

  remove(identifier: StableRecordIdentifier): void {
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`graph: remove ${String(identifier)}`);
    }
    assert(`Cannot remove ${String(identifier)} while still removing ${String(this._removing)}`, !this._removing);
    this._removing = identifier;
    this.unload(identifier);
    this.identifiers.delete(identifier);
    this._removing = null;
  }

  /*
   * Remote state changes
   */
  push(op: RemoteRelationshipOperation): void {
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`graph: push ${String(op.record)}`, op);
    }
    if (op.op === 'deleteRecord') {
      this._pushedUpdates.deletions.push(op);
    } else {
      const definition = this.getDefinition(op.record, op.field);
      assert(`Cannot push a remote update for an implicit relationship`, definition.kind !== 'implicit');
      addPending(this._pushedUpdates, definition, op);
    }
    if (!this._willSyncRemote) {
      this._willSyncRemote = true;
      const store = getStore(this.store);
      if (!store._cbs) {
        store._run(() => this._flushRemoteQueue());
      } else {
        store._schedule('coalesce', () => this._flushRemoteQueue());
      }
    }
  }

  /*
   * Local state changes
   */
  update(op: RemoteRelationshipOperation | MergeOperation, isRemote: true): void;
  update(op: LocalRelationshipOperation, isRemote?: false): void;
  update(
    op: MergeOperation | LocalRelationshipOperation | RemoteRelationshipOperation | UnknownOperation,
    isRemote = false
  ): void {
    assert(
      `Cannot update an implicit relationship`,
      op.op === 'deleteRecord' || op.op === 'mergeIdentifiers' || !isImplicit(this.get(op.record, op.field))
    );
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`graph: update (${isRemote ? 'remote' : 'local'}) ${String(op.record)}`, op);
    }

    switch (op.op) {
      case 'mergeIdentifiers': {
        const relationships = this.identifiers.get(op.record);
        if (relationships) {
          /*#__NOINLINE__*/ mergeIdentifier(this, op, relationships);
        }
        break;
      }
      case 'update':
      case 'updateRelationship':
        assert(`Can only perform the operation updateRelationship on remote state`, isRemote);
        if (DEBUG) {
          // in debug, assert payload validity eagerly
          // TODO add deprecations/assertion here for duplicates
          assertValidRelationshipPayload(this, op);
        }
        /*#__NOINLINE__*/ updateRelationshipOperation(this, op);
        break;
      case 'deleteRecord': {
        assert(`Can only perform the operation deleteRelationship on remote state`, isRemote);
        const identifier = op.record;
        const relationships = this.identifiers.get(identifier);

        if (relationships) {
          Object.keys(relationships).forEach((key) => {
            const rel = relationships[key];
            if (!rel) {
              return;
            }
            // works together with the has check
            // @ts-expect-error
            relationships[key] = undefined;
            /*#__NOINLINE__*/ removeCompletelyFromInverse(this, rel);
          });
          this.identifiers.delete(identifier);
        }
        break;
      }
      case 'replaceRelatedRecord':
        /*#__NOINLINE__*/ replaceRelatedRecord(this, op, isRemote);
        break;
      case 'add':
        /*#__NOINLINE__*/ addToRelatedRecords(this, op, isRemote);
        break;
      case 'remove':
        /*#__NOINLINE__*/ removeFromRelatedRecords(this, op, isRemote);
        break;
      case 'replaceRelatedRecords':
        /*#__NOINLINE__*/ replaceRelatedRecords(this, op, isRemote);
        break;
      default:
        assert(`No local relationship update operation exists for '${op.op}'`);
    }
  }

  _scheduleLocalSync(relationship: CollectionEdge): void {
    this._updatedRelationships.add(relationship);
    if (!this._willSyncLocal) {
      this._willSyncLocal = true;
      getStore(this.store)._schedule('sync', () => this._flushLocalQueue());
    }
  }

  _flushRemoteQueue(): void {
    if (!this._willSyncRemote) {
      return;
    }
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(`Graph: Initialized Transaction`);
    }
    let transactionRef = peekTransient<number>('transactionRef') ?? 0;
    this._transaction = ++transactionRef;
    setTransient('transactionRef', transactionRef);
    this._willSyncRemote = false;
    const updates = this._pushedUpdates;
    const { deletions, hasMany, belongsTo } = updates;
    updates.deletions = [];
    updates.hasMany = undefined;
    updates.belongsTo = undefined;

    for (let i = 0; i < deletions.length; i++) {
      this.update(deletions[i], true);
    }

    if (hasMany) {
      flushPending(this, hasMany);
    }
    if (belongsTo) {
      flushPending(this, belongsTo);
    }

    this._transaction = null;
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`Graph: transaction finalized`);
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }

  _addToTransaction(relationship: CollectionEdge | ResourceEdge): void {
    assert(`expected a transaction`, this._transaction !== null);
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`Graph: ${String(relationship.identifier)} ${relationship.definition.key} added to transaction`);
    }
    relationship.transactionRef = this._transaction;
  }

  _flushLocalQueue(): void {
    if (!this._willSyncLocal) {
      return;
    }

    if (this.silenceNotifications) {
      this.silenceNotifications = false;
      this._updatedRelationships = new Set();
      return;
    }

    this._willSyncLocal = false;
    const updated = this._updatedRelationships;
    this._updatedRelationships = new Set();
    updated.forEach((rel) => notifyChange(this, rel));
  }

  destroy(): void {
    Graphs.delete(this.store);

    if (DEBUG) {
      Graphs.delete(getStore(this.store) as unknown as CacheCapabilitiesManager);
      if (Graphs.size) {
        Graphs.forEach((_, key) => {
          assert(
            `Memory Leak Detected, likely the test or app instance previous to this was not torn down properly`,
            !(key as unknown as { isDestroyed: boolean }).isDestroyed &&
              !(key as unknown as { isDestroying: boolean }).isDestroying
          );
        });
      }
    }

    this.identifiers.clear();
    this.store = null as unknown as CacheCapabilitiesManager;
    this.isDestroyed = true;
  }
}

function flushPending(graph: Graph, ops: Map<string, Map<string, RemoteRelationshipOperation[]>>) {
  ops.forEach((type) => {
    type.forEach((opList) => {
      flushPendingList(graph, opList);
    });
  });
}
function flushPendingList(graph: Graph, opList: RemoteRelationshipOperation[]) {
  for (let i = 0; i < opList.length; i++) {
    graph.update(opList[i], true);
  }
}

// Handle dematerialization for relationship `rel`.  In all cases, notify the
// relationship of the dematerialization: this is done so the relationship can
// notify its inverse which needs to update state
//
// If the inverse is sync, unloading this record is treated as a client-side
// delete, so we remove the inverse records from this relationship to
// disconnect the graph.  Because it's not async, we don't need to keep around
// the identifier as an id-wrapper for references
function destroyRelationship(graph: Graph, rel: GraphEdge, silenceNotifications?: boolean) {
  if (isImplicit(rel)) {
    if (graph.isReleasable(rel.identifier)) {
      /*#__NOINLINE__*/ removeCompletelyFromInverse(graph, rel);
    }
    return;
  }

  const { identifier } = rel;
  const { inverseKey } = rel.definition;

  if (!rel.definition.inverseIsImplicit) {
    /*#__NOINLINE__*/ forAllRelatedIdentifiers(rel, (inverseIdentifer: StableRecordIdentifier) =>
      /*#__NOINLINE__*/ notifyInverseOfDematerialization(
        graph,
        inverseIdentifer,
        inverseKey,
        identifier,
        silenceNotifications
      )
    );
  }

  if (!rel.definition.inverseIsImplicit && !rel.definition.inverseIsAsync) {
    rel.state.isStale = true;
    /*#__NOINLINE__*/ clearRelationship(rel);

    // necessary to clear relationships in the ui from dematerialized records
    // hasMany is managed by Model which calls `retreiveLatest` after
    // dematerializing the resource-cache instance.
    // but sync belongsTo requires this since they don't have a proxy to update.
    // so we have to notify so it will "update" to null.
    // we should discuss whether we still care about this, probably fine to just
    // leave the ui relationship populated since the record is destroyed and
    // internally we've fully cleaned up.
    if (!rel.definition.isAsync && !silenceNotifications) {
      /*#__NOINLINE__*/ notifyChange(graph, rel);
    }
  }
}

function notifyInverseOfDematerialization(
  graph: Graph,
  inverseIdentifier: StableRecordIdentifier,
  inverseKey: string,
  identifier: StableRecordIdentifier,
  silenceNotifications?: boolean
) {
  if (!graph.has(inverseIdentifier, inverseKey)) {
    return;
  }

  const relationship = graph.get(inverseIdentifier, inverseKey);
  assert(`expected no implicit`, !isImplicit(relationship));

  // For remote members, it is possible that inverseRecordData has already been associated to
  // to another record. For such cases, do not dematerialize the inverseRecordData
  if (!isBelongsTo(relationship) || !relationship.localState || identifier === relationship.localState) {
    /*#__NOINLINE__*/ removeDematerializedInverse(graph, relationship, identifier, silenceNotifications);
  }
}

function clearRelationship(relationship: CollectionEdge | ResourceEdge) {
  if (isBelongsTo(relationship)) {
    relationship.localState = null;
    relationship.remoteState = null;
    relationship.state.hasReceivedData = false;
    relationship.state.isEmpty = true;
  } else {
    relationship.remoteMembers.clear();
    relationship.remoteState = [];
    relationship.additions = null;
    relationship.removals = null;
    relationship.localState = null;
  }
}

function removeDematerializedInverse(
  graph: Graph,
  relationship: CollectionEdge | ResourceEdge,
  inverseIdentifier: StableRecordIdentifier,
  silenceNotifications?: boolean
) {
  if (isBelongsTo(relationship)) {
    const localInverse = relationship.localState;
    if (!relationship.definition.isAsync || (localInverse && checkIfNew(graph._realStore, localInverse))) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      // if the record being unloaded only exists on the client, we similarly
      // treat it as a client side delete
      if (relationship.localState === localInverse && localInverse !== null) {
        relationship.localState = null;
      }

      if (relationship.remoteState === localInverse && localInverse !== null) {
        relationship.remoteState = null;
        relationship.state.hasReceivedData = true;
        relationship.state.isEmpty = true;
        if (relationship.localState && !checkIfNew(graph._realStore, relationship.localState)) {
          relationship.localState = null;
        }
      }
    } else {
      relationship.state.hasDematerializedInverse = true;
    }

    if (!silenceNotifications) {
      notifyChange(graph, relationship);
    }
  } else {
    if (!relationship.definition.isAsync || (inverseIdentifier && checkIfNew(graph._realStore, inverseIdentifier))) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      // if the record being unloaded only exists on the client, we similarly
      // treat it as a client side delete
      /*#__NOINLINE__*/ removeIdentifierCompletelyFromRelationship(graph, relationship, inverseIdentifier);
    } else {
      relationship.state.hasDematerializedInverse = true;
    }

    if (!silenceNotifications) {
      notifyChange(graph, relationship);
    }
  }
}

function removeCompletelyFromInverse(graph: Graph, relationship: GraphEdge) {
  const { identifier } = relationship;
  const { inverseKey } = relationship.definition;

  forAllRelatedIdentifiers(relationship, (inverseIdentifier: StableRecordIdentifier) => {
    if (graph.has(inverseIdentifier, inverseKey)) {
      removeIdentifierCompletelyFromRelationship(graph, graph.get(inverseIdentifier, inverseKey), identifier);
    }
  });

  if (isBelongsTo(relationship)) {
    if (!relationship.definition.isAsync) {
      clearRelationship(relationship);
    }

    relationship.localState = null;
  } else if (isHasMany(relationship)) {
    if (!relationship.definition.isAsync) {
      clearRelationship(relationship);

      notifyChange(graph, relationship);
    }
  } else {
    relationship.remoteMembers.clear();
    relationship.localMembers.clear();
  }
}

function addPending(
  cache: PendingOps,
  definition: UpgradedMeta,
  op: RemoteRelationshipOperation & { field: string }
): void {
  const cacheForKind = (cache[definition.kind as 'hasMany' | 'belongsTo'] =
    cache[definition.kind as 'hasMany' | 'belongsTo'] || new Map<string, Map<string, RemoteRelationshipOperation[]>>());

  let cacheForType = cacheForKind.get(definition.inverseType);
  if (!cacheForType) {
    cacheForType = new Map<string, RemoteRelationshipOperation[]>();
    cacheForKind.set(definition.inverseType, cacheForType);
  }

  let cacheForField = cacheForType.get(op.field);
  if (!cacheForField) {
    cacheForField = [];
    cacheForType.set(op.field, cacheForField);
  }

  cacheForField.push(op);
}

function isReordered(relationship: CollectionEdge): boolean {
  // if we are dirty we are never re-ordered because accessing
  // the state would flush away any reordering.
  if (relationship.isDirty) {
    return false;
  }

  const { remoteState, localState, additions, removals } = relationship;

  if (localState === null) {
    // the relationship has never been accessed, so it hasn't been reordered either
    return false;
  }

  for (let i = 0, j = 0; i < remoteState.length; i++) {
    const member = remoteState[i];
    const localMember = localState[j];

    if (member !== localMember) {
      if (removals && removals.has(member)) {
        // dont increment j because we want to skip this
        continue;
      }
      if (additions && additions.has(localMember)) {
        // increment j to skip this localMember
        // decrement i to repeat this remoteMember
        j++;
        i--;
        continue;
      }
      return true;
    }

    // if we made it here, increment j
    j++;
  }

  return false;
}
