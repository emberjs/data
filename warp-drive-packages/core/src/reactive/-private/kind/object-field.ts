import { entangleSignal, OBJECT_SIGNAL } from '../../../store/-private';
import type { ObjectValue, Value } from '../../../types/json/raw';
import type { ObjectField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';
import { ManagedObject, ManagedObjectMap, peekManagedObject } from '../fields/managed-object';

export function getObjectField(context: KindContext<ObjectField>): unknown {
  entangleSignal(context.signals, context.record, context.path.at(-1)!, null);
  const { record, field } = context;
  const managedObjectMapForRecord = ManagedObjectMap.get(record);
  let managedObject;
  if (managedObjectMapForRecord) {
    managedObject = managedObjectMapForRecord.get(field.name);
  }
  if (managedObject) {
    return managedObject as ManagedObject;
  } else {
    const { store, resourceKey, path } = context;
    const { cache, schema } = store;
    let rawValue = (
      context.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path)
    ) as object;
    if (!rawValue) {
      return null;
    }
    if (field.type) {
      const transform = schema.transformation(field);
      rawValue = transform.hydrate(rawValue as ObjectValue, (field.options as ObjectValue) ?? null, record) as object;
    }

    managedObject = new ManagedObject({
      store,
      resourceKey,
      modeName: context.modeName,
      legacy: context.legacy,
      editable: context.editable,
      path,
      field,
      record,
      signals: context.signals,
      value: rawValue,
    });

    if (!managedObjectMapForRecord) {
      ManagedObjectMap.set(record, new Map([[field.name, managedObject]]));
    } else {
      managedObjectMapForRecord.set(field.name, managedObject);
    }
  }
  return managedObject;
}

export function setObjectField(context: KindContext<ObjectField>): boolean {
  const { field, value, record } = context;
  const { cache, schema } = context.store;

  if (!field.type) {
    let newValue = value as Value;
    if (value !== null) {
      newValue = { ...(value as ObjectValue) };
    } else {
      ManagedObjectMap.delete(record);
    }

    cache.setAttr(context.resourceKey, context.path, newValue);

    const peeked = peekManagedObject(record, field);
    if (peeked) {
      const objSignal = peeked[OBJECT_SIGNAL];
      objSignal.isStale = true;
    }
    return true;
  }

  const transform = schema.transformation(field);
  const rawValue = transform.serialize({ ...(value as ObjectValue) }, (field.options as ObjectValue) ?? null, record);

  cache.setAttr(context.resourceKey, context.path, rawValue);
  const peeked = peekManagedObject(record, field);
  if (peeked) {
    const objSignal = peeked[OBJECT_SIGNAL];
    objSignal.isStale = true;
  }
  return true;
}
