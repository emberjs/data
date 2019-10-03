import { get } from '@ember/object';

/**
  @module @ember-data/serializer
*/

/*
  Check if the passed model has a `type` attribute or a relationship named `type`.

  @method modelHasAttributeOrRelationshipNamedType
  @param modelClass
 */
function modelHasAttributeOrRelationshipNamedType(modelClass) {
  return get(modelClass, 'attributes').has('type') || get(modelClass, 'relationshipsByName').has('type');
}

export { modelHasAttributeOrRelationshipNamedType };
