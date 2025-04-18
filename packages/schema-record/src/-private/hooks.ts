import type Store from '@ember-data/store';
import { assert } from '@warp-drive/build-config/macros';
import type { ResourceCacheKey } from '@warp-drive/core-types';
import { isResourceSchema } from '@warp-drive/core-types/schema/fields';

import { SchemaRecord } from './record';
import type { SchemaService } from './schema';
import { Destroy, Editable, Legacy } from './symbols';

export function instantiateRecord(
  store: Store,
  identifier: ResourceCacheKey,
  createArgs?: Record<string, unknown>
): SchemaRecord {
  const schema = store.schema as unknown as SchemaService;
  const resourceSchema = schema.resource(identifier);
  assert(`Expected a resource schema`, isResourceSchema(resourceSchema));
  const isLegacy = resourceSchema?.legacy ?? false;
  const isEditable = isLegacy || store.cache.isNew(identifier);
  const record = new SchemaRecord(store, identifier, {
    [Editable]: isEditable,
    [Legacy]: isLegacy,
  });

  if (createArgs) {
    Object.assign(record, createArgs);
  }

  return record;
}

function assertSchemaRecord(record: unknown): asserts record is SchemaRecord {
  assert('Expected a SchemaRecord', record && typeof record === 'object' && Destroy in record);
}

export function teardownRecord(record: unknown): void {
  assertSchemaRecord(record);
  record[Destroy]();
}
