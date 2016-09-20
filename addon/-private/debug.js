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

function checkPolymorphic(typeClass, addedRecord) {
  if (typeClass.__isMixin) {
    //TODO Need to do this in order to support mixins, should convert to public api
    //once it exists in Ember
    return typeClass.__mixin.detect(addedRecord.type.PrototypeMixin);
  }
  if (Ember.MODEL_FACTORY_INJECTIONS) {
    typeClass = typeClass.superclass;
  }
  return typeClass.detect(addedRecord.type);
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
  @param {InternalModel} record
  @param {RelationshipMeta} relationshipMeta retrieved via
         `record.relationshipFor(key)`
  @param {InternalModel} addedRecord record which
         should be added/set for the relationship
*/
export function assertPolymorphicType(record, relationshipMeta, addedRecord) {
  var addedType = addedRecord.type.modelName;
  var recordType = record.type.modelName;
  var key = relationshipMeta.key;
  var typeClass = record.store.modelFor(relationshipMeta.type);

  var assertionMessage = `You cannot add a record of type '${addedType}' to the '${recordType}.${key}' relationship (only '${typeClass.modelName}' allowed)`;

  assert(assertionMessage, checkPolymorphic(typeClass, addedRecord));
}
