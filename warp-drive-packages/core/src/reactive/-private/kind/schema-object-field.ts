import { assert } from '@warp-drive/build-config/macros';

import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { ObjectValue, Value } from '../../../types/json/raw';
import type { SchemaObjectField } from '../../../types/schema/fields';
import type { ModeInfo } from '../default-mode';
import { ManagedObjectMap } from '../fields/managed-object';
import { ReactiveResource } from '../record';

export function getSchemaObjectField(
  store: Store,
  record: ReactiveResource,
  resourceKey: StableRecordIdentifier,
  field: SchemaObjectField,
  path: string | string[],
  mode: ModeInfo
): unknown {
  const schemaObjectMapForRecord = ManagedObjectMap.get(record);
  let schemaObject;
  if (schemaObjectMapForRecord) {
    schemaObject = schemaObjectMapForRecord.get(field.name);
  }
  if (schemaObject) {
    return schemaObject as ReactiveResource;
  } else {
    const { cache } = store;
    const rawValue = (
      mode.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path)
    ) as object;
    if (!rawValue) {
      return null;
    }
    const embeddedPath = path.slice();
    schemaObject = new ReactiveResource(store, resourceKey, mode, true, field, embeddedPath);
  }
  if (!schemaObjectMapForRecord) {
    ManagedObjectMap.set(record, new Map([[field.name, schemaObject]]));
  } else {
    schemaObjectMapForRecord.set(field.name, schemaObject);
  }
  return schemaObject;
}

export function setSchemaObjectField(
  store: Store,
  record: ReactiveResource,
  resourceKey: StableRecordIdentifier,
  field: SchemaObjectField,
  path: string | string[],
  mode: ModeInfo,
  value: unknown
): boolean {
  const { cache, schema } = store;
  let newValue = value as Value;
  if (value !== null) {
    assert(`Expected value to be an object`, typeof value === 'object');
    newValue = { ...(value as ObjectValue) };
    const schemaFields = schema.fields({ type: field.type });
    for (const key of Object.keys(newValue)) {
      if (!schemaFields.has(key)) {
        throw new Error(`Field ${key} does not exist on schema object ${field.type}`);
      }
    }
  } else {
    ManagedObjectMap.delete(record);
  }
  cache.setAttr(resourceKey, path, newValue);
  // const peeked = peekManagedObject(self, field);
  // if (peeked) {
  //   const objSignal = peeked[OBJECT_SIGNAL];
  //   objSignal.isStale = true;
  // }
  return true;
}
