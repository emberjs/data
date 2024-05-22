import { recordIdentifierFor } from '@ember-data/store';
import type { SchemaService as SchemaServiceInterface } from '@ember-data/store/types';
import { createCache, getValue } from '@ember-data/tracking';
import type { Signal } from '@ember-data/tracking/-private';
import { Signals } from '@ember-data/tracking/-private';
import { ENABLE_LEGACY_SCHEMA_SERVICE } from '@warp-drive/build-config/deprecations';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';
import type { ObjectValue, Value } from '@warp-drive/core-types/json/raw';
import type { Derivation, HashFn } from '@warp-drive/core-types/schema/concepts';
import type {
  FieldSchema,
  LegacyAttributeField,
  LegacyRelationshipSchema,
  ResourceSchema,
} from '@warp-drive/core-types/schema/fields';
import { Type } from '@warp-drive/core-types/symbols';
import type { WithPartial } from '@warp-drive/core-types/utils';

import type { SchemaRecord } from './record';
import { Identifier } from './symbols';

const Support = getOrSetGlobal('Support', new WeakMap<WeakKey, Record<string, unknown>>());

export const SchemaRecordFields: FieldSchema[] = [
  {
    type: '@constructor',
    name: 'constructor',
    kind: 'derived',
  },
  {
    type: '@identity',
    name: '$type',
    kind: 'derived',
    options: { key: 'type' },
  },
];

function _constructor(record: SchemaRecord) {
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
}
_constructor[Type] = '@constructor';

export function withDefaults(schema: WithPartial<ResourceSchema, 'identity'>): ResourceSchema {
  schema.identity = schema.identity || { name: 'id', kind: '@id' };
  schema.fields.push(...SchemaRecordFields);
  return schema as ResourceSchema;
}

export function fromIdentity(record: SchemaRecord, options: { key: 'lid' } | { key: 'type' }, key: string): string;
export function fromIdentity(record: SchemaRecord, options: { key: 'id' }, key: string): string | null;
export function fromIdentity(record: SchemaRecord, options: { key: '^' }, key: string): StableRecordIdentifier;
export function fromIdentity(record: SchemaRecord, options: null, key: string): asserts options;
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
fromIdentity[Type] = '@identity';

export function registerDerivations(schema: SchemaServiceInterface) {
  schema.registerDerivation(fromIdentity);
  schema.registerDerivation(_constructor);
}

type InternalSchema = {
  original: ResourceSchema;
  traits: Set<string>;
  fields: Map<string, FieldSchema>;
  attributes: Record<string, LegacyAttributeField>;
  relationships: Record<string, LegacyRelationshipSchema>;
};

export type Transformation<T extends Value = Value, PT = unknown> = {
  serialize(value: PT, options: Record<string, unknown> | null, record: SchemaRecord): T;
  hydrate(value: T | undefined, options: Record<string, unknown> | null, record: SchemaRecord): PT;
  defaultValue?(options: Record<string, unknown> | null, identifier: StableRecordIdentifier): T;
  [Type]: string;
};

/**
 * Wraps a derivation in a new function with Derivation signature but that looks
 * up the value in the cache before recomputing.
 *
 * @param record
 * @param options
 * @param prop
 */
