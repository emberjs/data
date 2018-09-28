import Ember from 'ember';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

export function instrument(method) {
  return method();
}

/*
  Assert that `addedRecord` has a valid type so it can be added to the
  relationship of the `record`.

  The assert basically checks if the `addedRecord` can be added to the
  relationship (specified via `relationshipMeta`) of the `record`.

  This utility should only be used internally, as both record parameters must
  be an InternalModel and the `relationshipMeta` needs to be the meta
  information about the relationship, retrieved via
  `record.relationshipFor(key)`.

  @method assertPolymorphicType
  @param {InternalModel} internalModel
  @param {RelationshipMeta} relationshipMeta retrieved via
         `record.relationshipFor(key)`
  @param {InternalModel} addedRecord record which
         should be added/set for the relationship
*/
let assertPolymorphicType;

if (DEBUG) {
  let checkPolymorphic = function checkPolymorphic(modelClass, addedModelClass) {
    if (modelClass.__isMixin) {
      //TODO Need to do this in order to support mixins, should convert to public api
      //once it exists in Ember
      return modelClass.__mixin.detect(addedModelClass.PrototypeMixin);
    }
    if (Ember.MODEL_FACTORY_INJECTIONS) {
      modelClass = modelClass.superclass;
    }
    return modelClass.detect(addedModelClass);
  };

  assertPolymorphicType = function assertPolymorphicType(
    parentInternalModel,
    relationshipMeta,
    addedInternalModel,
    store
  ) {
    let addedModelName = addedInternalModel.modelName;
    let parentModelName = parentInternalModel.modelName;
    let key = relationshipMeta.key;
    let relationshipModelName = relationshipMeta.type;
    let relationshipClass = store.modelFor(relationshipModelName);
    let addedClass = store.modelFor(addedInternalModel.modelName);

    let assertionMessage = `The '${addedModelName}' type does not implement '${relationshipModelName}' and thus cannot be assigned to the '${key}' relationship in '${parentModelName}'. Make it a descendant of '${relationshipModelName}' or use a mixin of the same name.`;

    assert(assertionMessage, checkPolymorphic(relationshipClass, addedClass));
  };
}

export { assertPolymorphicType };
