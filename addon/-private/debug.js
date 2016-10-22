import Ember from 'ember';

export function assert() {
  return Ember.assert(...arguments);
}

export function debug() {
  return Ember.debug(...arguments);
}

export function deprecate() {
  return Ember.deprecate(...arguments);
}

export function info() {
  return Ember.info(...arguments);
}

export function runInDebug() {
  return Ember.runInDebug(...arguments);
}

export function instrument(method) {
  return method();
}

export function warn() {
  return Ember.warn(...arguments);
}

export function debugSeal() {
  return Ember.debugSeal(...arguments);
}

function checkPolymorphic(modelClass, addedModelClass) {
  if (modelClass.__isMixin) {
    //TODO Need to do this in order to support mixins, should convert to public api
    //once it exists in Ember
    return modelClass.__mixin.detect(addedModelClass.PrototypeMixin);
  }
  if (Ember.MODEL_FACTORY_INJECTIONS) {
    modelClass = modelClass.superclass;
  }
  return modelClass.detect(addedModelClass);
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
export function assertPolymorphicType(parentInternalModel, relationshipMeta, addedInternalModel) {
  let addedModelName = addedInternalModel.modelName;
  let parentModelName = parentInternalModel.modelName;
  let key = relationshipMeta.key;
  let relationshipClass = parentInternalModel.store.modelFor(relationshipMeta.type);
  let assertionMessage = `You cannot add a record of modelClass '${addedModelName}' to the '${parentModelName}.${key}' relationship (only '${relationshipClass.modelName}' allowed)`;

  assert(assertionMessage, checkPolymorphic(relationshipClass, addedInternalModel.modelClass));
}
