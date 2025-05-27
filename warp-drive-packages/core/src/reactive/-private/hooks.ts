import { assert } from '@warp-drive/core/build-config/macros';

import type { Store } from '../../index.ts';
import type { StableRecordIdentifier } from '../../types.ts';
import { isResourceSchema } from '../../types/schema/fields.ts';
import { SchemaRecord } from './record.ts';
import type { SchemaService } from './schema.ts';
import { Destroy, Editable, Legacy } from './symbols.ts';

export function instantiateRecord(
  store: Store,
  identifier: StableRecordIdentifier,
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
