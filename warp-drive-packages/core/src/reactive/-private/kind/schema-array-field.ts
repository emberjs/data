import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL, type Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { ArrayValue } from '../../../types/json/raw';
import type { SchemaArrayField } from '../../../types/schema/fields';
import { ManagedArrayMap, peekManagedArray } from '../fields/compute';
import type { ReactiveResource } from '../record';

export { getArrayField as getSchemaArrayField } from './array-field';

export function setSchemaArrayField(
  store: Store,
  record: ReactiveResource,
  resourceKey: StableRecordIdentifier,
  field: SchemaArrayField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  const arrayValue = (value as ArrayValue)?.slice();
  if (!Array.isArray(arrayValue)) {
    ManagedArrayMap.delete(record);
  }
  cache.setAttr(resourceKey, path, arrayValue);
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
