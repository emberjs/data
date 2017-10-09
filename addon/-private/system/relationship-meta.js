import { singularize } from 'ember-inflector';
import normalizeModelName from './normalize-model-name';
import { DEBUG } from '@glimmer/env';

export function typeForRelationshipMeta(meta) {
  let modelName;

  modelName = meta.type || meta.key;
  if (meta.kind === 'hasMany') {
    modelName = singularize(normalizeModelName(modelName));
  }
  return modelName;
}

export function relationshipFromMeta(meta) {
  let result = {
    key:  meta.key,
    kind: meta.kind,
    type: typeForRelationshipMeta(meta),
    options:    meta.options,
    name: meta.name,
    parentType: meta.parentType,
    isRelationship: true
  };

  if (DEBUG) {
    result.parentType = meta.parentType;
  }

  return result;
}
