import ManyRelationship from "ember-data/system/relationships/state/has-many";
import BelongsToRelationship from "ember-data/system/relationships/state/belongs-to";

import {
  create
} from 'ember-data/system/object-polyfills';

var get = Ember.get;

var createRelationshipFor = function(record, relationshipMeta, store) {
  var inverseKey;
  var inverse = record.type.inverseFor(relationshipMeta.key, store);

  if (inverse) {
    inverseKey = inverse.name;
  }

  if (relationshipMeta.kind === 'hasMany') {
    return new ManyRelationship(store, record, inverseKey, relationshipMeta);
  } else {
    return new BelongsToRelationship(store, record, inverseKey, relationshipMeta);
  }
};

var Relationships = function(record) {
  this.record = record;
  this.initializedRelationships = create(null);
};

Relationships.prototype.has = function(key) {
  return !!this.initializedRelationships[key];
};

Relationships.prototype.get = function(key) {
  var relationships = this.initializedRelationships;
  var relationshipsByName = get(this.record.type, 'relationshipsByName');
  if (!relationships[key] && relationshipsByName.get(key)) {
    relationships[key] = createRelationshipFor(this.record, relationshipsByName.get(key), this.record.store);
  }
  return relationships[key];
};

export default Relationships;
