import { setupTest } from 'ember-qunit';
import { TestContext } from 'ember-test-helpers';

import Store from '@ember-data/store';
import { recordDataFor } from '@ember-data/store/-private';
import { DSModel } from '@ember-data/store/-private/ts-interfaces/ds-model';

type CollectionResourceDocument = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').CollectionResourceDocument;
type EmptyResourceDocument = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').EmptyResourceDocument;
type JsonApiDocument = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').JsonApiDocument;
type SingleResourceDocument = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').SingleResourceDocument;

type BelongsToRelationship = import('@ember-data/record-data/-private').BelongsToRelationship;

type RecordData = import('@ember-data/record-data/-private').RecordData;

type CoreStore = import('@ember-data/store/-private/system/core-store').default;

type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;
type Relationship = import('@ember-data/record-data/-private').Relationship;

type Relationships = import('@ember-data/record-data/-private/relationships/state/create').default;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;

class AbstractMap {
  constructor(private store: CoreStore, private prop: string) {}

  has(identifier: StableRecordIdentifier) {
    let recordData = recordDataFor(identifier) as RecordData;
    // debugger;
    return !!recordData && !!recordData[this.prop];
  }
}

class AbstractGraph {
  public identifiers: AbstractMap;
  public implicit: AbstractMap;
  private cachedRelationships: WeakMap<StableRecordIdentifier, Relationships>;
  private cachedImplicits: WeakMap<StableRecordIdentifier, Dict<Relationship>>;

  constructor(private store: CoreStore) {
    this.identifiers = new AbstractMap(store, '__relationships');
    this.implicit = new AbstractMap(store, '__implicitRelationships');
    this.cachedRelationships = new WeakMap();
    this.cachedImplicits = new WeakMap();
  }

  get(identifier: StableRecordIdentifier): Relationships {
    const recordData = recordDataFor(identifier) as RecordData;
    // avoid re-materializing the relationship state cache
    if (!recordData || !recordData.__relationships) {
      let relationships = this.cachedRelationships.get(identifier);
      if (relationships) {
        throw new Error(`accessed destroyed relationships within graph`);
      }
    }
    let relationships = recordData._relationships;
    this.cachedRelationships.set(identifier, relationships);
    return relationships;
  }

  getImplicit(identifier: StableRecordIdentifier): Dict<Relationship> {
    const recordData = recordDataFor(identifier) as RecordData;
    // avoid re-materializing the relationship state cache
    if (!recordData || !recordData.__implicitRelationships) {
      let relationships = this.cachedImplicits.get(identifier);
      if (relationships) {
        throw new Error(`accessed destroyed implicit relationships within graph`);
      }
    }
    let relationships = recordData._implicitRelationships;
    this.cachedImplicits.set(identifier, relationships);
    return relationships;
  }
}

function graphForTest(store: CoreStore) {
  return new AbstractGraph(store);
}

function isBelongsTo(rel: Relationship): rel is BelongsToRelationship {
  return rel.kind === 'belongsTo';
}

export function stateOf(rel: Relationship) {
  let local, remote;
  if (isBelongsTo(rel)) {
    // we cast these to array form to make the tests more legible
    local = rel.inverseRecordData && rel.inverseRecordData.identifier ? [rel.inverseRecordData.identifier] : [];
    remote = rel.canonicalState && rel.canonicalState.identifier ? [rel.canonicalState.identifier] : [];
  } else {
    local = rel.members.list.map(m => (m ? m.identifier : null));
    remote = rel.canonicalMembers.list.map(m => (m ? m.identifier : null));
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

export interface Context extends TestContext {
  store: TestStore<UserRecord>;
  graph: AbstractGraph;
}

interface TestStore<T> extends CoreStore {
  push(data: EmptyResourceDocument): null;
  push(data: SingleResourceDocument): T;
  push(data: CollectionResourceDocument): T[];
  push(data: JsonApiDocument): T | T[] | null;
}

export function setupGraphTest(hooks) {
  setupTest(hooks);
  hooks.beforeEach(function(this: Context) {
    this.owner.register('service:store', Store);
    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', Serializer);
    this.store = this.owner.lookup('service:store');
    this.graph = graphForTest(this.store);
  });
}
