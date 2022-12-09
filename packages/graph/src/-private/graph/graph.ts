import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { LOG_GRAPH } from '@ember-data/private-build-infra/debugging';
import { MergeOperation } from '@ember-data/types/q/cache';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { Dict } from '@ember-data/types/q/utils';

import BelongsToRelationship from '../relationships/state/belongs-to';
import ManyRelationship from '../relationships/state/has-many';
import type { EdgeCache, UpgradedMeta } from './-edge-definition';
import { isLHS, upgradeDefinition } from './-edge-definition';
import type {
  DeleteRecordOperation,
  LocalRelationshipOperation,
  RemoteRelationshipOperation,
  UnknownOperation,
} from './-operations';
import {
  assertValidRelationshipPayload,
  forAllRelatedIdentifiers,
  getStore,
  isBelongsTo,
  isHasMany,
  isImplicit,
  isNew,
  notifyChange,
  removeIdentifierCompletelyFromRelationship,
} from './-utils';
import addToRelatedRecords from './operations/add-to-related-records';
import { mergeIdentifier } from './operations/merge-identifier';
import removeFromRelatedRecords from './operations/remove-from-related-records';
import replaceRelatedRecord from './operations/replace-related-record';
import replaceRelatedRecords, { syncRemoteToLocal } from './operations/replace-related-records';
import updateRelationshipOperation from './operations/update-relationship';

export interface ImplicitRelationship {
  definition: UpgradedMeta;
  identifier: StableRecordIdentifier;
  localMembers: Set<StableRecordIdentifier>;
  remoteMembers: Set<StableRecordIdentifier>;
}

export type RelationshipEdge = ImplicitRelationship | ManyRelationship | BelongsToRelationship;

