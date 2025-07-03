import { OBJECT_SIGNAL, type Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { ObjectValue, Value } from '../../../types/json/raw';
import type { ObjectField } from '../../../types/schema/fields';
import type { ModeInfo } from '../default-mode';
import { ManagedObject, ManagedObjectMap, peekManagedObject } from '../fields/managed-object';
import type { ReactiveResource } from '../record';
import type { SchemaService } from '../schema';

export function getObjectField(
  store: Store,
  record: ReactiveResource,
  resourceKey: StableRecordIdentifier,
  field: ObjectField,
  path: string | string[],
  mode: ModeInfo
): unknown {
  const { cache, schema } = store;
  const managedObjectMapForRecord = ManagedObjectMap.get(record);
  let managedObject;
  if (managedObjectMapForRecord) {
    managedObject = managedObjectMapForRecord.get(field.name);
  }
  if (managedObject) {
    return managedObject as ManagedObject;
  } else {
    let rawValue = (
      mode.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path)
    ) as object;
    if (!rawValue) {
      return null;
    }
    if (field.type) {
      const transform = schema.transformation(field);
      rawValue = transform.hydrate(rawValue as ObjectValue, field.options ?? null, record) as object;
    }
    managedObject = new ManagedObject(
      schema as SchemaService,
      cache,
      field,
      rawValue,
      resourceKey,
      path,
      record,
      mode.editable,
      mode.legacy
    );

    if (!managedObjectMapForRecord) {
      ManagedObjectMap.set(record, new Map([[field.name, managedObject]]));
    } else {
      managedObjectMapForRecord.set(field.name, managedObject);
    }
  }
  return managedObject;
}

export function setObjectField(
  store: Store,
  record: ReactiveResource,
  resourceKey: StableRecordIdentifier,
  field: ObjectField,
  path: string | string[],
  mode: ModeInfo,
  value: unknown
): boolean {
  const { cache, schema } = store;

  if (!field.type) {
    let newValue = value as Value;
    if (value !== null) {
      newValue = { ...(value as ObjectValue) };
    } else {
      ManagedObjectMap.delete(record);
    }

    cache.setAttr(resourceKey, path, newValue);

    const peeked = peekManagedObject(record, field);
    if (peeked) {
      const objSignal = peeked[OBJECT_SIGNAL];
      objSignal.isStale = true;
    }
    return true;
  }

  const transform = schema.transformation(field);
  const rawValue = transform.serialize({ ...(value as ObjectValue) }, field.options ?? null, target);

  cache.setAttr(resourceKey, path, rawValue);
  const peeked = peekManagedObject(record, field);
  if (peeked) {
    const objSignal = peeked[OBJECT_SIGNAL];
    objSignal.isStale = true;
  }
  return true;
}
