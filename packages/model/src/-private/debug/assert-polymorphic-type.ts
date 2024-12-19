import type Mixin from '@ember/object/mixin';

import type { UpgradedMeta } from '@ember-data/graph/-private';
import type Store from '@ember-data/store';
import type { ModelSchema } from '@ember-data/store/types';
import { DEPRECATE_NON_EXPLICIT_POLYMORPHISM } from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { FieldSchema, LegacyRelationshipSchema } from '@warp-drive/core-types/schema/fields';

import { Model } from '../model';

// A pile of soft-lies to deal with mixin APIs
type ModelWithMixinApis = Model & {
  __isMixin?: boolean;
  __mixin: Mixin;
  PrototypeMixin: Mixin;
  detect: (mixin: Model | Mixin | ModelWithMixinApis) => boolean;
  prototype: Model;
  [Symbol.hasInstance](model: Model): true;
};

function assertModelSchemaIsModel(
  schema: ModelSchema | Model | ModelWithMixinApis
): asserts schema is ModelWithMixinApis {
  assert(`Expected Schema to be an instance of Model`, schema instanceof Model);
}

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
let assertPolymorphicType: (
  parentIdentifier: StableRecordIdentifier,
  parentDefinition: UpgradedMeta,
  addedIdentifier: StableRecordIdentifier,
  store: Store
) => void;

if (DEBUG) {
  const checkPolymorphic = function checkPolymorphic(modelClass: ModelSchema, addedModelClass: ModelSchema) {
    assertModelSchemaIsModel(modelClass);
    assertModelSchemaIsModel(addedModelClass);

    if (modelClass.__isMixin) {
      return (
        modelClass.__mixin.detect(addedModelClass.PrototypeMixin) ||
        // handle native class extension e.g. `class Post extends Model.extend(Commentable) {}`
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        modelClass.__mixin.detect(Object.getPrototypeOf(addedModelClass).PrototypeMixin)
      );
    }

    return addedModelClass.prototype instanceof modelClass || modelClass.detect(addedModelClass);
  };

  const isRelationshipField = function isRelationshipField(meta: FieldSchema): meta is LegacyRelationshipSchema {
    return meta.kind === 'hasMany' || meta.kind === 'belongsTo';
  };

  // eslint-disable-next-line @typescript-eslint/no-shadow
  assertPolymorphicType = function assertPolymorphicType(
    parentIdentifier: StableRecordIdentifier,
    parentDefinition: UpgradedMeta,
    addedIdentifier: StableRecordIdentifier,
    store: Store
  ) {
    if (parentDefinition.inverseIsImplicit) {
      return;
    }
    let asserted = false;
    if (parentDefinition.isPolymorphic) {
      const meta = store.schema.fields(addedIdentifier)?.get(parentDefinition.inverseKey);
      assert(
        `Expected to find a relationship field schema for ${parentDefinition.inverseKey} on ${addedIdentifier.type} but none was found`,
        meta && isRelationshipField(meta)
      );

      if (!DEPRECATE_NON_EXPLICIT_POLYMORPHISM) {
        assert(
          `The schema for the relationship '${parentDefinition.inverseKey}' on '${addedIdentifier.type}' type does not implement '${parentDefinition.type}' and thus cannot be assigned to the '${parentDefinition.key}' relationship in '${parentIdentifier.type}'. The definition should specify 'as: "${parentDefinition.type}"' in options.`,
          meta.options.as === parentDefinition.type
        );
      } else if ((meta.options.as?.length ?? 0) > 0) {
        asserted = true;
        assert(
          `The schema for the relationship '${parentDefinition.inverseKey}' on '${addedIdentifier.type}' type does not implement '${parentDefinition.type}' and thus cannot be assigned to the '${parentDefinition.key}' relationship in '${parentIdentifier.type}'. The definition should specify 'as: "${parentDefinition.type}"' in options.`,
          meta.options.as === parentDefinition.type
        );
      }

      if (DEPRECATE_NON_EXPLICIT_POLYMORPHISM) {
        if (!asserted) {
          store = (store as unknown as { _store: Store })._store
            ? (store as unknown as { _store: Store })._store
            : store; // allow usage with storeWrapper
          const addedModelName = addedIdentifier.type;
          const parentModelName = parentIdentifier.type;
          const key = parentDefinition.key;
          const relationshipModelName = parentDefinition.type;
          const relationshipClass = store.modelFor(relationshipModelName);
          const addedClass = store.modelFor(addedModelName);

          const assertionMessage = `The '${addedModelName}' type does not implement '${relationshipModelName}' and thus cannot be assigned to the '${key}' relationship in '${parentModelName}'. Make it a descendant of '${relationshipModelName}' or use a mixin of the same name.`;
          const isPolymorphic = checkPolymorphic(relationshipClass, addedClass);

          assert(assertionMessage, isPolymorphic);
        }
      }
    }
  };
}

export { assertPolymorphicType };