export const Graphs = new Map<CacheStoreWrapper, Graph>();

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
  declare _potentialPolymorphicTypes: Dict<Dict<boolean>>;
  declare identifiers: Map<StableRecordIdentifier, Dict<RelationshipEdge>>;
  declare store: CacheStoreWrapper;
  declare isDestroyed: boolean;
  declare _willSyncRemote: boolean;
  declare _willSyncLocal: boolean;
  declare _pushedUpdates: {
    belongsTo: RemoteRelationshipOperation[];
    hasMany: RemoteRelationshipOperation[];
    deletions: DeleteRecordOperation[];
  };
  declare _updatedRelationships: Set<ManyRelationship>;
  declare _transaction: Set<ManyRelationship | BelongsToRelationship> | null;
  declare _removing: StableRecordIdentifier | null;

  constructor(store: CacheStoreWrapper) {
    this._definitionCache = Object.create(null) as EdgeCache;
    this._potentialPolymorphicTypes = Object.create(null) as Dict<Dict<boolean>>;
    this.identifiers = new Map();
    this.store = store;
    this.isDestroyed = false;
    this._willSyncRemote = false;
    this._willSyncLocal = false;
    this._pushedUpdates = { belongsTo: [], hasMany: [], deletions: [] };
    this._updatedRelationships = new Set();
    this._transaction = null;
    this._removing = null;
  }

  has(identifier: StableRecordIdentifier, propertyName: string): boolean {
    let relationships = this.identifiers.get(identifier);
    if (!relationships) {
      return false;
    }
    return relationships[propertyName] !== undefined;
  }

  get(identifier: StableRecordIdentifier, propertyName: string): RelationshipEdge {
    assert(`expected propertyName`, propertyName);
    let relationships = this.identifiers.get(identifier);
    if (!relationships) {
      relationships = Object.create(null) as Dict<RelationshipEdge>;
      this.identifiers.set(identifier, relationships);
    }

    let relationship = relationships[propertyName];
    if (!relationship) {
      const info = upgradeDefinition(this, identifier, propertyName);
      assert(`Could not determine relationship information for ${identifier.type}.${propertyName}`, info !== null);
      const meta = isLHS(info, identifier.type, propertyName) ? info.lhs_definition : info.rhs_definition!;

      if (meta.kind !== 'implicit') {
        const Klass = meta.kind === 'hasMany' ? ManyRelationship : BelongsToRelationship;
        relationship = relationships[propertyName] = new Klass(meta, identifier);
      } else {
        relationship = relationships[propertyName] = {
          definition: meta,
          identifier,
          localMembers: new Set(),
          remoteMembers: new Set(),
        };
      }
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
      t1 = typeCache[type1] = Object.create(null) as Dict<boolean>;
    }
    t1[type2] = true;

    let t2 = typeCache[type2];
    if (!t2) {
      t2 = typeCache[type2] = Object.create(null) as Dict<boolean>;
    }
    t2[type1] = true;
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

  isReleasable(identifier: StableRecordIdentifier): boolean {
    const relationships = this.identifiers.get(identifier);
    if (!relationships) {
      return true;
    }
    const keys = Object.keys(relationships);
    for (let i = 0; i < keys.length; i++) {
      const relationship = relationships[keys[i]] as RelationshipEdge;
      assert(`Expected a relationship`, relationship);
      if (relationship.definition.inverseIsAsync) {
        return false;
      }
    }
    return true;
  }

  unload(identifier: StableRecordIdentifier, silenceNotifications?: boolean) {
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`graph: unload ${String(identifier)}`);
    }
    const relationships = this.identifiers.get(identifier);

    if (relationships) {
      // cleans up the graph but retains some nodes
      // to allow for rematerialization
      Object.keys(relationships).forEach((key) => {
        let rel = relationships[key]!;
        if (!rel) {
          return;
        }
        destroyRelationship(this, rel, silenceNotifications);
        if (isImplicit(rel)) {
          relationships[key] = undefined;
        }
      });
    }
  }

  remove(identifier: StableRecordIdentifier) {
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
  push(op: RemoteRelationshipOperation) {
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`graph: push ${String(op.record)}`, op);
    }
    if (op.op === 'deleteRecord') {
      this._pushedUpdates.deletions.push(op);
    } else if (op.op === 'replaceRelatedRecord') {
      this._pushedUpdates.belongsTo.push(op);
    } else {
      const relationship = this.get(op.record, op.field);
      assert(`Cannot push a remote update for an implicit relationship`, !isImplicit(relationship));
      this._pushedUpdates[relationship.definition.kind as 'belongsTo' | 'hasMany'].push(op);
    }
    if (!this._willSyncRemote) {
      this._willSyncRemote = true;
      getStore(this.store)._schedule('coalesce', () => this._flushRemoteQueue());
    }
  }

  /*
   * Local state changes
   */
  update(op: RemoteRelationshipOperation | MergeOperation, isRemote: true): void;
  update(op: LocalRelationshipOperation, isRemote?: false): void;
  update(
    op: MergeOperation | LocalRelationshipOperation | RemoteRelationshipOperation | UnknownOperation,
    isRemote: boolean = false
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
          mergeIdentifier(this, op, relationships);
        }
        break;
      }
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
            const rel = relationships[key];
            if (!rel) {
              return;
            }
            // works together with the has check
            relationships[key] = undefined;
            removeCompletelyFromInverse(this, rel);
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

  _scheduleLocalSync(relationship: ManyRelationship) {
    this._updatedRelationships.add(relationship);
    if (!this._willSyncLocal) {
      this._willSyncLocal = true;
      getStore(this.store)._schedule('sync', () => this._flushLocalQueue());
    }
  }

  _flushRemoteQueue() {
    if (!this._willSyncRemote) {
      return;
    }
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(`Graph: Initialized Transaction`);
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

  _addToTransaction(relationship: ManyRelationship | BelongsToRelationship) {
    assert(`expected a transaction`, this._transaction !== null);
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`Graph: ${String(relationship.identifier)} ${relationship.definition.key} added to transaction`);
    }
    relationship.transactionRef++;
    this._transaction.add(relationship);
  }

  _finalize() {
    if (this._transaction) {
      this._transaction.forEach((v) => (v.transactionRef = 0));
      this._transaction = null;
      if (LOG_GRAPH) {
        // eslint-disable-next-line no-console
        console.log(`Graph: transaction finalized`);
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    }
  }

  _flushLocalQueue() {
    if (!this._willSyncLocal) {
      return;
    }
    this._willSyncLocal = false;
    let updated = this._updatedRelationships;
    this._updatedRelationships = new Set();
    updated.forEach((rel) => syncRemoteToLocal(this, rel));
  }

  destroy() {
    Graphs.delete(this.store);

    if (DEBUG) {
      Graphs.delete(getStore(this.store) as unknown as CacheStoreWrapper);
    }

    this.identifiers.clear();
    this.store = null as unknown as CacheStoreWrapper;
    this.isDestroyed = true;
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
function destroyRelationship(graph: Graph, rel: RelationshipEdge, silenceNotifications?: boolean) {
  if (isImplicit(rel)) {
    if (graph.isReleasable(rel.identifier)) {
      removeCompletelyFromInverse(graph, rel);
    }
    return;
  }

  const { identifier } = rel;
  const { inverseKey } = rel.definition;

  if (!rel.definition.inverseIsImplicit) {
    forAllRelatedIdentifiers(rel, (inverseIdentifer: StableRecordIdentifier) =>
      notifyInverseOfDematerialization(graph, inverseIdentifer, inverseKey, identifier, silenceNotifications)
    );
  }

  if (!rel.definition.inverseIsImplicit && !rel.definition.inverseIsAsync) {
    rel.state.isStale = true;
    clearRelationship(rel);

    // necessary to clear relationships in the ui from dematerialized records
    // hasMany is managed by Model which calls `retreiveLatest` after
    // dematerializing the recordData instance.
    // but sync belongsTo requires this since they don't have a proxy to update.
    // so we have to notify so it will "update" to null.
    // we should discuss whether we still care about this, probably fine to just
    // leave the ui relationship populated since the record is destroyed and
    // internally we've fully cleaned up.
    if (!rel.definition.isAsync && !silenceNotifications) {
      notifyChange(graph, rel.identifier, rel.definition.key);
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

  let relationship = graph.get(inverseIdentifier, inverseKey);
  assert(`expected no implicit`, !isImplicit(relationship));

  // For remote members, it is possible that inverseRecordData has already been associated to
  // to another record. For such cases, do not dematerialize the inverseRecordData
  if (!isBelongsTo(relationship) || !relationship.localState || identifier === relationship.localState) {
    removeDematerializedInverse(
      graph,
      relationship as BelongsToRelationship | ManyRelationship,
      identifier,
      silenceNotifications
    );
  }
}

function clearRelationship(relationship: ManyRelationship | BelongsToRelationship) {
  if (isBelongsTo(relationship)) {
    relationship.localState = null;
    relationship.remoteState = null;
    relationship.state.hasReceivedData = false;
    relationship.state.isEmpty = true;
  } else {
    relationship.localMembers.clear();
    relationship.remoteMembers.clear();
    relationship.localState = [];
    relationship.remoteState = [];
  }
}

function removeDematerializedInverse(
  graph: Graph,
  relationship: ManyRelationship | BelongsToRelationship,
  inverseIdentifier: StableRecordIdentifier,
  silenceNotifications?: boolean
) {
  if (isBelongsTo(relationship)) {
    const inverseIdentifier = relationship.localState;
    if (!relationship.definition.isAsync || (inverseIdentifier && isNew(inverseIdentifier))) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      // if the record being unloaded only exists on the client, we similarly
      // treat it as a client side delete
      if (relationship.localState === inverseIdentifier && inverseIdentifier !== null) {
        relationship.localState = null;
      }

      if (relationship.remoteState === inverseIdentifier && inverseIdentifier !== null) {
        relationship.remoteState = null;
        relationship.state.hasReceivedData = true;
        relationship.state.isEmpty = true;
        if (relationship.localState && !isNew(relationship.localState)) {
          relationship.localState = null;
        }
      }
    } else {
      relationship.state.hasDematerializedInverse = true;
    }

    if (!silenceNotifications) {
      notifyChange(graph, relationship.identifier, relationship.definition.key);
    }
  } else {
    if (!relationship.definition.isAsync || (inverseIdentifier && isNew(inverseIdentifier))) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      // if the record being unloaded only exists on the client, we similarly
      // treat it as a client side delete
      removeIdentifierCompletelyFromRelationship(graph, relationship, inverseIdentifier);
    } else {
      relationship.state.hasDematerializedInverse = true;
    }

    if (!silenceNotifications) {
      notifyChange(graph, relationship.identifier, relationship.definition.key);
    }
  }
}

function removeCompletelyFromInverse(
  graph: Graph,
  relationship: ImplicitRelationship | ManyRelationship | BelongsToRelationship
) {
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

      notifyChange(graph, relationship.identifier, relationship.definition.key);
    }
  } else {
    relationship.remoteMembers.clear();
    relationship.localMembers.clear();
  }
}
