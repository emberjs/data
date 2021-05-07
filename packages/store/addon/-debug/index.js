import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

/*
  Assert that `addedRecord` has a valid type so it can be added to the
  relationship of the `record`.

  The assert basically checks if the `addedRecord` can be added to the
  relationship (specified via `relationshipMeta`) of the `record`.

  This utility should only be used internally, as both record parameters must
  be an InternalModel and the `relationshipMeta` needs to be the meta
  information about the relationship, retrieved via
  `record.relationshipFor(key)`.
*/
let assertPolymorphicType;

if (DEBUG) {
  let checkPolymorphic = function checkPolymorphic(modelClass, addedModelClass) {
    if (modelClass.__isMixin) {
      return (
        modelClass.__mixin.detect(addedModelClass.PrototypeMixin) ||
        // handle native class extension e.g. `class Post extends Model.extend(Commentable) {}`
        modelClass.__mixin.detect(Object.getPrototypeOf(addedModelClass).PrototypeMixin)
      );
    }

    return addedModelClass.prototype instanceof modelClass || modelClass.detect(addedModelClass);
  };

  assertPolymorphicType = function assertPolymorphicType(parentIdentifier, parentDefinition, addedIdentifier, store) {
    store = store._store ? store._store : store; // allow usage with storeWrapper
    let addedModelName = addedIdentifier.type;
    let parentModelName = parentIdentifier.type;
    let key = parentDefinition.key;
    let relationshipModelName = parentDefinition.type;
    let relationshipClass = store.modelFor(relationshipModelName);
    let addedClass = store.modelFor(addedModelName);

    let assertionMessage = `The '${addedModelName}' type does not implement '${relationshipModelName}' and thus cannot be assigned to the '${key}' relationship in '${parentModelName}'. Make it a descendant of '${relationshipModelName}' or use a mixin of the same name.`;
    let isPolymorphic = checkPolymorphic(relationshipClass, addedClass);

    assert(assertionMessage, isPolymorphic);
  };
}

export { assertPolymorphicType };
