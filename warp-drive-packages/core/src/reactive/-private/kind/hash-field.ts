import { assert } from '@warp-drive/build-config/macros';

import type { Store } from '../../../store/-private.ts';
import type { StableRecordIdentifier } from '../../../types.ts';
import type { HashField } from '../../../types/schema/fields.ts';
import type { ModeInfo } from '../default-mode.ts';

export function getHashField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: HashField,
  path: string | string[],
  mode: ModeInfo
): unknown {
  const { schema, cache } = store;
  assert(`Cannot use a ${field.kind} directly on a resource.`, Array.isArray(path) && path.length > 1);
  const realPath = path.slice(0, -1);
  const rawData = mode.editable ? cache.getAttr(resourceKey, realPath) : cache.getRemoteAttr(resourceKey, realPath);
  return schema.hashFn(field)(rawData as object, field.options ?? null, field.name ?? null);
}

export function setHashField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: HashField,
  path: string | string[],
  mode: ModeInfo,
  value: unknown
): boolean {
  assert(
    `ILLEGAL SET: Cannot set '${Array.isArray(path) ? path.join('.') : path}' on '${resourceKey.type}' as ${field.kind} fields are not mutable`
  );
  return false;
}
