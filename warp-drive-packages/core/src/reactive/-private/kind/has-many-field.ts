import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { LegacyHasManyField } from '../../../types/schema/fields';

export function getHasManyField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyHasManyField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setHasManyField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyHasManyField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
