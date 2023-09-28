// import type Store from '@ember-data/store';
type Store = { schema: SchemaService, cache: Cache };
import type { StableRecordIdentifier } from "@ember-data/types/q/identifier";
import type { Cache } from "@ember-data/types/cache/cache";

export const Destroy = Symbol('Destroy');
export const RecordStore = Symbol('Store');
export const Identifier = Symbol('Identifier');

export interface FieldSchema {
  type: string;
  name: string;
  kind: 'attribute' | 'resource' | 'collection' | 'derived' | 'object' | 'array';
  options?: Record<string, unknown>;
}

type FieldSpec = {
  // legacy support
  attributes: Record<string, FieldSchema>;
  relationships: Record<string, FieldSchema>;
  // new support
  fields: Map<string, FieldSchema>;
}

export class SchemaService {
  declare schemas: Map<string, FieldSpec>;

  constructor() {
    this.schemas = new Map();
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
        fieldSpec.attributes[field.name] = field;
      } else if (field.kind === 'resource' || field.kind === 'collection') {
        fieldSpec.relationships[field.name] = Object.assign({}, field, {
          kind: field.kind === 'resource' ? 'belongsTo' : 'hasMany',
        });
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

export default class SchemaRecord {
  declare [RecordStore]: Store;
  declare [Identifier]: StableRecordIdentifier;

  constructor(store: Store, identifier: StableRecordIdentifier) {
    this[RecordStore] = store;
    this[Identifier] = identifier;

    const schema = store.schema;
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
          return cache.getAttr(identifier, prop as string);
        }

        throw new Error(`Unknown field kind ${field.kind}`);
      },
    });
  }

  [Destroy](): void {}
}

export function instantiateRecord(store: Store, identifier: StableRecordIdentifier): SchemaRecord {
  return new SchemaRecord(store, identifier);
}

export function teardownRecord(record: SchemaRecord): void {
  record[Destroy]();
}
