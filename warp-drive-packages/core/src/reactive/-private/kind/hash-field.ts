import { assert } from '@warp-drive/build-config/macros';

import type { HashField } from '../../../types/schema/fields.ts';
import type { KindContext } from '../default-mode.ts';

export function getHashField(context: KindContext<HashField>): unknown {
  const { field, path, resourceKey } = context;
  const { schema, cache } = context.store;
  assert(`Cannot use a ${field.kind} directly on a resource.`, Array.isArray(path) && path.length > 1);
  const realPath = path.slice(0, -1);
  const rawData = context.editable ? cache.getAttr(resourceKey, realPath) : cache.getRemoteAttr(resourceKey, realPath);
  return schema.hashFn(field)(rawData as object, field.options ?? null, field.name ?? null);
}

export function setHashField(context: KindContext<HashField>): boolean {
  assert(
    `ILLEGAL SET: Cannot set '${Array.isArray(context.path) ? context.path.join('.') : context.path}' on '${context.resourceKey.type}' as ${context.field.kind} fields are not mutable`
  );
  return false;
}
