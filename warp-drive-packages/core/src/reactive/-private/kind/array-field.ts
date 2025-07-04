import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL } from '../../../store/-private';
import type { RelatedCollection as ManyArray } from '../../../store/-private.ts';
import { getOrSetGlobal } from '../../../types/-private';
import type { ArrayValue, ObjectValue } from '../../../types/json/raw';
import type { ArrayField, FieldSchema, SchemaArrayField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';
import { ManagedArray } from '../fields/managed-array';
import type { ReactiveResource } from '../record';

export const ManagedArrayMap: Map<ReactiveResource, Map<string, ManagedArray | ManyArray>> = getOrSetGlobal(
  'ManagedArrayMap',
  new Map<ReactiveResource, Map<string, ManagedArray | ManyArray>>()
);

export function peekManagedArray(record: ReactiveResource, field: FieldSchema): ManyArray | ManagedArray | undefined {
  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  if (managedArrayMapForRecord) {
    return managedArrayMapForRecord.get(field.name);
  }
}

export function getArrayField(context: KindContext<ArrayField | SchemaArrayField>, record: ReactiveResource): unknown {
  // the thing we hand out needs to know its owner and path in a private manner
  // its "address" is the parent identifier (identifier) + field name (field.name)
  //  in the nested object case field name here is the full dot path from root resource to this value
  // its "key" is the field on the parent record
  // its "owner" is the parent record
  const { field } = context;
  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  let managedArray: ManagedArray | undefined;
  if (managedArrayMapForRecord) {
    managedArray = managedArrayMapForRecord.get(field.name) as ManagedArray | undefined;
  }
  if (managedArray) {
    return managedArray;
  } else {
    const { store, resourceKey, path } = context;
    const { cache } = store;
    const rawValue = (
      context.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path)
    ) as unknown[];
    if (!rawValue) {
      return null;
    }
    managedArray = new ManagedArray(context, record, rawValue);
    if (!managedArrayMapForRecord) {
      ManagedArrayMap.set(record, new Map([[field.name, managedArray]]));
    } else {
      managedArrayMapForRecord.set(field.name, managedArray);
    }
  }
  return managedArray;
}

export function setArrayField(
  context: KindContext<ArrayField | SchemaArrayField>,
  record: ReactiveResource,
  value: unknown
): boolean {
  const { field } = context;
  const { cache, schema } = context.store;

  if (!field.type) {
    cache.setAttr(context.resourceKey, context.path, (value as ArrayValue)?.slice());
    const peeked = peekManagedArray(record, field);
    if (peeked) {
      assert(`Expected the peekManagedArray for ${field.kind} to return a ManagedArray`, ARRAY_SIGNAL in peeked);
      const arrSignal = peeked[ARRAY_SIGNAL];
      arrSignal.isStale = true;
    }
    if (!Array.isArray(value)) {
      ManagedArrayMap.delete(record);
    }
    return true;
  }

  const transform = schema.transformation(field);
  const rawValue = (value as ArrayValue).map((item) =>
    transform.serialize(item, (field.options as ObjectValue) ?? null, record)
  );
  cache.setAttr(context.resourceKey, context.path, rawValue);
  const peeked = peekManagedArray(record, field);
  if (peeked) {
    assert(`Expected the peekManagedArray for ${field.kind} to return a ManagedArray`, ARRAY_SIGNAL in peeked);
    const arrSignal = peeked[ARRAY_SIGNAL];
    arrSignal.isStale = true;
  }
  return true;
}
