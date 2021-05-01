import { assert } from '@ember/debug';

import BelongsToRelationship from '../relationships/state/belongs-to';
import ManyRelationship from '../relationships/state/has-many';
import Relationship from '../relationships/state/relationship';
import { isLHS, upgradeDefinition } from './-edge-definition';

type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;
type EdgeCache = import('./-edge-definition').EdgeCache;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type Store = import('@ember-data/store/-private/system/core-store').default;
type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type JsonApiRelationship = import('@ember-data/store/-private/ts-interfaces/record-data-json-api').JsonApiRelationship;

type RelationshipEdge = Relationship | ManyRelationship | BelongsToRelationship;

const Graphs = new WeakMap<RecordDataStoreWrapper, Graph>();

function isStore(maybeStore: unknown): maybeStore is Store {
  return (maybeStore as Store)._storeWrapper !== undefined;
}

function getWrapper(store: RecordDataStoreWrapper | Store): RecordDataStoreWrapper {
  return isStore(store) ? store._storeWrapper : store;
}

export function peekGraph(store: RecordDataStoreWrapper | Store): Graph | undefined {
  return Graphs.get(getWrapper(store));
}

export function graphFor(store: RecordDataStoreWrapper | Store): Graph {
  const wrapper = getWrapper(store);
  let graph = Graphs.get(wrapper);
  if (graph === undefined) {
    graph = new Graph(wrapper);
    Graphs.set(wrapper, graph);
  }
  return graph;
}

/**
 * Graph acts as the cache for relationship data. It allows for
 * us to ask about and update relationships for a given Identifier
 * without requiring other objects for that Identifier to be
 * instantiated (such as `InternalModel`, `RecordData` or a `Record`)
 *
 * This also allows for us to make more substantive changes to relationships
 * with increasingly minor alterations to other portions of the internals
 * over time.
 *
 * @internal
 */
export class Graph {
  declare _definitionCache: EdgeCache;
  declare _potentialPolymorphicTypes: Dict<Dict<boolean>>;
  declare identifiers: Map<StableRecordIdentifier, Dict<RelationshipEdge>>;
  declare store: RecordDataStoreWrapper;
  declare _queued: { belongsTo: any[]; hasMany: any[] };
  declare _nextFlush: boolean;

  constructor(store: RecordDataStoreWrapper) {
    this._definitionCache = Object.create(null);
    this._potentialPolymorphicTypes = Object.create(null);
    this.identifiers = new Map();
    this.store = store;
    this._queued = { belongsTo: [], hasMany: [] };
    this._nextFlush = false;
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
      const Klass =
        meta.kind === 'hasMany' ? ManyRelationship : meta.kind === 'belongsTo' ? BelongsToRelationship : Relationship;
      relationship = relationships[propertyName] = new Klass(this, meta, identifier);
    }

    return relationship;
  }

  /**
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

  unload(identifier: StableRecordIdentifier) {
    const relationships = this.identifiers.get(identifier);

    if (relationships) {
      // cleans up the graph but retains some nodes
      // to allow for rematerialization
      Object.keys(relationships).forEach((key) => {
        let rel = relationships[key]!;
        destroyRelationship(rel);
        if (rel.definition.isImplicit) {
          delete relationships[key];
        }
      });
    }
  }

  remove(identifier: StableRecordIdentifier) {
    this.unload(identifier);
    this.identifiers.delete(identifier);
  }

  push(identifier: StableRecordIdentifier, propertyName: string, payload: JsonApiRelationship) {
    const relationship = this.get(identifier, propertyName);
    const backburner = this.store._store._backburner;

    this._queued[relationship.definition.kind].push(relationship, payload);
    if (this._nextFlush === false) {
      backburner.join(() => {
        // TODO this join seems to only be necessary for
        // some older style tests (causes 7 failures if removed)
        backburner.schedule('flushRelationships', this, this.flush);
      });
      this._nextFlush = true;
    }
  }

  flush() {
    this._nextFlush = false;
    const { belongsTo, hasMany } = this._queued;
    this._queued = { belongsTo: [], hasMany: [] };
    // TODO validate this assumption
    // pushing hasMany before belongsTo is a performance win
    // as the hasMany's will populate most of the belongsTo's
    // and we won't have to do the expensive extra diff.
    for (let i = 0; i < hasMany.length; i += 2) {
      hasMany[i].push(hasMany[i + 1]);
    }
    for (let i = 0; i < belongsTo.length; i += 2) {
      belongsTo[i].push(belongsTo[i + 1]);
    }
  }

  destroy() {
    this.identifiers.clear();
    Graphs.delete(this.store);
    this.store = (null as unknown) as RecordDataStoreWrapper;
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
function destroyRelationship(rel) {
  rel.recordDataDidDematerialize();

  if (!rel.definition.inverseIsImplicit && !rel.definition.inverseIsAsync) {
    rel.removeAllRecordDatasFromOwn();
    rel.removeAllCanonicalRecordDatasFromOwn();
  }
}
