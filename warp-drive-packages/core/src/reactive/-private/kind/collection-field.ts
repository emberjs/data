import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { CollectionField } from '../../../types/schema/fields';

export function getCollectionField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: CollectionField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setCollectionField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: CollectionField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