function makeCachedDerivation<R, T, FM extends ObjectValue | null>(
  derivation: Derivation<R, T, FM>
): Derivation<R, T, FM> {
  const memoizedDerivation = (record: R, options: FM, prop: string): T => {
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
  memoizedDerivation[Type] = derivation[Type];
  return memoizedDerivation;
}

export interface SchemaService {
  doesTypeExist(type: string): boolean;
  attributesDefinitionFor(identifier: { type: string }): InternalSchema['attributes'];
  relationshipsDefinitionFor(identifier: { type: string }): InternalSchema['relationships'];
}
export class SchemaService implements SchemaServiceInterface {
  declare _schemas: Map<string, InternalSchema>;
  declare _transforms: Map<string, Transformation>;
  declare _hashFns: Map<string, HashFn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare _derivations: Map<string, Derivation<any, any, any>>;
  declare _traits: Set<string>;

  constructor() {
    this._schemas = new Map();
    this._transforms = new Map();
    this._hashFns = new Map();
    this._derivations = new Map();
  }
  hasTrait(type: string): boolean {
    return this._traits.has(type);
  }
  resourceHasTrait(resource: StableRecordIdentifier | { type: string }, trait: string): boolean {
    return this._schemas.get(resource.type)!.traits.has(trait);
  }
  transformation(name: string): Transformation {
    assert(`No transformation registered with name '${name}'`, this._transforms.has(name));
    return this._transforms.get(name)!;
  }
  derivation(name: string): Derivation {
    assert(`No derivation registered with name '${name}'`, this._derivations.has(name));
    return this._derivations.get(name)!;
  }
  resource(resource: StableRecordIdentifier | { type: string }): ResourceSchema {
    assert(`No resource registered with name '${resource.type}'`, this._schemas.has(resource.type));
    return this._schemas.get(resource.type)!.original;
  }
  hashFn(name: string): HashFn {
    assert(`No hash function registered with name '${name}'`, this._hashFns.has(name));
    return this._hashFns.get(name)!;
  }
  registerResources(schemas: ResourceSchema[]): void {
    schemas.forEach((schema) => {
      this.registerResource(schema);
    });
  }
  registerResource(schema: ResourceSchema): void {
    const fields = new Map<string, FieldSchema>();
    const relationships: Record<string, LegacyRelationshipSchema> = {};
    const attributes: Record<string, LegacyAttributeField> = {};

    schema.fields.forEach((field) => {
      assert(
        `${field.kind} is not valid inside a ResourceSchema's fields.`,
        // @ts-expect-error we are checking for mistakes at runtime
        field.kind !== '@id' && field.kind !== '@hash'
      );
      fields.set(field.name, field);
      if (field.kind === 'attribute') {
        attributes[field.name] = field;
      } else if (field.kind === 'belongsTo' || field.kind === 'hasMany') {
        relationships[field.name] = field;
      }
    });

    const traits = new Set<string>(schema.traits);
    traits.forEach((trait) => {
      this._traits.add(trait);
    });

    const internalSchema: InternalSchema = { original: schema, fields, relationships, attributes, traits };
    this._schemas.set(schema.type, internalSchema);
  }

  registerTransformation<T extends Value = string, PT = unknown>(transformation: Transformation<T, PT>): void {
    this._transforms.set(transformation[Type], transformation as Transformation);
  }

  registerDerivation<R, T, FM extends ObjectValue | null>(derivation: Derivation<R, T, FM>): void {
    this._derivations.set(derivation[Type], makeCachedDerivation(derivation));
  }

  registerHashFn<T extends object>(hashFn: HashFn<T>): void {
    this._hashFns.set(hashFn[Type], hashFn as HashFn);
  }

  fields({ type }: { type: string }): InternalSchema['fields'] {
    const schema = this._schemas.get(type);

    if (!schema) {
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.fields;
  }

  hasResource(resource: { type: string }): boolean {
    return this._schemas.has(resource.type);
  }
}

if (ENABLE_LEGACY_SCHEMA_SERVICE) {
  SchemaService.prototype.attributesDefinitionFor = function ({
    type,
  }: {
    type: string;
  }): InternalSchema['attributes'] {
    const schema = this._schemas.get(type);

    if (!schema) {
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.attributes;
  };

  SchemaService.prototype.relationshipsDefinitionFor = function ({
    type,
  }: {
    type: string;
  }): InternalSchema['relationships'] {
    const schema = this._schemas.get(type);

    if (!schema) {
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.relationships;
  };

  SchemaService.prototype.doesTypeExist = function (type: string): boolean {
    return this._schemas.has(type);
  };
}
