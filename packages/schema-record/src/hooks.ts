import type Store from '@ember-data/store';
import type { StableRecordIdentifier } from '@warp-drive/core-types';

import { Destroy, Editable, Legacy, SchemaRecord } from './record';
import type { SchemaService } from './schema';

export function instantiateRecord(
  store: Store,
  identifier: StableRecordIdentifier,
  createArgs?: Record<string, unknown>
): SchemaRecord {
  const schema = store.schema as unknown as SchemaService;
  const isLegacy = schema.schemas.get(identifier.type)?.legacy ?? false;
  const isEditable = isLegacy || Boolean(createArgs);
  const record = new SchemaRecord(store, identifier, {
    [Editable]: isEditable,
    [Legacy]: isLegacy,
  });

  if (createArgs) {
    Object.assign(record, createArgs);
  }

  return record;
}

export function teardownRecord(record: SchemaRecord): void {
  record[Destroy]();
}
