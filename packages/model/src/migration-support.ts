import { assert } from '@ember/debug';

import { recordIdentifierFor } from '@ember-data/store';
import { RecordStore } from '@warp-drive/core-types/symbols';

import RecordState, { MinimalLegacyRecord } from './-private/record-state';

interface FieldSchema {
  type: string | null;
  name: string;
  kind: 'attribute' | 'resource' | 'collection' | 'derived' | 'object' | 'array' | '@id';
  options?: Record<string, unknown>;
}

type Derivation<R, T> = (record: R, options: Record<string, unknown> | null, prop: string) => T;
type SchemaService = {
  registerDerivation(name: string, derivation: Derivation<unknown, unknown>): void;
};

const LegacyFields = ['constructor', 'currentState', 'unloadRecord'];

function unloadRecord(this: MinimalLegacyRecord) {
  if (this.currentState.isNew && (this.isDestroyed || this.isDestroying)) {
    return;
  }
  this[RecordStore].unloadRecord(this);
}

function legacySupport(record: MinimalLegacyRecord, options: Record<string, unknown> | null, prop: string): unknown {
  switch (prop) {
    case 'constructor':
      return {
        modelName: recordIdentifierFor(record).type,
      };
    case 'currentState':
      return (record.___recordState = record.___recordState || new RecordState(record));
    case 'unloadRecord':
      return unloadRecord;
    default:
      assert(`${prop} is not a supported legacy field`, false);
  }
}

export function withFields(fields: FieldSchema[]) {
  LegacyFields.forEach((field) => {
    fields.push({
      type: '@legacy',
      name: field,
      kind: 'derived',
    });
  });
  fields.push({
    name: 'id',
    kind: '@id',
    type: null,
  });
  return fields;
}

export function registerDerivations(schema: SchemaService) {
  schema.registerDerivation('@legacy', legacySupport as Derivation<unknown, unknown>);
}
