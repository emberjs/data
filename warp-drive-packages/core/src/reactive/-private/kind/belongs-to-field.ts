import { assert } from '@warp-drive/build-config/macros';

import type { LegacyBelongsToField } from '../../../types/schema/fields';
import type { SingleResourceRelationship } from '../../../types/spec/json-api-raw';
import type { KindContext } from '../default-mode';
import { getFieldCacheKeyStrict } from '../fields/get-field-key';
import type { SchemaService } from '../schema';

export function getBelongsToField(context: KindContext<LegacyBelongsToField>): unknown {
  const { field, resourceKey, store } = context;
  const { schema, cache } = store;
  if (field.options.linksMode) {
    const rawValue = context.editable
      ? (cache.getRelationship(resourceKey, getFieldCacheKeyStrict(field)) as SingleResourceRelationship)
      : (cache.getRemoteRelationship(resourceKey, getFieldCacheKeyStrict(field)) as SingleResourceRelationship);

    return rawValue.data ? store.peekRecord(rawValue.data) : null;
  }

  // FIXME move this to a "LegacyMode" make this part of "PolarisMode"
  assert(`Can only use belongsTo fields when the resource is in legacy mode`, context.legacy);
  return (schema as SchemaService)._kind('@legacy', 'belongsTo').get(store, context.record, resourceKey, field);
}

export function setBelongsToField(context: KindContext<LegacyBelongsToField>): boolean {
  const { store } = context;
  const { schema } = store;

  assert(`Can only mutate belongsTo fields when the resource is in legacy mode`, context.legacy);
  (schema as SchemaService)
    ._kind('@legacy', 'belongsTo')
    .set(store, context.record, context.resourceKey, context.field, context.value);
  return true;
}
