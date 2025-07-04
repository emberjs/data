import type { Value } from '../../../types/json/raw';
import type { LegacyAttributeField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';
import type { ReactiveResource } from '../record';

export function getAttributeField(context: KindContext<LegacyAttributeField>, record: ReactiveResource): unknown {
  const { cache } = context.store;
  return context.editable
    ? cache.getAttr(context.resourceKey, context.path)
    : cache.getRemoteAttr(context.resourceKey, context.path);
}

export function setAttributeField(
  context: KindContext<LegacyAttributeField>,
  record: ReactiveResource,
  value: unknown
): boolean {
  const { cache } = context.store;

  cache.setAttr(context.resourceKey, context.path, value as Value);
  return true;
}
