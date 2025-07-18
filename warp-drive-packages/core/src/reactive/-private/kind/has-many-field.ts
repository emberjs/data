import { assert } from '@warp-drive/build-config/macros';

import type { RelatedCollection as ManyArray } from '../../../store/-private.ts';
import { createLegacyManyArray, entangleSignal } from '../../../store/-private.ts';
import type { StableRecordIdentifier } from '../../../types/identifier.ts';
import type { LegacyHasManyField } from '../../../types/schema/fields.ts';
import type { CollectionResourceRelationship } from '../../../types/spec/json-api-raw.ts';
import type { KindContext } from '../default-mode';
import { getFieldCacheKeyStrict } from '../fields/get-field-key.ts';
import { ManyArrayManager } from '../fields/many-array-manager.ts';
import type { SchemaService } from '../schema.ts';

export function getHasManyField(context: KindContext<LegacyHasManyField>): unknown {
  const signal = entangleSignal(context.signals, context.record, context.path.at(-1)!, null);
  const { store, field } = context;
  if (field.options.linksMode) {
    const { record } = context;
    // the thing we hand out needs to know its owner and path in a private manner
    // its "address" is the parent identifier (identifier) + field name (field.name)
    //  in the nested object case field name here is the full dot path from root resource to this value
    // its "key" is the field on the parent record
    // its "owner" is the parent record

    const cached = signal.value as ManyArray | undefined;
    if (cached) {
      return cached;
    }
    const { editable, resourceKey } = context;
    const { cache } = store;
    const rawValue = cache.getRelationship(
      resourceKey,
      getFieldCacheKeyStrict(field)
    ) as CollectionResourceRelationship;
    if (!rawValue) {
      return null;
    }
    const managedArray = createLegacyManyArray({
      store,
      manager: new ManyArrayManager(record, editable),
      source: (rawValue.data?.slice() ?? []) as StableRecordIdentifier[],
      type: field.type,
      isLoaded: true,
      editable,
      isAsync: field.options.async ?? false,
      isPolymorphic: field.options.polymorphic ?? false,
      field,
      identifier: resourceKey,
      links: rawValue.links || null,
      meta: rawValue.meta || null,
    });
    signal.value = managedArray;
    return managedArray;
  }
  assert(`Can only use hasMany fields when the resource is in legacy mode`, context.legacy);
  return (store.schema as SchemaService)
    ._kind('@legacy', 'hasMany')
    .get(store, context.record, context.resourceKey, field);
}

export function setHasManyField(context: KindContext<LegacyHasManyField>): boolean {
  const { store } = context;
  assert(`Can only use hasMany fields when the resource is in legacy mode`, context.legacy);
  assert(`You must pass an array of records to set a hasMany relationship`, Array.isArray(context.value));
  (store.schema as SchemaService)
    ._kind('@legacy', 'hasMany')
    .set(store, context.record, context.resourceKey, context.field, context.value);
  return true;
}
