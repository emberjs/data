import { assert } from '@warp-drive/build-config/macros';

import { entangleSignal } from '../../../store/-private';
import type { ObjectValue, Value } from '../../../types/json/raw';
import type { SchemaObjectField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';
import { ManagedObjectMap } from '../fields/managed-object';
import { ReactiveResource } from '../record';

export function getSchemaObjectField(context: KindContext<SchemaObjectField>): unknown {
  entangleSignal(context.signals, context.record, context.path.at(-1)!, null);
  const { record, field } = context;
  const schemaObjectMapForRecord = ManagedObjectMap.get(record);
  let schemaObject;
  if (schemaObjectMapForRecord) {
    schemaObject = schemaObjectMapForRecord.get(field.name);
  }
  if (schemaObject) {
    return schemaObject as ReactiveResource;
  } else {
    const { store, resourceKey, path } = context;
    const { cache } = store;
    const rawValue = (
      context.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path)
    ) as object;
    if (!rawValue) {
      return null;
    }
    schemaObject = new ReactiveResource({
      store: context.store,
      resourceKey: context.resourceKey,
      modeName: context.modeName,
      legacy: context.legacy,
      editable: context.editable,
      path: context.path,
      field: context.field,
    });
  }
  if (!schemaObjectMapForRecord) {
    ManagedObjectMap.set(record, new Map([[field.name, schemaObject]]));
  } else {
    schemaObjectMapForRecord.set(field.name, schemaObject);
  }
  return schemaObject;
}

export function setSchemaObjectField(context: KindContext<SchemaObjectField>): boolean {
  const { store, value } = context;
  let newValue = value as Value;
  if (value !== null) {
    assert(`Expected value to be an object`, typeof value === 'object');
    newValue = { ...(value as ObjectValue) };
    const schemaFields = store.schema.fields({ type: context.field.type });
    for (const key of Object.keys(newValue)) {
      if (!schemaFields.has(key)) {
        throw new Error(`Field ${key} does not exist on schema object ${context.field.type}`);
      }
    }
  } else {
    ManagedObjectMap.delete(context.record);
  }
  store.cache.setAttr(context.resourceKey, context.path, newValue);
  // const peeked = peekManagedObject(self, field);
  // if (peeked) {
  //   const objSignal = peeked[OBJECT_SIGNAL];
  //   objSignal.isStale = true;
  // }
  return true;
}
