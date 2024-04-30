import { assert } from '@ember/debug';

import { recordIdentifierFor } from '@ember-data/store';
import { createCache, getValue } from '@ember-data/tracking';
import { type Signal, Signals } from '@ember-data/tracking/-private';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Value } from '@warp-drive/core-types/json/raw';
import type { OpaqueRecordInstance } from '@warp-drive/core-types/record';
import type { FieldSchema, LegacyAttributeField, LegacyRelationshipSchema } from '@warp-drive/core-types/schema/fields';

import { Identifier, type SchemaRecord } from './record';

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
  },
  {
    type: '@identity',
    name: '$type',
    kind: 'derived',
    options: { key: 'type' },
  },
];

const _constructor: Derivation<OpaqueRecordInstance, unknown> = function (record) {
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
export function fromIdentity(record: SchemaRecord, options: { key: 'lid' } | { key: 'type' }, key: string): string;
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

/**
 * The full schema for a resource
 *
 * @class FieldSpec
 * @internal
 */
type FieldSpec = {
  '@id': FieldSchema | null;
  /**
   * legacy schema service separated attribute
   * from relationship lookup
   * @internal
   */
  attributes: Record<string, LegacyAttributeField>;
  /**
   * legacy schema service separated attribute
   * from relationship lookup
   * @internal
   */
  relationships: Record<string, LegacyRelationshipSchema>;
  /**
   * new schema service is fields based
   * @internal
   */
  fields: Map<string, FieldSchema>;
  /**
   * legacy model mode support
   * @internal
   */
  legacy?: boolean;
};

export type Transform<T extends Value = string, PT = unknown> = {
  serialize(value: PT, options: Record<string, unknown> | null, record: SchemaRecord): T;
  hydrate(value: T | undefined, options: Record<string, unknown> | null, record: SchemaRecord): PT;
  defaultValue?(options: Record<string, unknown> | null, identifier: StableRecordIdentifier): T;
};

export type Derivation<R, T> = (record: R, options: Record<string, unknown> | null, prop: string) => T;

/**
 * Wraps a derivation in a new function with Derivation signature but that looks
 * up the value in the cache before recomputing.
 *
 * @param record
 * @param options
 * @param prop
 */
function makeCachedDerivation<R, T>(derivation: Derivation<R, T>): Derivation<R, T> {
  return (record: R, options: Record<string, unknown> | null, prop: string): T => {
    const signals = (record as { [Signals]: Map<string, Signal> })[Signals];
    let signal = signals.get(prop);
    if (!signal) {
      signal = createCache(() => {
        return derivation(record, options, prop);
      }) as unknown as Signal; // a total lie, for convenience of reusing the storage
      signals.set(prop, signal);
    }

    return getValue(signal as unknown as ReturnType<typeof createCache>) as T;
  };
}

export class SchemaService {
  declare schemas: Map<string, FieldSpec>;
  declare transforms: Map<string, Transform<Value>>;
  declare derivations: Map<string, Derivation<unknown, unknown>>;

  constructor() {
    this.schemas = new Map();
    this.transforms = new Map();
    this.derivations = new Map();
  }

  registerTransform<T extends Value = string, PT = unknown>(type: string, transform: Transform<T, PT>): void {
    this.transforms.set(type, transform);
  }

  registerDerivation<R, T>(type: string, derivation: Derivation<R, T>): void {
    this.derivations.set(type, makeCachedDerivation(derivation) as Derivation<unknown, unknown>);
  }

  defineSchema(name: string, schema: { legacy?: boolean; fields: FieldSchema[] }): void {
    const { legacy, fields } = schema;
    const fieldSpec: FieldSpec = {
      '@id': null,
      attributes: {},
      relationships: {},
      fields: new Map(),
      legacy: legacy ?? false,
    };

    assert(
      `Only one field can be defined as @id, ${name} has more than one: ${fields
        .filter((f) => f.kind === '@id')
        .map((f) => f.name)
        .join(' ')}`,
      fields.filter((f) => f.kind === '@id').length <= 1
    );
    fields.forEach((field) => {
      fieldSpec.fields.set(field.name, field);

      if (field.kind === '@id') {
        fieldSpec['@id'] = field;
      } else if (field.kind === 'field') {
        // We don't add 'field' fields to attributes in order to allow simpler
        // migration between transformation behaviors
        // serializers and things which call attributesDefinitionFor will
        // only run on the things that are legacy attribute mode, while all fields
        // will have their serialize/hydrate logic managed by the cache and record
        //
        // This means that if you want to normalize fields pre-cache insertion
        // Or pre-api call you wil need to use the newer `schema.fields()` API
        // To opt-in to that ability (which note, is now an anti-pattern)
        //
        // const attr = Object.assign({}, field, { kind: 'attribute' }) as AttributeSchema;
        // fieldSpec.attributes[attr.name] = attr;
      } else if (field.kind === 'attribute') {
        fieldSpec.attributes[field.name] = field as LegacyAttributeField;
      } else if (field.kind === 'resource' || field.kind === 'collection') {
        const relSchema = Object.assign({}, field, {
          kind: field.kind === 'resource' ? 'belongsTo' : 'hasMany',
        }) as unknown as LegacyRelationshipSchema;
        fieldSpec.relationships[field.name] = relSchema;
      } else if (
        field.kind !== 'derived' &&
        field.kind !== '@local' &&
        field.kind !== 'array' &&
        field.kind !== 'object'
      ) {
        throw new Error(`Unknown field kind ${field.kind}`);
      }
    });

    this.schemas.set(name, fieldSpec);
  }

  fields({ type }: { type: string }): FieldSpec['fields'] {
    const schema = this.schemas.get(type);

    if (!schema) {
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.fields;
  }

  attributesDefinitionFor({ type }: { type: string }): FieldSpec['attributes'] {
    const schema = this.schemas.get(type);

    if (!schema) {
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.attributes;
  }

  relationshipsDefinitionFor({ type }: { type: string }): FieldSpec['relationships'] {
    const schema = this.schemas.get(type);

    if (!schema) {
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.relationships;
  }

  doesTypeExist(type: string): boolean {
    return this.schemas.has(type);
  }
}
