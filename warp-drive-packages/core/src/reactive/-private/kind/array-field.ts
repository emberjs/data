import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL, type Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { ArrayValue, ObjectValue } from '../../../types/json/raw';
import type { ArrayField, SchemaArrayField } from '../../../types/schema/fields';
import { ManagedArrayMap, peekManagedArray } from '../fields/compute';
import { ManagedArray } from '../fields/managed-array';
import { Legacy, type ReactiveResource } from '../record';
import type { SchemaService } from '../schema';

export function getArrayField(
  store: Store,
  record: ReactiveResource,
  resourceKey: StableRecordIdentifier,
  field: ArrayField | SchemaArrayField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache, schema } = store;
  const legacy = record[Legacy];

  const isSchemaArray = field.kind === 'schema-array';
  // the thing we hand out needs to know its owner and path in a private manner
  // its "address" is the parent identifier (identifier) + field name (field.name)
  //  in the nested object case field name here is the full dot path from root resource to this value
  // its "key" is the field on the parent record
  // its "owner" is the parent record

  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  let managedArray: ManagedArray | undefined;
  if (managedArrayMapForRecord) {
    managedArray = managedArrayMapForRecord.get(field.name) as ManagedArray | undefined;
  }
  if (managedArray) {
    return managedArray;
  } else {
    const rawValue = (
      editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path)
    ) as unknown[];
    if (!rawValue) {
      return null;
    }
    managedArray = new ManagedArray(
      store,
      schema as SchemaService,
      cache,
      field,
      rawValue,
      resourceKey,
      path,
      record,
      isSchemaArray,
      editable,
      legacy
    );
    if (!managedArrayMapForRecord) {
      ManagedArrayMap.set(record, new Map([[field.name, managedArray]]));
    } else {
      managedArrayMapForRecord.set(field.name, managedArray);
    }
  }
  return managedArray;
}

export function setArrayField(
  store: Store,
  record: ReactiveResource,
  resourceKey: StableRecordIdentifier,
  field: ArrayField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache, schema } = store;

  if (!field.type) {
    cache.setAttr(resourceKey, path, (value as ArrayValue)?.slice());
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
  cache.setAttr(resourceKey, path, rawValue);
  const peeked = peekManagedArray(record, field);
  if (peeked) {
    assert(`Expected the peekManagedArray for ${field.kind} to return a ManagedArray`, ARRAY_SIGNAL in peeked);
    const arrSignal = peeked[ARRAY_SIGNAL];
    arrSignal.isStale = true;
  }
  return true;

  return true;
}
