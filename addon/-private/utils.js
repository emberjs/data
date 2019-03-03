import { get } from '@ember/object';

/*
  TODO NOW this can't work like this anymore
  Check if the passed model has a `type` attribute or a relationship named `type`.

  @method modelHasAttributeOrRelationshipNamedType
  @param modelClass
 */
function modelHasAttributeOrRelationshipNamedType(modelClass) {
  //debugger
  return (
    get(modelClass, 'attributes').has('type') || get(modelClass, 'relationshipsByName').has('type')
  );
}

export { modelHasAttributeOrRelationshipNamedType };
