import BelongsToRelationship from './belongs-to';
import ManyRelationship from './has-many';

type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type RelationshipSchema = import('@ember-data/store/-private/ts-interfaces/record-data-schemas').RelationshipSchema;
type Graph = import('../../graph').Graph;

function createRelationshipFor(
  relationshipMeta: RelationshipSchema,
  storeWrapper: RecordDataStoreWrapper,
  identifier: StableRecordIdentifier,
  key: string
) {
  let inverseKey = storeWrapper.inverseForRelationship(identifier.type, key);
  let inverseIsAsync = storeWrapper.inverseIsAsyncForRelationship(identifier.type, key);

  if (relationshipMeta.kind === 'hasMany') {
    return new ManyRelationship(storeWrapper, inverseKey, relationshipMeta, identifier, inverseIsAsync);
  } else {
    return new BelongsToRelationship(storeWrapper, inverseKey, relationshipMeta, identifier, inverseIsAsync);
  }
}

export default class Relationships {
  declare graph: Graph;
  declare _storeWrapper: RecordDataStoreWrapper;
  declare initializedRelationships: {
    [key: string]: BelongsToRelationship | ManyRelationship;
  };
  declare identifier: StableRecordIdentifier;

  constructor(identifier: StableRecordIdentifier, graph: Graph) {
    this.graph = graph;
    this.identifier = identifier;
    this.initializedRelationships = Object.create(null);
    let storeWrapper = graph.store;
    this._storeWrapper = storeWrapper;
  }

  has(key: string) {
    return !!this.initializedRelationships[key];
  }

  forEach(cb) {
    let rels = this.initializedRelationships;
    Object.keys(rels).forEach((name) => {
      cb(name, rels[name]);
    });
  }

  get(key: string) {
    let relationships = this.initializedRelationships;
    let relationship = relationships[key];

    if (!relationship) {
      let rel = this._storeWrapper.relationshipsDefinitionFor(this.identifier.type)[key];

      if (rel) {
        // lazily instantiate relationship
        relationship = relationships[key] = createRelationshipFor(rel, this._storeWrapper, this.identifier, key);
      }
    }

    return relationship;
  }
}
