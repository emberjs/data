import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { Value } from '../../../types/json/raw';
import type { LegacyAttributeField } from '../../../types/schema/fields';
import type { ModeInfo } from '../default-mode';

export function getAttributeField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyAttributeField,
  path: string | string[],
  mode: ModeInfo
): unknown {
  const { cache } = store;
  return mode.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setAttributeField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyAttributeField,
  path: string | string[],
  mode: ModeInfo,
  value: unknown
): boolean {
  const { cache } = store;

  cache.setAttr(resourceKey, path, value as Value);
  return true;
}
