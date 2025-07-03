import { assert } from '@warp-drive/build-config/macros';

import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { CollectionField } from '../../../types/schema/fields';
import type { ModeInfo } from '../default-mode';

export function getCollectionField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: CollectionField,
  path: string | string[],
  mode: ModeInfo
): unknown {
  const { cache } = store;
  return mode.editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setCollectionField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: CollectionField,
  path: string | string[],
  mode: ModeInfo,
  value: unknown
): boolean {
  assert(`Setting collection fields is not yet implemented`);
  return false;
}
