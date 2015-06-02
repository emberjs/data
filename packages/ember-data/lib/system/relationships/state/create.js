import ManyRelationship from "ember-data/system/relationships/state/has-many";
import BelongsToRelationship from "ember-data/system/relationships/state/belongs-to";

var createRelationshipFor = function(record, relationshipMeta, store) {
  var inverseKey;
  var inverse = record.type.inverseFor(relationshipMeta.key);

  if (inverse) {
    inverseKey = inverse.name;
  }

  if (relationshipMeta.kind === 'hasMany') {
    return new ManyRelationship(store, record, inverseKey, relationshipMeta);
  } else {
    return new BelongsToRelationship(store, record, inverseKey, relationshipMeta);
  }
};

export default createRelationshipFor;
