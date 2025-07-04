import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL } from '../../../store/-private';
import type { ArrayValue } from '../../../types/json/raw';
import type { SchemaArrayField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';
import { ManagedArrayMap, peekManagedArray } from './array-field.ts';

export { getArrayField as getSchemaArrayField } from './array-field';

export function setSchemaArrayField(context: KindContext<SchemaArrayField>): boolean {
  const arrayValue = (context.value as ArrayValue)?.slice();
  if (!Array.isArray(arrayValue)) {
    ManagedArrayMap.delete(context.record);
  }

  context.store.cache.setAttr(context.resourceKey, context.path, arrayValue);
  const peeked = peekManagedArray(context.record, context.field);
  if (peeked) {
    assert(`Expected the peekManagedArray for ${context.field.kind} to return a ManagedArray`, ARRAY_SIGNAL in peeked);
    const arrSignal = peeked[ARRAY_SIGNAL];
    arrSignal.isStale = true;
  }

  return true;
}
