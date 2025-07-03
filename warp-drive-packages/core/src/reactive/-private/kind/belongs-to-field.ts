import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { LegacyBelongsToField } from '../../../types/schema/fields';

export function getBelongsToField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyBelongsToField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setBelongsToField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyBelongsToField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
