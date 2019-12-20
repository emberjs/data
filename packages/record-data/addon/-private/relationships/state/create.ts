import BelongsToRelationship from './belongs-to';
import ManyRelationship from './has-many';

type RelationshipSchema = import('@ember-data/store/-private/ts-interfaces/record-data-schemas').RelationshipSchema;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type RecordDataStoreWrapper = import('@ember-data/store/-private/ts-interfaces/record-data-store-wrapper').RecordDataStoreWrapper;
type Graph = import('./graph').Graph;

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
  private _storeWrapper: RecordDataStoreWrapper;
  initializedRelationships: {
    [key: string]: BelongsToRelationship | ManyRelationship;
  };
  constructor(public graph: Graph, public identifier: StableRecordIdentifier) {
    this.initializedRelationships = Object.create(null);
    this._storeWrapper = graph.storeWrapper;
  }

  has(key: string) {
    return !!this.initializedRelationships[key];
  }

  forEach(cb) {
    let rels = this.initializedRelationships;
    Object.keys(rels).forEach(name => {
      cb(name, rels[name]);
    });
  }

  get(key: string) {
    let relationships = this.initializedRelationships;
    let relationship = relationships[key];

    if (!relationship) {
      let rel = this._storeWrapper.relationshipsDefinitionFor(this.identifier.type)[key];

      if (rel) {
        relationship = relationships[key] = createRelationshipFor(rel, this._storeWrapper, this.identifier, key);
      }
    }

    return relationship;
  }
}
