import { assert } from '@ember/debug';

import { recordIdentifierFor } from '@ember-data/store';
import { RecordInstance } from '@ember-data/store/-types/q/record-instance';
import type { FieldSchema } from '@ember-data/store/-types/q/schema-service';
import type { StableRecordIdentifier } from '@warp-drive/core-types';

import { Identifier, type SchemaRecord } from './record';
import type { Derivation, SchemaService } from './schema';

const Support = new WeakMap<WeakKey, Record<string, unknown>>();

export const SchemaRecordFields: FieldSchema[] = [
  {
    type: '@constructor',
    name: 'constructor',
    kind: 'derived',
  },
  {
    name: 'id',
    kind: '@id',
    type: null,
  },
  {
    type: '@identity',
    name: '$type',
    kind: 'derived',
    options: { key: 'type' },
  },
];

const _constructor: Derivation<RecordInstance, unknown> = function (record) {
  let state = Support.get(record as WeakKey);
  if (!state) {
    state = {};
    Support.set(record as WeakKey, state);
  }

  return (state._constructor = state._constructor || {
    name: `SchemaRecord<${recordIdentifierFor(record).type}>`,
    get modelName() {
      throw new Error('Cannot access record.constructor.modelName on non-Legacy Schema Records.');
    },
  });
};

export function withFields(fields: FieldSchema[]) {
  fields.push(...SchemaRecordFields);
  return fields;
}

export function fromIdentity(record: SchemaRecord, options: null, key: string): asserts options;
export function fromIdentity(record: SchemaRecord, options: { key: 'lid' }, key: string): string;
export function fromIdentity(record: SchemaRecord, options: { key: 'type' }, key: string): string;
export function fromIdentity(record: SchemaRecord, options: { key: 'id' }, key: string): string | null;
export function fromIdentity(record: SchemaRecord, options: { key: '^' }, key: string): StableRecordIdentifier;
export function fromIdentity(
  record: SchemaRecord,
  options: { key: 'id' | 'lid' | 'type' | '^' } | null,
  key: string
): StableRecordIdentifier | string | null {
  const identifier = record[Identifier];
  assert(`Cannot compute @identity for a record without an identifier`, identifier);
  assert(
    `Expected to receive a key to compute @identity, but got ${String(options)}`,
    options?.key && ['lid', 'id', 'type', '^'].includes(options.key)
  );

  return options.key === '^' ? identifier : identifier[options.key];
}

export function registerDerivations(schema: SchemaService) {
  schema.registerDerivation(
    '@identity',
    fromIdentity as Derivation<SchemaRecord, StableRecordIdentifier | string | null>
  );
  schema.registerDerivation('@constructor', _constructor);
}
