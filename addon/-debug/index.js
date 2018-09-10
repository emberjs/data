import Ember from 'ember';
import { assert, deprecate } from '@ember/debug';
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

function ensureRelationshipIsSetToParent({ relationships, id, type }, internalModel, store, relationship, index) {
  if (!relationships) {
    return;
  }

  let inverse = getInverseKey(store, internalModel, relationship);
  if (inverse) {
    let relationshipData = relationships[inverse] && relationships[inverse].data;
    if (relationshipData && !relationshipDataPointsToParent(relationshipData, internalModel)) {
      let quotedType = Ember.inspect(type);
      let quotedInverse = Ember.inspect(inverse);
      let expected = Ember.inspect({ id: internalModel.id, type: internalModel.modelName });
      let expectedModel = Ember.inspect(internalModel);
      let got = Ember.inspect(relationshipData);
      let prefix = typeof index === 'number' ? `data[${index}]` : `data`;
      let path = `${prefix}.relationships.${inverse}.data`;
      let other = relationshipData ? `<${relationshipData.type}:${relationshipData.id}>` : null;
      let relationshipFetched = `${Ember.inspect(internalModel)}.${relationship.kind}("${relationship.name}")`;
      let includedRecord = `<${type}:${id}>`;
      let message = [
      `Encountered mismatched relationship: Ember Data expected ${path} in the payload from ${relationshipFetched} to include ${expected} but got ${got} instead.\n`,
      `The ${includedRecord} record loaded at ${prefix} in the payload specified ${other} as its ${quotedInverse}, but should have specified ${expectedModel} (the record the relationship is being loaded from) as its ${quotedInverse} instead.`,
      `This could mean that the response for ${relationshipFetched} may have accidentally returned ${quotedType} records that aren't related to ${expectedModel} and could be related to a different ${internalModel.modelName} record instead.`,
      `Ember Data has corrected the ${includedRecord} record's ${quotedInverse} relationship to ${expectedModel} so that ${relationshipFetched} will include ${includedRecord}.`,
      `Please update the response from the server or change your serializer to either ensure that the response for only includes ${quotedType} records that specify ${expectedModel} as their ${quotedInverse}, or omit the ${quotedInverse} relationship from the response.`,
      ].join('\n');

      // this should eventually throw instead of deprecating.
      deprecate(message + '\n', false, {
        id: 'mismatched-inverse-relationship-data-from-payload',
        until: '3.8',
      });
    }
  }
}

function getInverseKey(store, { modelName }, { name: lhs_relationshipName }) {
  if (store.modelDataWrapper) {
    return store.modelDataWrapper.inverseForRelationship(modelName, lhs_relationshipName);
  } else {
    return store._relationshipsPayloads.getRelationshipInfo(modelName, lhs_relationshipName)
      .rhs_relationshipName;
  }
}

function relationshipDataPointsToParent(relationshipData, internalModel) {
  if (relationshipData === null) {
    return false;
  }

  if (Array.isArray(relationshipData)) {
    if (relationshipData.length === 0) {
      return false;
    }
    for (let i = 0; i < relationshipData.length; i++) {
      let entry = relationshipData[i];
      if (validateRelationshipEntry(entry, internalModel)) {
        return true;
      }
    }
  } else {
    return validateRelationshipEntry(relationshipData, internalModel);
  }

  return false;
}

function validateRelationshipEntry({ id }, { id: parentModelID }) {
  return id && id.toString() === parentModelID;
}

export { assertPolymorphicType, ensureRelationshipIsSetToParent };
