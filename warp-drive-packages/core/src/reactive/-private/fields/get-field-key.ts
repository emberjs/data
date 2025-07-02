import { assert } from '@warp-drive/build-config/macros';

import type { CacheableFieldSchema, FieldSchema, HashField, IdentityField } from '../../../types/schema/fields.ts';

const InvalidKinds = ['alias', 'derived', '@local'] as const;
type InvalidKind = 'alias' | 'derived' | '@local';

function isInvalidKind(kind: string): kind is InvalidKind {
  return InvalidKinds.includes(kind as InvalidKind);
}

export function getFieldCacheKeyStrict(field: CacheableFieldSchema): string {
  return field.sourceKey || field.name;
}

export function getFieldCacheKey(field: FieldSchema | IdentityField | HashField): string | null {
  return 'sourceKey' in field && field.sourceKey ? field.sourceKey : field.name;
}

export function assertIsCacheField(field: FieldSchema | IdentityField): asserts field is CacheableFieldSchema {
  assert(
    `The FieldSchema ${field.kind} is not a CacheField and cannot be used to retrieve cache data`,
    !isInvalidKind(field.kind)
  );
}
