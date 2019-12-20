import Relationships from './create';

type Relationship = import('./relationship').default;
type JsonApiRelationship = import('@ember-data/store/-private/ts-interfaces/record-data-json-api').JsonApiRelationship;
type RecordDataStoreWrapper = import('@ember-data/store/-private/system/store/record-data-store-wrapper').default;
type RelationshipDict = import('@ember-data/store/-private/ts-interfaces/utils').ConfidentDict<Relationship>;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;

const Graphs = new WeakMap<RecordDataStoreWrapper, Graph>();

export function peekGraph(store: RecordDataStoreWrapper): Graph | undefined {
  return Graphs.get(store);
}

export function graphFor(store: RecordDataStoreWrapper): Graph {
  let graph = Graphs.get(store);
  if (graph === undefined) {
    graph = new Graph(store);
    Graphs.set(store, graph);
  }
  return graph;
}

export class Graph {
  _queued: { belongsTo: any[]; hasMany: any[] } = { belongsTo: [], hasMany: [] };
  _nextFlush: boolean = false;
  identifiers: Map<StableRecordIdentifier, Relationships> = new Map();
  implicitMap: Map<StableRecordIdentifier, RelationshipDict> = new Map();
  constructor(public storeWrapper: RecordDataStoreWrapper) {}

  get(identifier: StableRecordIdentifier): Relationships {
    let relationships = this.identifiers.get(identifier);

    if (relationships === undefined) {
      relationships = new Relationships(this, identifier);
      this.identifiers.set(identifier, relationships);
    }

    return relationships;
  }

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
      // in an unload we go further
      // cleanup doesn't mean the graph is invalid
      relationships.forEach((name, rel) => destroyRelationship(rel));
    }

    const implicit = this.implicitMap.get(identifier);
    if (implicit) {
      Object.keys(implicit).forEach(key => {
        let rel = implicit[key];
        destroyRelationship(rel);
      });
    }
  }

  push(identifier: StableRecordIdentifier, propertyName: string, payload: JsonApiRelationship) {
    const relationship = this.get(identifier).get(propertyName);
    const backburner = this.storeWrapper._store._backburner;

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
    Graphs.delete(this.storeWrapper);
    this.storeWrapper = (null as unknown) as RecordDataStoreWrapper;
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
  rel.identifierDidDematerialize();

  if (rel._inverseIsSync()) {
    rel.removeAllIdentifiersFromOwn();
    rel.removeAllCanonicalIdentifiersFromOwn();
  }
}
