import { assert } from '@ember/debug';

import { recordIdentifierFor } from '@ember-data/store';
import { RecordStore } from '@warp-drive/core-types/symbols';

import { Errors } from './-private';
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

const LegacyFields = ['constructor', 'currentState', 'unloadRecord', 'errors'];

function unloadRecord(this: MinimalLegacyRecord) {
  if (this.currentState.isNew && (this.isDestroyed || this.isDestroying)) {
    return;
  }
  this[RecordStore].unloadRecord(this);
}

const LegacySupport = new WeakMap<MinimalLegacyRecord, Record<string, unknown>>();

function legacySupport(record: MinimalLegacyRecord, options: Record<string, unknown> | null, prop: string): unknown {
  let state = LegacySupport.get(record);
  if (!state) {
    state = {};
    LegacySupport.set(record, state);
  }

  switch (prop) {
    case 'constructor':
      return (state._constructor = state._constructor || {
        modelName: recordIdentifierFor(record).type,
      });
    case 'currentState':
      return (state.recordState = state.recordState || new RecordState(record));
    case 'unloadRecord':
      return unloadRecord;
    case 'errors':
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return (state.errors = state.errors || Errors.create({ __record: record }));
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
