import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { ObjectField } from '../../../types/schema/fields';

export function getObjectField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: ObjectField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setObjectField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: ObjectField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
