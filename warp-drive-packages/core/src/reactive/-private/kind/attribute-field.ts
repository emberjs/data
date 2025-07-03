import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { Value } from '../../../types/json/raw';
import type { LegacyAttributeField } from '../../../types/schema/fields';

export function getAttributeField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyAttributeField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setAttributeField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyAttributeField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  cache.setAttr(resourceKey, path, value as Value);
  return true;
}
