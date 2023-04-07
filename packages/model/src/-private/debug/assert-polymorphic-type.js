import { assert } from '@ember/debug';
import { DEBUG } from '@ember-data/env';

/*
  Assert that `addedRecord` has a valid type so it can be added to the
  relationship of the `record`.

  The assert basically checks if the `addedRecord` can be added to the
  relationship (specified via `relationshipMeta`) of the `record`.

  This utility should only be used internally, as both record parameters must
  be stable record identifiers and the `relationshipMeta` needs to be the meta
  information about the relationship, retrieved via
  `record.relationshipFor(key)`.
*/
let assertPolymorphicType;

if (DEBUG) {
  assertPolymorphicType = function assertPolymorphicType(parentIdentifier, parentDefinition, addedIdentifier, store) {
    if (parentDefinition.inverseIsImplicit) {
      return;
    }
    if (parentDefinition.isPolymorphic) {
      let meta = store.getSchemaDefinitionService().relationshipsDefinitionFor(addedIdentifier)[
        parentDefinition.inverseKey
      ];
      assert(
        `The schema for the relationship '${parentDefinition.inverseKey}' on '${addedIdentifier.type}' type does not implement '${parentDefinition.type}' and thus cannot be assigned to the '${parentDefinition.key}' relationship in '${parentIdentifier.type}'. The definition should specify 'as: "${parentDefinition.type}"' in options.`,
        meta.options.as === parentDefinition.type
      );
    }
  };
}

export { assertPolymorphicType };
