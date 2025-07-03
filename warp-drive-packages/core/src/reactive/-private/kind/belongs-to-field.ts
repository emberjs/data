import { assert } from '@warp-drive/build-config/macros';

import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { LegacyBelongsToField } from '../../../types/schema/fields';
import type { SingleResourceRelationship } from '../../../types/spec/json-api-raw';
import type { ModeInfo } from '../default-mode';
import { getFieldCacheKeyStrict } from '../fields/get-field-key';
import type { SchemaService } from '../schema';

export function getBelongsToField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyBelongsToField,
  path: string | string[],
  mode: ModeInfo
): unknown {
  const { schema, cache } = store;
  if (field.options.linksMode) {
    const rawValue = mode.editable
      ? (cache.getRelationship(resourceKey, getFieldCacheKeyStrict(field)) as SingleResourceRelationship)
      : (cache.getRemoteRelationship(resourceKey, getFieldCacheKeyStrict(field)) as SingleResourceRelationship);

    return rawValue.data ? store.peekRecord(rawValue.data) : null;
  }

  // FIXME move this to a "LegacyMode" make this part of "PolarisMode"
  assert(`Can only use belongsTo fields when the resource is in legacy mode`, mode.legacy);
  return (schema as SchemaService)._kind('@legacy', 'belongsTo').get(store, record, resourceKey, field);
}

export function setBelongsToField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LegacyBelongsToField,
  path: string | string[],
  mode: ModeInfo,
  value: unknown
): boolean {
  const { schema } = store;

  assert(`Can only mutate belongsTo fields when the resource is in legacy mode`, mode.legacy);
  (schema as SchemaService)._kind('@legacy', 'belongsTo').set(store, record, resourceKey, field, value);
  return true;
}
