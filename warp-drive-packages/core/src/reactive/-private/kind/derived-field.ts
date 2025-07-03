import { assert } from '@warp-drive/build-config/macros';

import type { Store } from '../../../store/-private.ts';
import type { StableRecordIdentifier } from '../../../types.ts';
import type { DerivedField } from '../../../types/schema/fields.ts';

export function getDerivedField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: DerivedField,
  path: string | string[],
  editable: boolean
): unknown {
  const { schema } = store;
  const prop = Array.isArray(path) ? path.at(-1)! : path;
  return schema.derivation(field)(record, field.options ?? null, prop);
}

export function setDerivedField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: DerivedField,
  path: string | string[],
  value: unknown
): boolean {
  assert(
    `ILLEGAL SET: Cannot set '${Array.isArray(path) ? path.join('.') : path}' on '${resourceKey.type}' as ${field.kind} fields are not mutable`
  );
  return false;
}
