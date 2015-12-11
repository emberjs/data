import {singularize} from 'ember-inflector';
import normalizeModelName from 'ember-data/-private/system/normalize-model-name';

export function typeForRelationshipMeta(meta) {
  var modelName;

  modelName = meta.type || meta.key;
  if (meta.kind === 'hasMany') {
    modelName = singularize(normalizeModelName(modelName));
  }
  return modelName;
}

export function relationshipFromMeta(meta) {
  return {
    key:  meta.key,
    kind: meta.kind,
    type: typeForRelationshipMeta(meta),
    options:    meta.options,
    parentType: meta.parentType,
    isRelationship: true
  };
}
