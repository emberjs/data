import type Store from '@ember-data/store';
import type { StableRecordIdentifier } from "@ember-data/types/q/identifier";
import type { AttributeSchema, RelationshipSchema } from '@ember-data/types/q/record-data-schemas';

export const Destroy = Symbol('Destroy');
export const RecordStore = Symbol('Store');
export const Identifier = Symbol('Identifier');
export const Editable = Symbol('Editable');

export interface FieldSchema {
  type: string | null;
  name: string;
  kind: 'attribute' | 'resource' | 'collection' | 'derived' | 'object' | 'array';
  options?: Record<string, unknown>;
}

type FieldSpec = {
  // legacy support
  attributes: Record<string, AttributeSchema>;
  relationships: Record<string, RelationshipSchema>;
  // new support
  fields: Map<string, FieldSchema>;
}

export type Transform<T = unknown, PT = unknown> = {
  serialize(value: PT, options: Record<string, unknown> | null, record: SchemaRecord): T;
  hydrate(value: T, options: Record<string, unknown> | null, record: SchemaRecord): PT;
  defaultValue?(options: Record<string, unknown> | null, identifier: StableRecordIdentifier): T;
};

export class SchemaService {
  declare schemas: Map<string, FieldSpec>;
  declare transforms: Map<string, Transform>;

  constructor() {
    this.schemas = new Map();
    this.transforms = new Map();
  }

  registerTransform<T = unknown, PT = unknown>(type: string, transform: Transform<T, PT>): void {
    this.transforms.set(type, transform);
  }

  defineSchema(name: string, fields: FieldSchema[]): void {
    const fieldSpec: FieldSpec = {
      attributes: {},
      relationships: {},
      fields: new Map(),
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
      } else {
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

export class SchemaRecord {
  declare [RecordStore]: Store;
  declare [Identifier]: StableRecordIdentifier;
  declare [Editable]: boolean;

  constructor(store: Store, identifier: StableRecordIdentifier, editable: boolean) {
    this[RecordStore] = store;
    this[Identifier] = identifier;
    this[Editable] = editable;

    const schema = store.schema as unknown as SchemaService;
    const cache = store.cache;
    const fields = schema.fields(identifier);

    return new Proxy(this, {
      get(target, prop) {
        if (prop === Destroy) {
          return target[Destroy];
        }

        if (prop === 'id') {
          return identifier.id;
        }
        if (prop === '$type') {
          return identifier.type;
        }
        const field = fields.get(prop as string);
        if (!field) {
          throw new Error(`No field named ${String(prop)} on ${identifier.type}`);
        }

        if (field.kind === 'attribute') {
          const rawValue = cache.getAttr(identifier, prop as string);
          if (field.type === null) {
            return rawValue;
          }
          const transform = schema.transforms.get(field.type);
          if (!transform) {
            throw new Error(`No '${field.type}' transform defined for use by ${identifier.type}.${String(prop)}`);
          }
          return transform.hydrate(rawValue, field.options ?? null, target);
        }

        throw new Error(`Unknown field kind ${field.kind}`);
      },
      set(target, prop, value) {
        if (!target[Editable]) {
          throw new Error(`Cannot set ${String(prop)} on ${identifier.type} because the record is not editable`);
        }

        const field = fields.get(prop as string);
        if (!field) {
          throw new Error(`There is no field named ${String(prop)} on ${identifier.type}`);
        }

        if (field.kind === 'attribute') {
          if (field.type === null) {
            cache.setAttr(identifier, prop as string, value);
            return true;
          }
          const transform = schema.transforms.get(field.type);

          if (!transform) {
            throw new Error(`No '${field.type}' transform defined for use by ${identifier.type}.${String(prop)}`);
          }

          const rawValue = transform.serialize(value, field.options ?? null, target);
          cache.setAttr(identifier, prop as string, rawValue);
          return true;
        }

        throw new Error(`Unknown field kind ${field.kind}`);
      },
    });
  }

  [Destroy](): void {}
}

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
