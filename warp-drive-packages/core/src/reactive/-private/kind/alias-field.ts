import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { LegacyAliasField, ObjectAliasField, PolarisAliasField } from '../../../types/schema/fields';
import type { ModeInfo } from '../default-mode';

export function getAliasField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyAliasField | PolarisAliasField | ObjectAliasField,
  path: string | string[],
  mode: ModeInfo
): unknown {
  const { cache } = store;
  return mode.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setAliasField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyAliasField | ObjectAliasField | PolarisAliasField,
  path: string | string[],
  mode: ModeInfo,
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
