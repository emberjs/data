import { entangleSignal } from '../../../store/-private';
import type { Value } from '../../../types/json/raw';
import type { LegacyAttributeField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';

export function getAttributeField(context: KindContext<LegacyAttributeField>): unknown {
  entangleSignal(context.signals, context.record, context.path.at(-1)!, null);
  const { cache } = context.store;
  return context.editable
    ? cache.getAttr(context.resourceKey, context.path)
    : cache.getRemoteAttr(context.resourceKey, context.path);
}

export function setAttributeField(context: KindContext<LegacyAttributeField>): boolean {
  context.store.cache.setAttr(context.resourceKey, context.path, context.value as Value);
  return true;
}
