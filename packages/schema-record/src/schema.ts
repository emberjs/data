import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { Value } from '@warp-drive/core-types/json/raw';
import type { AttributeSchema, RelationshipSchema } from '@warp-drive/core-types/schema';

import type { SchemaRecord } from './record';

export interface FieldSchema {
  type: string | null;
  name: string;
  kind: 'attribute' | 'resource' | 'collection' | 'derived' | 'object' | 'array';
  options?: Record<string, unknown>;
}

/**
 * The full schema for a resource
 *
 * @class FieldSpec
 * @internal
 */
type FieldSpec = {
  /**
   * legacy schema service separated attribute
   * from relationship lookup
   * @internal
   */
  attributes: Record<string, AttributeSchema>;
  /**
   * legacy schema service separated attribute
   * from relationship lookup
   * @internal
   */
  relationships: Record<string, RelationshipSchema>;
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
    this.derivations.set(type, derivation as Derivation<unknown, unknown>);
  }

  defineSchema(name: string, schema: { legacy?: boolean; fields: FieldSchema[] }): void {
    const { legacy, fields } = schema;
    const fieldSpec: FieldSpec = {
      attributes: {},
      relationships: {},
      fields: new Map(),
      legacy: legacy ?? false,
    };

    fields.forEach((field) => {
      fieldSpec.fields.set(field.name, field);

      if (field.kind === 'attribute') {
        fieldSpec.attributes[field.name] = field as AttributeSchema;
      } else if (field.kind === 'resource' || field.kind === 'collection') {
        const relSchema = Object.assign({}, field, {
          kind: field.kind === 'resource' ? 'belongsTo' : 'hasMany',
        }) as unknown as RelationshipSchema;
        fieldSpec.relationships[field.name] = relSchema;
      } else if (field.kind !== 'derived') {
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
