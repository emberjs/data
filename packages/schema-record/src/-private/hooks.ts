import type Store from '@ember-data/store';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';

import { SchemaRecord } from './record';
import type { SchemaService } from './schema';
import { Destroy, Editable, Legacy } from './symbols';

export function instantiateRecord(
  store: Store,
  identifier: StableRecordIdentifier,
  createArgs?: Record<string, unknown>
): SchemaRecord {
  const schema = store.schema as unknown as SchemaService;
  const isLegacy = schema.resource(identifier)?.legacy ?? false;
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
