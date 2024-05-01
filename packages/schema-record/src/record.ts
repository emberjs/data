import { assert } from '@ember/debug';

import type { Future } from '@ember-data/request';
import type Store from '@ember-data/store';
import type { StoreRequestInput } from '@ember-data/store/-private/cache-handler';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { FieldSchema } from '@ember-data/store/-types/q/schema-service';
import {
  addToTransaction,
  defineSignal,
  entangleSignal,
  getSignal,
  peekSignal,
  type Signal,
  Signals,
} from '@ember-data/tracking/-private';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { ResourceRelationship as SingleResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { ArrayValue, ObjectValue, Value } from '@warp-drive/core-types/json/raw';
import { STRUCTURED } from '@warp-drive/core-types/request';
import type { Link, Links } from '@warp-drive/core-types/spec/raw';
import { RecordStore } from '@warp-drive/core-types/symbols';

import { ARRAY_SIGNAL, ManagedArray } from './managed-array';
import { ManagedObject, OBJECT_SIGNAL } from './managed-object';
import type { SchemaService } from './schema';

export const Destroy = Symbol('Destroy');
export const Identifier = Symbol('Identifier');
export const Editable = Symbol('Editable');
export const Parent = Symbol('Parent');
export const Checkout = Symbol('Checkout');
export const Legacy = Symbol('Legacy');

const IgnoredGlobalFields = new Set(['then', STRUCTURED]);
const RecordSymbols = new Set([Destroy, RecordStore, Identifier, Editable, Parent, Checkout, Legacy, Signals]);

const ManagedArrayMap = new Map<SchemaRecord, Map<FieldSchema, ManagedArray>>();
const ManagedObjectMap = new Map<SchemaRecord, Map<FieldSchema, ManagedObject>>();

function computeLocal(record: typeof Proxy<SchemaRecord>, field: FieldSchema, prop: string): unknown {
  let signal = peekSignal(record, prop);

  if (!signal) {
    signal = getSignal(record, prop, false);
    signal.lastValue = field.options?.defaultValue ?? null;
  }

  return signal.lastValue;
}

function peekManagedArray(record: SchemaRecord, field: FieldSchema): ManagedArray | undefined {
  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  if (managedArrayMapForRecord) {
    return managedArrayMapForRecord.get(field);
  }
}

function peekManagedObject(record: SchemaRecord, field: FieldSchema): ManagedObject | undefined {
  const managedObjectMapForRecord = ManagedObjectMap.get(record);
  if (managedObjectMapForRecord) {
    return managedObjectMapForRecord.get(field);
  }
}

function computeField(
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: FieldSchema,
  prop: string
): unknown {
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

function computeArray(
  store: Store,
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: FieldSchema,
  prop: string
) {
  // the thing we hand out needs to know its owner and path in a private manner
  // its "address" is the parent identifier (identifier) + field name (field.name)
  //  in the nested object case field name here is the full dot path from root resource to this value
  // its "key" is the field on the parent record
  // its "owner" is the parent record

  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  let managedArray;
  if (managedArrayMapForRecord) {
    managedArray = managedArrayMapForRecord.get(field);
  }
  if (managedArray) {
    return managedArray;
  } else {
    const rawValue = cache.getAttr(identifier, prop) as unknown[];
    if (!rawValue) {
      return null;
    }
    managedArray = new ManagedArray(store, schema, cache, field, rawValue, identifier, prop, record);
    if (!managedArrayMapForRecord) {
      ManagedArrayMap.set(record, new Map([[field, managedArray]]));
    } else {
      managedArrayMapForRecord.set(field, managedArray);
    }
  }
  return managedArray;
}

function computeObject(
  store: Store,
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: FieldSchema,
  prop: string
) {
  const managedObjectMapForRecord = ManagedObjectMap.get(record);
  let managedObject;
  if (managedObjectMapForRecord) {
    managedObject = managedObjectMapForRecord.get(field);
  }
  if (managedObject) {
    return managedObject;
  } else {
    let rawValue = cache.getAttr(identifier, prop) as object;
    if (!rawValue) {
      return null;
    }
    if (field.kind === 'object') {
      if (field.type !== null) {
        const transform = schema.transforms.get(field.type);
        if (!transform) {
          throw new Error(`No '${field.type}' transform defined for use by ${identifier.type}.${String(prop)}`);
        }
        rawValue = transform.hydrate(rawValue as ObjectValue, field.options ?? null, record) as object;
      }
    }
    managedObject = new ManagedObject(store, schema, cache, field, rawValue, identifier, prop, record);
    if (!managedObjectMapForRecord) {
      ManagedObjectMap.set(record, new Map([[field, managedObject]]));
    } else {
      managedObjectMapForRecord.set(field, managedObject);
    }
  }
  return managedObject;
}

function computeAttribute(cache: Cache, identifier: StableRecordIdentifier, prop: string): unknown {
  return cache.getAttr(identifier, prop);
}

function computeDerivation(
  schema: SchemaService,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: FieldSchema,
  prop: string
): unknown {
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

  declare data: T | null;
  declare links: Links;
  declare meta: Record<string, unknown>;

  constructor(
    store: Store,
    cache: Cache,
    parent: SchemaRecord,
    identifier: StableRecordIdentifier,
    field: FieldSchema,
    name: string
  ) {
    const rawValue = cache.getRelationship(identifier, name) as SingleResourceRelationship;

    // TODO setup true lids for relationship documents
    // @ts-expect-error we need to give relationship documents a lid
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

  fetch(options?: StoreRequestInput<T, T>): Future<T> {
    const url = options?.url ?? getHref(this.links.related) ?? getHref(this.links.self) ?? null;

    if (!url) {
      throw new Error(
        `Cannot ${options?.method ?? 'fetch'} ${this[Parent][Identifier].type}.${String(
          this.name
        )} because it has no related link`
      );
    }
    const request = Object.assign(
      {
        url,
        method: 'GET',
      },
      options
    );

    return this[RecordStore].request<T>(request);
  }
}

defineSignal(ResourceRelationship.prototype, 'data');
defineSignal(ResourceRelationship.prototype, 'links');
defineSignal(ResourceRelationship.prototype, 'meta');

function getHref(link?: Link | null): string | null {
  if (!link) {
    return null;
  }
  if (typeof link === 'string') {
    return link;
  }
  return link.href;
}

function computeResource<T extends SchemaRecord>(
  store: Store,
  cache: Cache,
  parent: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: FieldSchema,
  prop: string
): ResourceRelationship<T> {
  if (field.kind !== 'resource') {
    throw new Error(`The schema for ${identifier.type}.${String(prop)} is not a resource relationship`);
  }

  return new ResourceRelationship<T>(store, cache, parent, identifier, field, prop);
}

export class SchemaRecord {
  declare [RecordStore]: Store;
  declare [Identifier]: StableRecordIdentifier;
  declare [Editable]: boolean;
  declare [Legacy]: boolean;
  declare [Signals]: Map<string, Signal>;
  declare ___notifications: object;

  constructor(store: Store, identifier: StableRecordIdentifier, Mode: { [Editable]: boolean; [Legacy]: boolean }) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this[RecordStore] = store;
    this[Identifier] = identifier;
    const IS_EDITABLE = (this[Editable] = Mode[Editable] ?? false);
    this[Legacy] = Mode[Legacy] ?? false;

    const schema = store.schema as unknown as SchemaService;
    const cache = store.cache;
    const fields = schema.fields(identifier);

    const signals: Map<string, Signal> = new Map();
    this[Signals] = signals;
    this.___notifications = store.notifications.subscribe(
      identifier,
      (_: StableRecordIdentifier, type: NotificationType, key?: string) => {
        switch (type) {
          case 'attributes':
            if (key) {
              const signal = signals.get(key);
              if (signal) {
                addToTransaction(signal);
              }
              const field = fields.get(key);
              if (field?.kind === 'array') {
                const peeked = peekManagedArray(self, field);
                if (peeked) {
                  const arrSignal = peeked[ARRAY_SIGNAL];
                  arrSignal.shouldReset = true;
                  addToTransaction(arrSignal);
                }
              }
            }
            break;
        }
      }
    );

    return new Proxy(this, {
      get(target: SchemaRecord, prop: string | number | symbol, receiver: typeof Proxy<SchemaRecord>) {
        if (RecordSymbols.has(prop as symbol)) {
          return target[prop as keyof SchemaRecord];
        }

        if (prop === '___notifications') {
          return target.___notifications;
        }

        // SchemaRecord reserves use of keys that begin with these characters
        // for its own usage.
        // _, @, $, *

        const field = fields.get(prop as string);
        if (!field) {
          if (IgnoredGlobalFields.has(prop as string | symbol)) {
            return undefined;
          }
          throw new Error(`No field named ${String(prop)} on ${identifier.type}`);
        }

        switch (field.kind) {
          case '@id':
            entangleSignal(signals, receiver, '@identity');
            return identifier.id;
          case '@local': {
            const lastValue = computeLocal(receiver, field, prop as string);
            entangleSignal(signals, receiver, prop as string);
            return lastValue;
          }
          case 'field':
            assert(
              `SchemaRecord.${field.name} is not available in legacy mode because it has type '${field.kind}'`,
              !target[Legacy]
            );
            entangleSignal(signals, receiver, field.name);
            return computeField(schema, cache, target, identifier, field, prop as string);
          case 'attribute':
            entangleSignal(signals, receiver, field.name);
            return computeAttribute(cache, identifier, prop as string);
          case 'resource':
            assert(
              `SchemaRecord.${field.name} is not available in legacy mode because it has type '${field.kind}'`,
              !target[Legacy]
            );
            entangleSignal(signals, receiver, field.name);
            return computeResource(store, cache, target, identifier, field, prop as string);
          case 'derived':
            return computeDerivation(schema, receiver as unknown as SchemaRecord, identifier, field, prop as string);
          case 'schema-array':
            throw new Error(`Not Implemented`);
          case 'array':
            assert(
              `SchemaRecord.${field.name} is not available in legacy mode because it has type '${field.kind}'`,
              !target[Legacy]
            );
            entangleSignal(signals, receiver, field.name);
            return computeArray(store, schema, cache, target, identifier, field, prop as string);
          case 'schema-object':
            // validate any access off of schema, no transform to run
            // use raw cache value as the object to manage
            throw new Error(`Not Implemented`);
          case 'object':
            assert(
              `SchemaRecord.${field.name} is not available in legacy mode because it has type '${field.kind}'`,
              !target[Legacy]
            );
            entangleSignal(signals, receiver, field.name);
            // run transform, then use that value as the object to manage
            return computeObject(store, schema, cache, target, identifier, field, prop as string);
          default:
            throw new Error(`Field '${String(prop)}' on '${identifier.type}' has the unknown kind '${field.kind}'`);
        }
      },
      set(target: SchemaRecord, prop: string | number | symbol, value: unknown, receiver: typeof Proxy<SchemaRecord>) {
        if (!IS_EDITABLE) {
          throw new Error(`Cannot set ${String(prop)} on ${identifier.type} because the record is not editable`);
        }

        const field = fields.get(prop as string);
        if (!field) {
          throw new Error(`There is no field named ${String(prop)} on ${identifier.type}`);
        }

        switch (field.kind) {
          case '@local': {
            const signal = getSignal(receiver, prop as string, true);
            if (signal.lastValue !== value) {
              signal.lastValue = value;
              addToTransaction(signal);
            }
            return true;
          }
          case 'field': {
            if (field.type === null) {
              cache.setAttr(identifier, prop as string, value as Value);
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
          case 'attribute': {
            cache.setAttr(identifier, prop as string, value as Value);
            return true;
          }
          case 'array': {
            if (field.type === null) {
              cache.setAttr(identifier, prop as string, (value as ArrayValue)?.slice());
              const peeked = peekManagedArray(self, field);
              if (peeked) {
                const arrSignal = peeked[ARRAY_SIGNAL];
                arrSignal.shouldReset = true;
              }
              if (!Array.isArray(value)) {
                ManagedArrayMap.delete(target);
              }
              return true;
            }

            const transform = schema.transforms.get(field.type);
            if (!transform) {
              throw new Error(`No '${field.type}' transform defined for use by ${identifier.type}.${String(prop)}`);
            }

            const rawValue = (value as ArrayValue).map((item) =>
              transform.serialize(item, field.options ?? null, target)
            );
            cache.setAttr(identifier, prop as string, rawValue);
            const peeked = peekManagedArray(self, field);
            if (peeked) {
              const arrSignal = peeked[ARRAY_SIGNAL];
              arrSignal.shouldReset = true;
            }
            return true;
          }
          case 'object': {
            if (field.type === null) {
              let newValue = value;
              if (value !== null) {
                newValue = { ...(value as ObjectValue) };
              } else {
                ManagedObjectMap.delete(target);
              }

              cache.setAttr(identifier, prop as string, newValue as Value);

              const peeked = peekManagedObject(self, field);
              if (peeked) {
                const objSignal = peeked[OBJECT_SIGNAL];
                objSignal.shouldReset = true;
              }
              return true;
            }
            const transform = schema.transforms.get(field.type);
            if (!transform) {
              throw new Error(`No '${field.type}' transform defined for use by ${identifier.type}.${String(prop)}`);
            }
            const rawValue = transform.serialize({ ...(value as ObjectValue) }, field.options ?? null, target);

            cache.setAttr(identifier, prop as string, rawValue);
            const peeked = peekManagedObject(self, field);
            if (peeked) {
              const objSignal = peeked[OBJECT_SIGNAL];
              objSignal.shouldReset = true;
            }
            return true;
          }
          case 'derived': {
            throw new Error(`Cannot set ${String(prop)} on ${identifier.type} because it is derived`);
          }
          default:
            throw new Error(`Unknown field kind ${field.kind}`);
        }
      },
    });
  }

  [Destroy](): void {
    if (this[Legacy]) {
      // @ts-expect-error
      this.isDestroying = true;
      // @ts-expect-error
      this.isDestroyed = true;
    }
    this[RecordStore].notifications.unsubscribe(this.___notifications);
  }
  [Checkout](): Promise<SchemaRecord> {
    return Promise.resolve(this);
  }
}
