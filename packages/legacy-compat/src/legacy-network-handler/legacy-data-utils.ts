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
