import { assert } from '@warp-drive/build-config/macros';

import type { Store } from '../../../store/-private.ts';
import type { StableRecordIdentifier } from '../../../types.ts';
import type { IdentityField } from '../../../types/schema/fields.ts';

export function getIdentityField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: IdentityField,
  path: string | string[],
  editable: boolean
): unknown {
  return resourceKey.id;
}

export function setIdentityField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: IdentityField,
  path: string | string[],
  value: unknown
): boolean {
  assert(`Expected to receive a string id`, typeof value === 'string' && value.length);
  const normalizedId = String(value);
  const didChange = normalizedId !== resourceKey.id;
  assert(
    `Cannot set ${resourceKey.type} record's id to ${normalizedId}, because id is already ${resourceKey.id}`,
    !didChange || resourceKey.id === null
  );

  if (normalizedId !== null && didChange) {
    store._instanceCache.setRecordId(resourceKey, normalizedId);
    store.notifications.notify(resourceKey, 'identity');
  }
  return true;
}
