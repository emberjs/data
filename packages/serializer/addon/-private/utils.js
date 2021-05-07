import { get } from '@ember/object';

/*
  Check if the passed model has a `type` attribute or a relationship named `type`.
 */
function modelHasAttributeOrRelationshipNamedType(modelClass) {
  return get(modelClass, 'attributes').has('type') || get(modelClass, 'relationshipsByName').has('type');
}

export { modelHasAttributeOrRelationshipNamedType };
