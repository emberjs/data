import { entangleInitiallyStaleSignal } from '../../../store/-private';
import type { Value } from '../../../types/json/raw';
import type { GenericField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';

export function getGenericField(context: KindContext<GenericField>): unknown {
  const signal = entangleInitiallyStaleSignal(context.signals, context.record, context.path.at(-1)!, null);
  if (!signal.isStale) {
    return signal.value;
  }
  signal.isStale = false;
  const { cache, schema } = context.store;
  const rawValue = context.editable
    ? cache.getAttr(context.resourceKey, context.path)
    : cache.getRemoteAttr(context.resourceKey, context.path);

  const { field } = context;
  if (!field.type) {
    signal.value = rawValue;
    return rawValue;
  }

  const transform = schema.transformation(field);
  signal.value = transform.hydrate(rawValue, field.options ?? null, context.record);
  return signal.value;
}

export function setGenericField(context: KindContext<GenericField>): boolean {
  const { cache, schema } = context.store;
  const { field } = context;

  if (!field.type) {
    cache.setAttr(context.resourceKey, context.path, context.value as Value);
    return true;
  }

  const transform = schema.transformation(field);
  const rawValue = transform.serialize(context.value, field.options ?? null, context.record);

  cache.setAttr(context.resourceKey, context.path, rawValue);
  return true;
}
