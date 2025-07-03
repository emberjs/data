import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { SchemaObjectField } from '../../../types/schema/fields';

export function getSchemaObjectField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: SchemaObjectField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache } = store;
  return editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);
}

export function setSchemaObjectField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: SchemaObjectField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache } = store;

  return true;
}
