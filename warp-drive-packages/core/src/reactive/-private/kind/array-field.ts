import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { ArrayField } from '../../../types/schema/fields';

export function getArrayField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: ArrayField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setArrayField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: ArrayField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
