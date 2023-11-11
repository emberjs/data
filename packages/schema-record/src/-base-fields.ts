import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@warp-drive/core-types';

import { Identifier, type SchemaRecord } from './record';
import type { Derivation, FieldSchema, SchemaService } from './schema';

export const SchemaRecordFields: FieldSchema[] = [
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
}
