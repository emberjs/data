import type Store from '@ember-data/store';
import type { StableRecordIdentifier } from "@ember-data/types/q/identifier";
import type { FieldSchema, SchemaService } from './schema';
import { Cache } from '@ember-data/types/q/cache';
import { tracked } from '@glimmer/tracking';
import { Link, Links, SingleResourceRelationship } from '@ember-data/types/q/ember-data-json-api';
import { StoreRequestInput } from '@ember-data/store/-private/cache-handler';
import { Future } from '@ember-data/request';
import { DEBUG } from '@ember-data/env';
import { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import { addToTransaction, entangleSignal } from '@ember-data/tracking/-private';

export const Destroy = Symbol('Destroy');
export const RecordStore = Symbol('Store');
export const Identifier = Symbol('Identifier');
export const Editable = Symbol('Editable');
export const Parent = Symbol('Parent');
export const Checkout = Symbol('Checkout');

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

// TODO probably this should just be a Document
// but its separate until we work out the lid situation
class ResourceRelationship<T extends SchemaRecord = SchemaRecord> {
  declare lid: string;
  declare [Parent]: SchemaRecord;
  declare [RecordStore]: Store;
  declare name: string;

  @tracked declare data: T | null;
  @tracked declare links: Links;
  @tracked declare meta: Record<string, unknown>;

  constructor(store: Store, cache: Cache, parent: SchemaRecord, identifier: StableRecordIdentifier, field: FieldSchema, name: string) {
    const rawValue = cache.getRelationship(identifier, name) as SingleResourceRelationship;

    // TODO setup true lids for relationship documents
    // @ts-expect-error we need to put lid on the relationship
    this.lid = rawValue.lid ?? rawValue.links?.self ?? `relationship:${identifier.lid}.${name}`;
    this.data = rawValue.data ? store.peekRecord<T>(rawValue.data) : null;
    this.name = name;

    if (DEBUG) {
      this.links = Object.freeze(Object.assign({}, rawValue.links));
      this.meta = Object.freeze(Object.assign({}, rawValue.meta));
    } else {
      this.links = rawValue.links ?? {};
      this.meta = rawValue.meta ?? {};
    }

    this[RecordStore] = store;
    this[Parent] = parent;
  }

  fetch(options?: StoreRequestInput): Future<T> {
    const url = options?.url ?? getHref(this.links.related) ?? getHref(this.links.self) ?? null;

    if (!url) {
      throw new Error(`Cannot ${options?.method ?? 'fetch'} ${this[Parent][Identifier].type}.${String(this.name)} because it has no related link`);
    }
    const request = Object.assign({
      url,
      method: 'GET',
    }, options);

    return this[RecordStore].request<T>(request);
  }
}

function getHref(link?: Link | null): string | null {
  if (!link) {
    return null;
  }
  if (typeof link === 'string') {
    return link;
  }
  return link.href;
}

function computeResource<T extends SchemaRecord>(store: Store, cache: Cache, parent: SchemaRecord, identifier: StableRecordIdentifier, field: FieldSchema, prop: string): ResourceRelationship<T> {
  if (field.kind !== 'resource') {
    throw new Error(`The schema for ${identifier.type}.${String(prop)} is not a resource relationship`);
  }

  return new ResourceRelationship<T>(store, cache, parent, identifier, field, prop);
}

export class SchemaRecord {
  declare [RecordStore]: Store;
  declare [Identifier]: StableRecordIdentifier;
  declare [Editable]: boolean;
  declare ___notifications: unknown;

  constructor(store: Store, identifier: StableRecordIdentifier, editable: boolean) {
    this[RecordStore] = store;
    this[Identifier] = identifier;
    this[Editable] = editable;

    const schema = store.schema as unknown as SchemaService;
    const cache = store.cache;
    const fields = schema.fields(identifier);

    const signals = new Map();
    this.___notifications = store.notifications.subscribe(identifier, (_: StableRecordIdentifier, type: NotificationType, key?: string) => {
      switch (type) {
        case 'attributes':
          if (key) {
            const signal = signals.get(key);
            if (signal) {
              addToTransaction(signal);
            }
          }
          break;
      }
    });

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === Destroy) {
          return target[Destroy];
        }

        // _, $, *
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
            entangleSignal(signals, this, field.name);
            return computeAttribute(schema, cache, target, identifier, field, prop as string);
          case 'resource':
            entangleSignal(signals, this, field.name);
            return computeResource(store, cache, target, identifier, field, prop as string);

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
  [Checkout](): Promise<SchemaRecord> {
    return Promise.resolve(this);
  }
}
