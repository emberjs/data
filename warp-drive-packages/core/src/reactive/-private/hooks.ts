import { assert } from '@warp-drive/core/build-config/macros';

import type { Store } from '../../index.ts';
import type { StableRecordIdentifier } from '../../types.ts';
import { isResourceSchema } from '../../types/schema/fields.ts';
import { ReactiveResource } from './record.ts';
import type { SchemaService } from './schema.ts';
import { Destroy, Editable, Legacy } from './symbols.ts';

export function instantiateRecord(
  store: Store,
  identifier: StableRecordIdentifier,
  createArgs?: Record<string, unknown>
): ReactiveResource {
  const schema = store.schema as unknown as SchemaService;
  const resourceSchema = schema.resource(identifier);
  assert(`Expected a resource schema`, isResourceSchema(resourceSchema));
  const isLegacy = resourceSchema?.legacy ?? false;
  const isEditable = isLegacy || store.cache.isNew(identifier);
  const record = new ReactiveResource(store, identifier, {
    [Editable]: isEditable,
    [Legacy]: isLegacy,
  });

  if (createArgs) {
    Object.assign(record, createArgs);
  }

  return record;
}

function assertReactiveResource(record: unknown): asserts record is ReactiveResource {
  assert('Expected a ReactiveResource', record && typeof record === 'object' && Destroy in record);
}

export function teardownRecord(record: unknown): void {
  assertReactiveResource(record);
  record[Destroy]();
}
