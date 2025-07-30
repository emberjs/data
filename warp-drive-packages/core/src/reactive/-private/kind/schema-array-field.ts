import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL, peekInternalSignal } from '../../../store/-private';
import type { ArrayValue } from '../../../types/json/raw';
import type { SchemaArrayField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';
import type { ManagedArray } from '../fields/managed-array.ts';

export { getArrayField as getSchemaArrayField } from './array-field';

export function setSchemaArrayField(context: KindContext<SchemaArrayField>): boolean {
  const arrayValue = context.value === null ? null : (context.value as ArrayValue)?.slice();
  const fieldSignal = peekInternalSignal(context.signals, context.path.at(-1)!);
  const peeked = fieldSignal?.value as ManagedArray | undefined | null;

  context.store.cache.setAttr(context.resourceKey, context.path, arrayValue);
  if (peeked) {
    assert(`Expected the peekManagedArray for ${context.field.kind} to return a ManagedArray`, ARRAY_SIGNAL in peeked);
    const arrSignal = peeked[ARRAY_SIGNAL];
    arrSignal.isStale = true;

    if (!Array.isArray(arrayValue)) {
      fieldSignal!.value = null;
    }
  }

  return true;
}
