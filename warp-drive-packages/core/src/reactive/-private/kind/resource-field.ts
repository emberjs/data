import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { ResourceField } from '../../../types/schema/fields';

export function getResourceField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: ResourceField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setResourceField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: ResourceField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
