import Relationships from '../relationships/state/create';

type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type Store = import('@ember-data/store/-private/system/core-store').default;
type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type Relationship = import('../relationships/state/relationship').default;
type JsonApiRelationship = import('@ember-data/store/-private/ts-interfaces/record-data-json-api').JsonApiRelationship;
type RelationshipDict = import('@ember-data/store/-private/ts-interfaces/utils').ConfidentDict<Relationship>;

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
  declare identifiers: Map<StableRecordIdentifier, Relationships>;
  declare store: RecordDataStoreWrapper;
  declare _queued: { belongsTo: any[]; hasMany: any[] };
  declare _nextFlush: boolean;
  declare implicitMap: Map<StableRecordIdentifier, RelationshipDict>;

  constructor(store: RecordDataStoreWrapper) {
    this.store = store;
    this.identifiers = new Map();
    this._nextFlush = false;
    this._queued = { belongsTo: [], hasMany: [] };
    this.implicitMap = new Map();
  }

  get(identifier: StableRecordIdentifier) {
    let relationships = this.identifiers.get(identifier);

    if (relationships === undefined) {
      relationships = new Relationships(identifier, this);
      this.identifiers.set(identifier, relationships);
    }

    return relationships;
  }

  /*
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
  getImplicit(identifier: StableRecordIdentifier): RelationshipDict {
    let relationships = this.implicitMap.get(identifier);

    if (relationships === undefined) {
      relationships = Object.create(null) as RelationshipDict;
      this.implicitMap.set(identifier, relationships);
    }

    return relationships;
  }

  unload(identifier: StableRecordIdentifier) {
    const relationships = this.identifiers.get(identifier);

    if (relationships) {
      // cleanup doesn't mean the graph is invalid
      relationships.forEach((name, rel) => destroyRelationship(rel));
    }

    const implicit = this.implicitMap.get(identifier);
    if (implicit) {
      Object.keys(implicit).forEach((key) => {
        let rel = implicit[key];
        destroyRelationship(rel);
      });
      this.implicitMap.delete(identifier);
    }
  }

  remove(identifier: StableRecordIdentifier) {
    this.unload(identifier);
    this.identifiers.delete(identifier);
    this.implicitMap.delete(identifier);
  }

  push(identifier: StableRecordIdentifier, propertyName: string, payload: JsonApiRelationship) {
    const relationship = this.get(identifier).get(propertyName);
    const backburner = this.store._store._backburner;

    this._queued[relationship.kind].push(relationship, payload);
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
    this.implicitMap.clear();
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

  if (rel._inverseIsSync()) {
    rel.removeAllRecordDatasFromOwn();
    rel.removeAllCanonicalRecordDatasFromOwn();
  }
}
