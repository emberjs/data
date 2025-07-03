import type { Store } from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { Value } from '../../../types/json/raw';
import type { GenericField } from '../../../types/schema/fields';

export function getGenericField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: GenericField,
  path: string | string[],
  editable: boolean
): unknown {
  const { cache, schema } = store;
  const rawValue = editable ? cache.getAttr(resourceKey, path) : cache.getRemoteAttr(resourceKey, path);

  if (!field.type) {
    return rawValue;
  }

  const transform = schema.transformation(field);
  return transform.hydrate(rawValue, field.options ?? null, record);
}

export function setGenericField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: GenericField,
  path: string | string[],
  value: unknown
): boolean {
  const { cache, schema } = store;

  if (!field.type) {
    cache.setAttr(resourceKey, path, value as Value);
    return true;
  }

  const transform = schema.transformation(field);
  const rawValue = transform.serialize(value, field.options ?? null, record);

  cache.setAttr(resourceKey, path, rawValue);
  return true;
}
