import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { LegacyAliasField, ObjectAliasField, PolarisAliasField } from '../../../types/schema/fields';

export function getAliasField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyAliasField | PolarisAliasField | ObjectAliasField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setAliasField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyAliasField | ObjectAliasField | PolarisAliasField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
