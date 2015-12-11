import Ember from 'ember';
import { assert } from "ember-data/-private/debug";

const get = Ember.get;

/**
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
var assertPolymorphicType = function(record, relationshipMeta, addedRecord) {
  var addedType = addedRecord.type.modelName;
  var recordType = record.type.modelName;
  var key = relationshipMeta.key;
  var typeClass = record.store.modelFor(relationshipMeta.type);

  var assertionMessage = `You cannot add a record of type '${addedType}' to the '${recordType}.${key}' relationship (only '${typeClass.modelName}' allowed)`;

  assert(assertionMessage, checkPolymorphic(typeClass, addedRecord));
};

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

/**
  Check if the passed model has a `type` attribute or a relationship named `type`.

  @method modelHasAttributeOrRelationshipNamedType
  @param modelClass
 */
function modelHasAttributeOrRelationshipNamedType(modelClass) {
  return get(modelClass, 'attributes').has('type') || get(modelClass, 'relationshipsByName').has('type');
}

/*
  ember-container-inject-owner is a new feature in Ember 2.3 that finally provides a public
  API for looking items up.  This function serves as a super simple polyfill to avoid
  triggering deprecations.
*/
function getOwner(context) {
  var owner;

  if (Ember.getOwner) {
    owner = Ember.getOwner(context);
  }

  if (!owner && context.container) {
    owner = context.container;
  }

  if (owner && owner.lookupFactory && !owner._lookupFactory) {
    // `owner` is a container, we are just making this work
    owner._lookupFactory = owner.lookupFactory;
    owner.register = function() {
      var registry = owner.registry || owner._registry || owner;

      return registry.register(...arguments);
    };
  }

  return owner;
}

export {
  assertPolymorphicType,
  modelHasAttributeOrRelationshipNamedType,
  getOwner
};
