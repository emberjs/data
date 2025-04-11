import type { UpgradedMeta } from '@ember-data/graph/-private';
import type Store from '@ember-data/store';
import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';
import type { ResourceCacheKey } from '@warp-drive/core-types';

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
  parentIdentifier: ResourceCacheKey,
  parentDefinition: UpgradedMeta,
  addedIdentifier: ResourceCacheKey,
  store: Store
) => void;

if (DEBUG) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  assertPolymorphicType = function assertPolymorphicType(
    parentIdentifier: ResourceCacheKey,
    parentDefinition: UpgradedMeta,
    addedIdentifier: ResourceCacheKey,
    store: Store
  ) {
    if (parentDefinition.inverseIsImplicit) {
      return;
    }
    if (parentDefinition.isPolymorphic) {
      const meta = store.schema.fields(addedIdentifier)?.get(parentDefinition.inverseKey);
      if (meta) {
        assert(
          `Expected the schema for the field ${parentDefinition.inverseKey} on ${addedIdentifier.type} to be for a legacy relationship`,
          meta.kind === 'belongsTo' || meta.kind === 'hasMany'
        );
        assert(
          `The schema for the relationship '${parentDefinition.inverseKey}' on '${addedIdentifier.type}' type does not implement '${parentDefinition.type}' and thus cannot be assigned to the '${parentDefinition.key}' relationship in '${parentIdentifier.type}'. The definition should specify 'as: "${parentDefinition.type}"' in options.`,
          meta?.options?.as === parentDefinition.type
        );
      }
    }
  };
}

export { assertPolymorphicType };
