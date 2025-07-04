import { entangleSignal } from '../../../store/-private';
import type { Value } from '../../../types/json/raw';
import type { GenericField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';

export function getGenericField(context: KindContext<GenericField>): unknown {
  entangleSignal(context.signals, context.record, context.path.at(-1)!, null);
  const { cache, schema } = context.store;
  const rawValue = context.editable
    ? cache.getAttr(context.resourceKey, context.path)
    : cache.getRemoteAttr(context.resourceKey, context.path);

  const { field } = context;
  if (!field.type) {
    return rawValue;
  }

  const transform = schema.transformation(field);
  return transform.hydrate(rawValue, field.options ?? null, context.record);
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
