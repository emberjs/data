import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { SchemaArrayField } from '../../../types/schema/fields';

export function getSchemaArrayField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: SchemaArrayField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setSchemaArrayField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: SchemaArrayField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
