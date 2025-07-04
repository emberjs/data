import { assert } from '@warp-drive/build-config/macros';

import { entangleSignal } from '../../../store/-private.ts';
import type { IdentityField } from '../../../types/schema/fields.ts';
import type { KindContext } from '../default-mode.ts';

export function getIdentityField(context: KindContext<IdentityField>): unknown {
  entangleSignal(context.signals, context.record, '@identity', null);
  return context.resourceKey.id;
}

export function setIdentityField(context: KindContext<IdentityField>): boolean {
  const { value, resourceKey, store } = context;
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
