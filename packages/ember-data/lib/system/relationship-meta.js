import {singularize} from 'ember-inflector/lib/system/string';
import normalizeModelName from 'ember-data/system/normalize-model-name';

export function typeForRelationshipMeta(meta) {
  var modelName;

  modelName = meta.type || meta.key;
  return singularize(normalizeModelName(modelName));
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
