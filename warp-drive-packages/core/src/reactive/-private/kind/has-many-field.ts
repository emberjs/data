import { assert } from '@warp-drive/build-config/macros';

import type { Store } from '../../../store/-private';
import { RelatedCollection as ManyArray } from '../../../store/-private.ts';
import type { Cache } from '../../../types/cache.ts';
import type { StableRecordIdentifier } from '../../../types/identifier.ts';
import type { LegacyHasManyField } from '../../../types/schema/fields.ts';
import type { CollectionResourceRelationship } from '../../../types/spec/json-api-raw.ts';
import type { ModeInfo } from '../default-mode';
import { getFieldCacheKeyStrict } from '../fields/get-field-key.ts';
import { ManyArrayManager } from '../fields/many-array-manager.ts';
import type { ReactiveResource } from '../record.ts';
import type { SchemaService } from '../schema.ts';
import { ManagedArrayMap } from './array-field.ts';

function computeHasMany(
  store: Store,
  schema: SchemaService,
  cache: Cache,
  record: ReactiveResource,
  identifier: StableRecordIdentifier,
  field: LegacyHasManyField,
  path: string[],
  editable: boolean,
  legacy: boolean
): ManyArray | null {
  // the thing we hand out needs to know its owner and path in a private manner
  // its "address" is the parent identifier (identifier) + field name (field.name)
  //  in the nested object case field name here is the full dot path from root resource to this value
  // its "key" is the field on the parent record
  // its "owner" is the parent record

  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  let managedArray: ManyArray | undefined;
  if (managedArrayMapForRecord) {
    managedArray = managedArrayMapForRecord.get(getFieldCacheKeyStrict(field)) as ManyArray | undefined;
  }
  if (managedArray) {
    return managedArray;
  } else {
    const rawValue = cache.getRelationship(identifier, getFieldCacheKeyStrict(field)) as CollectionResourceRelationship;
    if (!rawValue) {
      return null;
    }
    managedArray = new ManyArray<unknown>({
      store,
      type: field.type,
      identifier,
      cache,
      field: legacy ? field : undefined,
      // we divorce the reference here because ManyArray mutates the target directly
      // before sending the mutation op to the cache. We may be able to avoid this in the future
      identifiers: rawValue.data?.slice() as StableRecordIdentifier[],
      key: field.name,
      meta: rawValue.meta || null,
      links: rawValue.links || null,
      isPolymorphic: field.options.polymorphic ?? false,
      isAsync: field.options.async ?? false,
      // TODO: Grab the proper value
      _inverseIsAsync: false,
      // @ts-expect-error Typescript doesn't have a way for us to thread the generic backwards so it infers unknown instead of T
      manager: new ManyArrayManager(record, editable),
      isLoaded: true,
      allowMutation: editable,
    });
    if (!managedArrayMapForRecord) {
      ManagedArrayMap.set(record, new Map([[field.name, managedArray]]));
    } else {
      managedArrayMapForRecord.set(field.name, managedArray);
    }
  }
  return managedArray;
}

export function getHasManyField(
  store: Store,
  record: ReactiveResource,
  resourceKey: StableRecordIdentifier,
  field: LegacyHasManyField,
  path: string | string[],
  mode: ModeInfo
): unknown {
  const { cache, schema } = store;
  if (field.options.linksMode) {
    return computeHasMany(
      store,
      schema as SchemaService,
      cache,
      record,
      resourceKey,
      field,
      path,
      mode.editable,
      mode.legacy
    );
  }
  assert(`Can only use hasMany fields when the resource is in legacy mode`, mode.legacy);
  return (schema as SchemaService)._kind('@legacy', 'hasMany').get(store, record, resourceKey, field);
}

export function setHasManyField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyHasManyField,
  path: string | string[],
  mode: ModeInfo,
  value: unknown
): boolean {
  const { schema } = store;
  assert(`Can only use hasMany fields when the resource is in legacy mode`, mode.legacy);
  assert(`You must pass an array of records to set a hasMany relationship`, Array.isArray(value));
  (schema as SchemaService)._kind('@legacy', 'hasMany').set(store, record, resourceKey, field, value);
  return true;
}
