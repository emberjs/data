import type Store from '@ember-data/store';
import type { StableRecordIdentifier } from "@ember-data/types/q/identifier";
import type { FieldSchema, SchemaService } from './schema';
import { Cache } from '@ember-data/types/q/cache';

export const Destroy = Symbol('Destroy');
export const RecordStore = Symbol('Store');
export const Identifier = Symbol('Identifier');
export const Editable = Symbol('Editable');

function computeAttribute(schema: SchemaService, cache: Cache, record: SchemaRecord, identifier: StableRecordIdentifier, field: FieldSchema, prop: string): unknown {
  const rawValue = cache.getAttr(identifier, prop);
  if (field.type === null) {
    return rawValue;
  }
  const transform = schema.transforms.get(field.type);
  if (!transform) {
    throw new Error(`No '${field.type}' transform defined for use by ${identifier.type}.${String(prop)}`);
  }
  return transform.hydrate(rawValue, field.options ?? null, record);
}

function computeDerivation(schema: SchemaService, record: SchemaRecord, identifier: StableRecordIdentifier, field: FieldSchema, prop: string): unknown {
  if (field.type === null) {
    throw new Error(`The schema for ${identifier.type}.${String(prop)} is missing the type of the derivation`);
  }

  const derivation = schema.derivations.get(field.type);
  if (!derivation) {
    throw new Error(`No '${field.type}' derivation defined for use by ${identifier.type}.${String(prop)}`);
  }
  return derivation(record, field.options ?? null, prop);
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
      get(target, prop, receiver) {
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

        switch (field.kind) {
          case 'attribute':
            return computeAttribute(schema, cache, target, identifier, field, prop as string);
          case 'derived':
            return computeDerivation(schema, receiver, identifier, field, prop as string);
          default:
            throw new Error(`Field '${String(prop)}' on '${identifier.type}' has the unknown kind '${field.kind}'`);
        }

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
        } else if (field.kind === 'derived') {
          throw new Error(`Cannot set ${String(prop)} on ${identifier.type} because it is derived`);
        }

        throw new Error(`Unknown field kind ${field.kind}`);
      },
    });
  }

  [Destroy](): void {}
}
