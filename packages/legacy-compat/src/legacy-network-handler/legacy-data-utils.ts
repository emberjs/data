import type { AdapterPayload } from '@ember-data/types/q/minimum-adapter-interface';

export function iterateData<T>(data: T[] | T, fn: (o: T, index?: number) => T) {
  if (Array.isArray(data)) {
    return data.map(fn);
  } else {
    return fn(data);
  }
}

export function payloadIsNotBlank<T>(adapterPayload: T | AdapterPayload): adapterPayload is AdapterPayload {
  if (Array.isArray(adapterPayload)) {
    return true;
  } else {
    return Object.keys(adapterPayload || {}).length !== 0;
  }
}

export function deepCopy<T>(obj: T): T {
  return _deepCopy(obj, new WeakMap());
}

function _deepCopy<T>(oldObject: T, seen: WeakMap<object, object>): T {
  if (Array.isArray(oldObject)) {
    return copyArray(oldObject as unknown as T[], seen) as unknown as T;
  } else if (!isPrimitive(oldObject)) {
    if (seen.has(oldObject as object)) {
      return seen.get(oldObject as object) as T;
    }
    return copyObject(oldObject as Record<string, unknown>, seen) as T;
  } else {
    return oldObject;
  }
}

function isPrimitive(value: unknown): value is null | undefined | string | number | boolean | symbol | bigint {
  return typeof value !== 'object' || value === null;
}

function copyObject<T extends Record<string, unknown>>(oldObject: T, seen: WeakMap<object, object>): T {
  let newObject = {} as T;

  Object.keys(oldObject).forEach((key) => {
    let value = oldObject[key as keyof T];
    let newValue = isPrimitive(value) ? value : seen.get(value as object);

    if (value && newValue === undefined) {
      newValue = newObject[key as keyof T] = _deepCopy(value, seen);
      seen.set(value as object, newValue);
    }

    newObject[key as keyof T] = newValue as T[keyof T];
  });

  return newObject;
}

function copyArray<T>(oldArray: T[], seen: WeakMap<object, object>): T[] {
  let newArray: T[] = [];

  for (let i = 0; i < oldArray.length; i++) {
    let value = oldArray[i];
    let newValue = isPrimitive(value) ? value : seen.get(value as object);

    if (value && newValue === undefined) {
      newValue = newArray[i] = _deepCopy(value, seen);
      seen.set(value as object, newValue);
    }

    newArray[i] = newValue as T;
  }

  return newArray;
}
