import { singularize } from "ember-inflector/system";

export function typeForRelationshipMeta(store, meta) {
  var typeKey, type;

  typeKey = meta.type || meta.key;
  if (typeof typeKey === 'string') {
    if (meta.kind === 'hasMany') {
      typeKey = singularize(typeKey);
    }
    type = store.modelFor(typeKey);
  } else {
    type = meta.type;
  }

  return type;
}

export function relationshipFromMeta(store, meta) {
  return {
    key:  meta.key,
    kind: meta.kind,
    type: typeForRelationshipMeta(store, meta),
    options:    meta.options,
    parentType: meta.parentType,
    isRelationship: true
  };
}

export function isSyncRelationship(record, relationshipName) {
  var meta = Ember.meta(record);
  var desc = meta.descs[relationshipName];

  return desc && !desc._meta.options.async;
}
