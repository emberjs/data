import type { AdapterPayload } from './minimum-adapter-interface.ts';

type IteratorCB<T> = ((o: T, index: number) => T) | ((o: T) => T);

export function iterateData<T>(data: T[] | T, fn: IteratorCB<T>): T | T[] {
  if (Array.isArray(data)) {
    return data.map(fn);
  } else {
    return fn(data, 0);
  }
}

export function payloadIsNotBlank<T>(adapterPayload: T | AdapterPayload): adapterPayload is AdapterPayload {
  if (Array.isArray(adapterPayload)) {
    return true;
  } else {
    return Object.keys(adapterPayload || {}).length !== 0;
  }
}
