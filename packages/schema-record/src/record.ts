import type { Future } from '@ember-data/request';
import type Store from '@ember-data/store';
import type { NotificationType, StoreRequestInput } from '@ember-data/store';
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
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';
import type { Cache } from '@warp-drive/core-types/cache';
import type { ResourceRelationship as SingleResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { ArrayValue, ObjectValue, Value } from '@warp-drive/core-types/json/raw';
import { STRUCTURED } from '@warp-drive/core-types/request';
import type {
  ArrayField,
  DerivedField,
  FieldSchema,
  GenericField,
  LocalField,
  ObjectField,
  SchemaArrayField,
} from '@warp-drive/core-types/schema/fields';
import type { Link, Links } from '@warp-drive/core-types/spec/json-api-raw';
import { RecordStore } from '@warp-drive/core-types/symbols';

import { ManagedArray } from './managed-array';
import { ManagedObject } from './managed-object';
import type { SchemaService } from './schema';
import {
  ARRAY_SIGNAL,
  Checkout,
  Destroy,
  Editable,
  EmbeddedPath,
  EmbeddedType,
  Identifier,
  Legacy,
  OBJECT_SIGNAL,
  Parent,
} from './symbols';

export { Editable, Legacy } from './symbols';
const IgnoredGlobalFields = new Set<string>(['length', 'nodeType', 'then', 'setInterval', STRUCTURED]);
const symbolList = [
  Destroy,
  RecordStore,
  Identifier,
  Editable,
  Parent,
  Checkout,
  Legacy,
  Signals,
  EmbeddedPath,
  EmbeddedType,
];
const RecordSymbols = new Set(symbolList);

type RecordSymbol = (typeof symbolList)[number];

const ManagedArrayMap = getOrSetGlobal('ManagedArrayMap', new Map<SchemaRecord, Map<FieldSchema, ManagedArray>>());
const ManagedObjectMap = getOrSetGlobal('ManagedObjectMap', new Map<SchemaRecord, Map<FieldSchema, ManagedObject>>());

function computeLocal(record: typeof Proxy<SchemaRecord>, field: LocalField, prop: string): unknown {
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
  field: GenericField,
  prop: string | string[]
): unknown {
  const rawValue = cache.getAttr(identifier, prop);
  if (!field.type) {
    return rawValue;
  }
  const transform = schema.transformation(field);
  return transform.hydrate(rawValue, field.options ?? null, record);
}

function computeArray(
  store: Store,
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: ArrayField | SchemaArrayField,
  path: string[],
  isSchemaArray = false
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
    const rawValue = cache.getAttr(identifier, path) as unknown[];
    if (!rawValue) {
      return null;
    }
    managedArray = new ManagedArray(store, schema, cache, field, rawValue, identifier, path, record, isSchemaArray);
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
  field: ObjectField,
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
      if (field.type) {
        const transform = schema.transformation(field);
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
  field: DerivedField,
  prop: string
): unknown {
  return schema.derivation(field)(record, field.options ?? null, prop);
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

function isPathMatch(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
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
  declare [Parent]: StableRecordIdentifier;
  declare [EmbeddedType]: string | null;
  declare [EmbeddedPath]: string[] | null;
  declare [Editable]: boolean;
  declare [Legacy]: boolean;
  declare [Signals]: Map<string, Signal>;
  declare [Symbol.toStringTag]: `SchemaRecord<${string}>`;
  declare ___notifications: object;

  constructor(
    store: Store,
    identifier: StableRecordIdentifier,
    Mode: { [Editable]: boolean; [Legacy]: boolean },
    isEmbedded = false,
    embeddedType: string | null = null,
    embeddedPath: string[] | null = null
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this[RecordStore] = store;
    if (isEmbedded) {
      this[Parent] = identifier;
    } else {
      this[Identifier] = identifier;
    }
    const IS_EDITABLE = (this[Editable] = Mode[Editable] ?? false);
    this[Legacy] = Mode[Legacy] ?? false;

    const schema = store.schema as unknown as SchemaService;
    const cache = store.cache;
    const identityField = schema.resource(identifier).identity;

    this[EmbeddedType] = embeddedType;
    this[EmbeddedPath] = embeddedPath;

    let fields: Map<string, FieldSchema>;
    if (isEmbedded) {
      fields = schema.fields({ type: embeddedType as string });
    } else {
      fields = schema.fields(identifier);
    }

    const signals: Map<string, Signal> = new Map();
    this[Signals] = signals;
    // what signal do we need for embedded record?
    this.___notifications = store.notifications.subscribe(
      identifier,
      (_: StableRecordIdentifier, type: NotificationType, key?: string | string[]) => {
        switch (type) {
          case 'attributes':
            if (key) {
              if (Array.isArray(key)) {
                if (!isEmbedded) return; // deep paths will be handled by embedded records
                // TODO we should have the notification manager
                // ensure it is safe for each callback to mutate this array
                if (isPathMatch(embeddedPath!, key)) {
                  // handle the notification
                  // TODO we should likely handle this notification here
                  // also we should add a LOGGING flag
                  // eslint-disable-next-line no-console
                  console.warn(`Notification unhandled for ${key.join(',')} on ${identifier.type}`, self);
                  return;
                }

                // TODO we should add a LOGGING flag
                // console.log(`Deep notification skipped for ${key.join('.')} on ${identifier.type}`, self);
                // deep notify the key path
              } else {
                if (isEmbedded) return; // base paths never apply to embedded records

                // TODO determine what LOGGING flag to wrap this in if any
                // console.log(`Notification for ${key} on ${identifier.type}`, self);
                const signal = signals.get(key);
                if (signal) {
                  addToTransaction(signal);
                }
                const field = fields.get(key);
                if (field?.kind === 'array' || field?.kind === 'schema-array') {
                  const peeked = peekManagedArray(self, field);
                  if (peeked) {
                    const arrSignal = peeked[ARRAY_SIGNAL];
                    arrSignal.shouldReset = true;
                    addToTransaction(arrSignal);
                  }
                }
              }
            }
            break;
        }
      }
    );

    return new Proxy(this, {
      ownKeys() {
        return Array.from(fields.keys());
      },

      has(target: SchemaRecord, prop: string | number | symbol) {
        return fields.has(prop as string);
      },

      getOwnPropertyDescriptor(target, prop) {
        if (!fields.has(prop as string)) {
          throw new Error(`No field named ${String(prop)} on ${identifier.type}`);
        }
        const schemaForField = fields.get(prop as string)!;
        switch (schemaForField.kind) {
          case 'derived':
            return {
              writable: false,
              enumerable: true,
              configurable: true,
            };
          case '@local':
          case 'field':
          case 'attribute':
          case 'resource':
          case 'schema-array':
          case 'array':
          case 'schema-object':
          case 'object':
            return {
              writable: IS_EDITABLE,
              enumerable: true,
              configurable: true,
            };
        }
      },

      get(target: SchemaRecord, prop: string | number | symbol, receiver: typeof Proxy<SchemaRecord>) {
        if (RecordSymbols.has(prop as RecordSymbol)) {
          return target[prop as keyof SchemaRecord];
        }

        if (prop === Symbol.toStringTag) {
          return `SchemaRecord<${identifier.type}:${identifier.id} (${identifier.lid})>`;
        }

        if (prop === 'toString') {
          return function () {
            return `SchemaRecord<${identifier.type}:${identifier.id} (${identifier.lid})>`;
          };
        }

        if (prop === Symbol.toPrimitive) {
          return null;
        }

        if (prop === '___notifications') {
          return target.___notifications;
        }

        // SchemaRecord reserves use of keys that begin with these characters
        // for its own usage.
        // _, @, $, *

        const propArray = isEmbedded ? embeddedPath!.slice() : [];
        propArray.push(prop as string);

        const field = prop === identityField?.name ? identityField : fields.get(prop as string);
        if (!field) {
          if (IgnoredGlobalFields.has(prop as string)) {
            return undefined;
          }
          if (prop === 'constructor') {
            return SchemaRecord;
          }
          // too many things check for random symbols
          if (typeof prop === 'symbol') {
            return undefined;
          }
          throw new Error(`No field named ${String(prop)} on ${identifier.type}`);
        }

        switch (field.kind) {
          case '@id':
            entangleSignal(signals, receiver, '@identity');
            return identifier.id;
          case '@hash':
            // TODO pass actual cache value not {}
            return schema.hashFn(field)({}, field.options ?? null, field.name ?? null);
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
            return computeField(schema, cache, target, identifier, field, propArray);
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
            entangleSignal(signals, receiver, field.name);
            return computeArray(store, schema, cache, target, identifier, field, propArray, true);
          case 'array':
            assert(
              `SchemaRecord.${field.name} is not available in legacy mode because it has type '${field.kind}'`,
              !target[Legacy]
            );
            entangleSignal(signals, receiver, field.name);
            return computeArray(store, schema, cache, target, identifier, field, propArray);
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

        const propArray = isEmbedded ? embeddedPath!.slice() : [];
        propArray.push(prop as string);

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
            if (!field.type) {
              cache.setAttr(identifier, propArray, value as Value);
              return true;
            }
            const transform = schema.transformation(field);
            const rawValue = transform.serialize(value, field.options ?? null, target);
            cache.setAttr(identifier, propArray, rawValue);
            return true;
          }
          case 'attribute': {
            cache.setAttr(identifier, propArray, value as Value);
            return true;
          }
          case 'array': {
            if (!field.type) {
              cache.setAttr(identifier, propArray, (value as ArrayValue)?.slice());
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

            const transform = schema.transformation(field);
            const rawValue = (value as ArrayValue).map((item) =>
              transform.serialize(item, field.options ?? null, target)
            );
            cache.setAttr(identifier, propArray, rawValue);
            const peeked = peekManagedArray(self, field);
            if (peeked) {
              const arrSignal = peeked[ARRAY_SIGNAL];
              arrSignal.shouldReset = true;
            }
            return true;
          }
          case 'schema-array': {
            const arrayValue = (value as ArrayValue)?.slice();
            if (!Array.isArray(arrayValue)) {
              ManagedArrayMap.delete(target);
            }
            cache.setAttr(identifier, propArray, arrayValue);
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
          case 'object': {
            if (!field.type) {
              let newValue = value;
              if (value !== null) {
                newValue = { ...(value as ObjectValue) };
              } else {
                ManagedObjectMap.delete(target);
              }

              cache.setAttr(identifier, propArray, newValue as Value);

              const peeked = peekManagedObject(self, field);
              if (peeked) {
                const objSignal = peeked[OBJECT_SIGNAL];
                objSignal.shouldReset = true;
              }
              return true;
            }
            const transform = schema.transformation(field);
            const rawValue = transform.serialize({ ...(value as ObjectValue) }, field.options ?? null, target);

            cache.setAttr(identifier, propArray, rawValue);
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
