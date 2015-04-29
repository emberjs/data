import {singularize} from 'ember-inflector/lib/system/string';

export function typeForRelationshipMeta(store, meta) {
  var modelName, typeClass;

  modelName = meta.type || meta.key;
  if (typeof modelName === 'string') {
    if (meta.kind === 'hasMany') {
      modelName = singularize(modelName);
    }
    typeClass = store.modelFor(modelName);
  } else {
    typeClass = meta.type;
  }

  return typeClass;
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
