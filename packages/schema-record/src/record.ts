import { dependencySatisfies, importSync } from '@embroider/macros';

import type { MinimalLegacyRecord } from '@ember-data/model/-private/model-methods';
import type Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store';
import { addToTransaction, entangleSignal, getSignal, type Signal, Signals } from '@ember-data/tracking/-private';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { ArrayValue, ObjectValue, Value } from '@warp-drive/core-types/json/raw';
import { STRUCTURED } from '@warp-drive/core-types/request';
import type { FieldSchema } from '@warp-drive/core-types/schema/fields';
import { RecordStore } from '@warp-drive/core-types/symbols';

import {
  computeArray,
  computeAttribute,
  computeDerivation,
  computeField,
  computeLocal,
  computeObject,
  computeResource,
  ManagedArrayMap,
  ManagedObjectMap,
  peekManagedArray,
  peekManagedObject,
} from './-private/compute';
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

const HAS_MODEL_PACKAGE = dependencySatisfies('@ember-data/model', '*');
const getLegacySupport = HAS_MODEL_PACKAGE
  ? (importSync('@ember-data/model/-private') as typeof import('@ember-data/model/-private')).lookupLegacySupport
  : null;

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

function isPathMatch(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
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

    const proxy = new Proxy(this, {
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
          case 'belongsTo':
          case 'hasMany':
          case 'collection':
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

        // TODO make this a symbol
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
          case 'belongsTo':
            if (!HAS_MODEL_PACKAGE) {
              assert(
                `Cannot use belongsTo fields in your schema unless @ember-data/model is installed to provide legacy model support. ${field.name} should likely be migrated to be a resource field.`
              );
            }
            assert(`Expected to have a getLegacySupport function`, getLegacySupport);
            assert(`Can only use belongsTo fields when the resource is in legacy mode`, Mode[Legacy]);
            entangleSignal(signals, receiver, field.name);
            return getLegacySupport(receiver as unknown as MinimalLegacyRecord).getBelongsTo(field.name);
          case 'hasMany':
            if (!HAS_MODEL_PACKAGE) {
              assert(
                `Cannot use hasMany fields in your schema unless @ember-data/model is installed to provide legacy model support.  ${field.name} should likely be migrated to be a collection field.`
              );
            }
            assert(`Expected to have a getLegacySupport function`, getLegacySupport);
            assert(`Can only use hasMany fields when the resource is in legacy mode`, Mode[Legacy]);
            entangleSignal(signals, receiver, field.name);
            return getLegacySupport(receiver as unknown as MinimalLegacyRecord).getHasMany(field.name);
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

        const field = prop === identityField?.name ? identityField : fields.get(prop as string);
        if (!field) {
          throw new Error(`There is no field named ${String(prop)} on ${identifier.type}`);
        }

        switch (field.kind) {
          case '@id': {
            assert(`Expected to receive a string id`, typeof value === 'string' && value.length);
            const normalizedId = String(value);
            const didChange = normalizedId !== identifier.id;
            assert(
              `Cannot set ${identifier.type} record's id to ${normalizedId}, because id is already ${identifier.id}`,
              !didChange || identifier.id === null
            );

            if (normalizedId !== null && didChange) {
              store._instanceCache.setRecordId(identifier, normalizedId);
              store.notifications.notify(identifier, 'identity');
            }
          }
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
          case 'belongsTo':
            if (!HAS_MODEL_PACKAGE) {
              assert(
                `Cannot use belongsTo fields in your schema unless @ember-data/model is installed to provide legacy model support. ${field.name} should likely be migrated to be a resource field.`
              );
            }
            assert(`Expected to have a getLegacySupport function`, getLegacySupport);
            assert(`Can only use belongsTo fields when the resource is in legacy mode`, Mode[Legacy]);
            store._join(() => {
              getLegacySupport(receiver as unknown as MinimalLegacyRecord).setDirtyBelongsTo(field.name, value);
            });
            return true;
          case 'hasMany':
            if (!HAS_MODEL_PACKAGE) {
              assert(
                `Cannot use hasMany fields in your schema unless @ember-data/model is installed to provide legacy model support.  ${field.name} should likely be migrated to be a collection field.`
              );
            }
            assert(`Expected to have a getLegacySupport function`, getLegacySupport);
            assert(`Can only use hasMany fields when the resource is in legacy mode`, Mode[Legacy]);
            assert(`You must pass an array of records to set a hasMany relationship`, Array.isArray(value));
            store._join(() => {
              const support = getLegacySupport(receiver as unknown as MinimalLegacyRecord);
              const manyArray = support.getManyArray(field.name);

              manyArray.splice(0, manyArray.length, ...(value as unknown[]));
            });
            return true;

          default:
            throw new Error(`Unknown field kind ${field.kind}`);
        }
      },
    });

    // what signal do we need for embedded record?
    this.___notifications = store.notifications.subscribe(
      identifier,
      (_: StableRecordIdentifier, type: NotificationType, key?: string | string[]) => {
        switch (type) {
          case 'identity': {
            if (isEmbedded || !identityField) return; // base paths never apply to embedded records

            if (identityField.name && identityField.kind === '@id') {
              const signal = signals.get('@identity');
              if (signal) {
                addToTransaction(signal);
              }
            }
            break;
          }
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
          case 'relationships':
            if (key) {
              if (Array.isArray(key)) {
                // FIXME
              } else {
                if (isEmbedded) return; // base paths never apply to embedded records

                const field = fields.get(key);
                assert(`Expected relationshp ${key} to be the name of a field`, field);
                if (field.kind === 'belongsTo') {
                  // TODO determine what LOGGING flag to wrap this in if any
                  // console.log(`Notification for ${key} on ${identifier.type}`, self);
                  const signal = signals.get(key);
                  if (signal) {
                    addToTransaction(signal);
                  }
                  // FIXME
                } else if (field.kind === 'resource') {
                  // FIXME
                } else if (field.kind === 'hasMany') {
                  assert(`Expected to have a getLegacySupport function`, getLegacySupport);
                  assert(`Can only use hasMany fields when the resource is in legacy mode`, Mode[Legacy]);

                  const support = getLegacySupport(proxy as unknown as MinimalLegacyRecord);
                  const manyArray = support && support._manyArrayCache[key];
                  const hasPromise =
                    support && (support._relationshipPromisesCache[key] as Promise<unknown> | undefined);

                  if (manyArray && hasPromise) {
                    // do nothing, we will notify the ManyArray directly
                    // once the fetch has completed.
                    return;
                  }

                  if (manyArray) {
                    manyArray.notify();

                    assert(`Expected options to exist on relationship meta`, field.options);
                    assert(`Expected async to exist on relationship meta options`, 'async' in field.options);
                    if (field.options.async) {
                      const signal = signals.get(key);
                      if (signal) {
                        addToTransaction(signal);
                      }
                    }
                  }
                } else if (field.kind === 'collection') {
                  // FIXME
                }
              }
            }

            break;
        }
      }
    );

    return proxy;
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
