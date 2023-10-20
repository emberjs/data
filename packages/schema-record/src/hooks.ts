import type Store from '@ember-data/store';
import type { StableRecordIdentifier } from "@ember-data/store/-types/q/identifier";
import { Destroy, SchemaRecord } from './record';

export function instantiateRecord(store: Store, identifier: StableRecordIdentifier, createArgs?: Record<string, unknown>): SchemaRecord {
  if (createArgs) {
    const editable = new SchemaRecord(store, identifier, true);
    Object.assign(editable, createArgs);
    return editable;
  }

  return new SchemaRecord(store, identifier, false);
}

export function teardownRecord(record: SchemaRecord): void {
  record[Destroy]();
}
