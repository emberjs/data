import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { NotificationType, Store } from '../../index.ts';
import type { RelatedCollection as ManyArray } from '../../store/-private.ts';
import {
  ARRAY_SIGNAL,
  entangleSignal,
  getOrCreateInternalSignal,
  notifyInternalSignal,
  OBJECT_SIGNAL,
  recordIdentifierFor,
  setRecordIdentifier,
  Signals,
  withSignalStore,
} from '../../store/-private.ts';
import type { StableRecordIdentifier } from '../../types/identifier.ts';
import type { ArrayValue, ObjectValue, Value } from '../../types/json/raw.ts';
import { STRUCTURED } from '../../types/request.ts';
import type { FieldSchema } from '../../types/schema/fields.ts';
import type { SingleResourceRelationship } from '../../types/spec/json-api-raw.ts';
import { RecordStore } from '../../types/symbols.ts';
import {
  computeArray,
  computeAttribute,
  computeDerivation,
  computeField,
  computeHasMany,
  computeLocal,
  computeObject,
  computeResource,
  computeSchemaObject,
  ManagedArrayMap,
  ManagedObjectMap,
  peekManagedArray,
  peekManagedObject,
} from './fields/compute.ts';
import type { SchemaService } from './schema.ts';
import { Checkout, Destroy, Editable, EmbeddedPath, EmbeddedType, Identifier, Legacy, Parent } from './symbols.ts';

export { Editable, Legacy, Checkout } from './symbols';
const IgnoredGlobalFields = new Set<string>(['length', 'nodeType', 'then', 'setInterval', 'document', STRUCTURED]);
const symbolList = [Destroy, RecordStore, Identifier, Editable, Parent, Checkout, Legacy, EmbeddedPath, EmbeddedType];
const RecordSymbols = new Set(symbolList);

type RecordSymbol = (typeof symbolList)[number];
type ProxiedMethod = (...args: unknown[]) => unknown;

function isPathMatch(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function isNonEnumerableProp(prop: string | number | symbol) {
  return (
    prop === 'constructor' ||
    prop === 'prototype' ||
    prop === '__proto__' ||
    prop === 'toString' ||
    prop === 'toJSON' ||
    prop === 'toHTML' ||
    typeof prop === 'symbol'
  );
}

const Editables = new WeakMap<ReactiveResource, ReactiveResource>();
/**
 * A class that uses a the ResourceSchema for a ResourceType
 * and a ResouceKey to transform data from the cache into a rich, reactive
 * object.
 *
 * This class is not directly instantiable. To use it, you should
 * configure the store's `instantiateRecord` and `teardownRecord` hooks
 * with the matching hooks provided by this package.
 *
 * @hideconstructor
 * @public
 */
export class ReactiveResource {
  /** @internal */
  declare [RecordStore]: Store;
  /** @internal */
  declare [Identifier]: StableRecordIdentifier;
  /** @internal */
  declare [Parent]: StableRecordIdentifier;
  /** @internal */
  declare [EmbeddedType]: string | null;
  /** @internal */
  declare [EmbeddedPath]: string[] | null;
  /** @internal */
  declare [Editable]: boolean;
  /** @internal */
  declare [Legacy]: boolean;
  declare [Symbol.toStringTag]: `ReactiveResource<${string}>`;
  /** @internal */
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
    const identityField = schema.resource(isEmbedded ? { type: embeddedType as string } : identifier).identity;
    const BoundFns = new Map<string | symbol, ProxiedMethod>();

    this[EmbeddedType] = embeddedType;
    this[EmbeddedPath] = embeddedPath;

    const fields: Map<string, FieldSchema> = isEmbedded
      ? schema.fields({ type: embeddedType as string })
      : schema.fields(identifier);

    const signals = withSignalStore(this);

    const proxy = new Proxy(this, {
      ownKeys() {
        const identityKey = identityField?.name;
        const keys = Array.from(fields.keys());
        if (identityKey) {
          keys.unshift(identityKey);
        }
        return keys;
      },

      has(target: ReactiveResource, prop: string | number | symbol) {
        if (prop === Destroy || prop === Checkout) {
          return true;
        }
        return fields.has(prop as string);
      },

      getOwnPropertyDescriptor(target, prop) {
        const schemaForField = prop === identityField?.name ? identityField : fields.get(prop as string)!;
        assert(`No field named ${String(prop)} on ${identifier.type}`, schemaForField);

        if (isNonEnumerableProp(prop)) {
          return {
            writable: false,
            enumerable: false,
            configurable: true,
          };
        }

        switch (schemaForField.kind) {
          case 'derived':
            return {
              writable: false,
              enumerable: true,
              configurable: true,
            };
          case '@id':
            return {
              writable: identifier.id === null,
              enumerable: true,
              configurable: true,
            };
          case '@local':
          case 'field':
          case 'attribute':
          case 'resource':
          case 'alias':
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
          default:
            return {
              writable: false,
              enumerable: false,
              configurable: false,
            };
        }
      },

      get(target: ReactiveResource, prop: string | number | symbol, receiver: typeof Proxy<ReactiveResource>) {
        if (RecordSymbols.has(prop as RecordSymbol)) {
          return target[prop as keyof ReactiveResource];
        }
        if (prop === Signals) {
          return signals;
        }

        // TODO make this a symbol
        if (prop === '___notifications') {
          return target.___notifications;
        }

        // ReactiveResource reserves use of keys that begin with these characters
        // for its own usage.
        // _, @, $, *

        const maybeField = prop === identityField?.name ? identityField : fields.get(prop as string);
        if (!maybeField) {
          if (IgnoredGlobalFields.has(prop as string)) {
            return undefined;
          }

          /////////////////////////////////////////////////////////////
          //// Note these bound function behaviors are essentially ////
          //// built-in but overrideable derivations.              ////
          ////                                                     ////
          //// The bar for this has to be "basic expectations of   ////
          ///  an object" – very, very high                        ////
          /////////////////////////////////////////////////////////////

          if (prop === Symbol.toStringTag || prop === 'toString') {
            let fn = BoundFns.get('toString');
            if (!fn) {
              fn = function () {
                entangleSignal(signals, receiver, '@identity', null);
                return `Record<${identifier.type}:${identifier.id} (${identifier.lid})>`;
              };
              BoundFns.set(prop, fn);
            }
            return fn;
          }

          if (prop === 'toHTML') {
            let fn = BoundFns.get('toHTML');
            if (!fn) {
              fn = function () {
                entangleSignal(signals, receiver, '@identity', null);
                return `<span>Record<${identifier.type}:${identifier.id} (${identifier.lid})></span>`;
              };
              BoundFns.set(prop, fn);
            }
            return fn;
          }

          if (prop === 'toJSON') {
            let fn = BoundFns.get('toJSON');
            if (!fn) {
              fn = function () {
                const json: Record<string, unknown> = {};
                for (const key in receiver) {
                  json[key] = receiver[key as keyof typeof receiver];
                }

                return json;
              };
              BoundFns.set(prop, fn);
            }
            return fn;
          }

          if (prop === Symbol.toPrimitive) return () => null;

          if (prop === Symbol.iterator) {
            let fn = BoundFns.get(Symbol.iterator);
            if (!fn) {
              fn = function* () {
                for (const key in receiver) {
                  yield [key, receiver[key as keyof typeof receiver]];
                }
              };
              BoundFns.set(Symbol.iterator, fn);
            }
            return fn;
          }

          if (prop === 'constructor') {
            return ReactiveResource;
          }
          // too many things check for random symbols
          if (typeof prop === 'symbol') return undefined;

          assert(`No field named ${String(prop)} on ${isEmbedded ? embeddedType! : identifier.type}`);
          return undefined;
        }

        const field = maybeField.kind === 'alias' ? maybeField.options : maybeField;
        assert(
          `Alias fields cannot alias '@id' '@local' '@hash' or 'derived' fields`,
          maybeField.kind !== 'alias' || !['@id', '@local', '@hash', 'derived'].includes(maybeField.options.kind)
        );
        const propArray = isEmbedded ? embeddedPath!.slice() : [];
        // we use the field.name instead of prop here because we want to use the cache-path not
        // the record path.
        propArray.push(field.name as string);
        // propArray.push(prop as string);

        switch (field.kind) {
          case '@id':
            entangleSignal(signals, receiver, '@identity', null);
            return identifier.id;
          case '@hash':
            // TODO pass actual cache value not {}
            return schema.hashFn(field)({}, field.options ?? null, field.name ?? null);
          case '@local': {
            return computeLocal(receiver, field, prop as string);
          }
          case 'field':
            entangleSignal(signals, receiver, field.name, null);
            return computeField(schema, cache, target, identifier, field, propArray, IS_EDITABLE);
          case 'attribute':
            entangleSignal(signals, receiver, field.name, null);
            return computeAttribute(cache, identifier, prop as string, IS_EDITABLE);
          case 'resource':
            entangleSignal(signals, receiver, field.name, null);
            return computeResource(store, cache, target, identifier, field, prop as string, IS_EDITABLE);
          case 'derived':
            return computeDerivation(
              schema,
              receiver as unknown as ReactiveResource,
              identifier,
              field,
              prop as string
            );
          case 'schema-array':
          case 'array':
            entangleSignal(signals, receiver, field.name, null);
            return computeArray(
              store,
              schema,
              cache,
              target,
              identifier,
              field,
              propArray,
              Mode[Editable],
              Mode[Legacy]
            );
          case 'object':
            entangleSignal(signals, receiver, field.name, null);
            return computeObject(schema, cache, target, identifier, field, propArray, Mode[Editable], Mode[Legacy]);
          case 'schema-object':
            entangleSignal(signals, receiver, field.name, null);
            // run transform, then use that value as the object to manage
            return computeSchemaObject(
              store,
              cache,
              target,
              identifier,
              field,
              propArray,
              Mode[Legacy],
              Mode[Editable]
            );
          case 'belongsTo':
            if (field.options.linksMode) {
              entangleSignal(signals, receiver, field.name, null);
              const rawValue = IS_EDITABLE
                ? (cache.getRelationship(identifier, field.name) as SingleResourceRelationship)
                : (cache.getRemoteRelationship(identifier, field.name) as SingleResourceRelationship);

              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return rawValue.data ? store.peekRecord(rawValue.data) : null;
            }
            assert(`Can only use belongsTo fields when the resource is in legacy mode`, Mode[Legacy]);
            entangleSignal(signals, receiver, field.name, null);
            return schema._kind('@legacy', 'belongsTo').get(store, receiver, identifier, field);
          case 'hasMany':
            if (field.options.linksMode) {
              entangleSignal(signals, receiver, field.name, null);

              return computeHasMany(
                store,
                schema,
                cache,
                target,
                identifier,
                field,
                propArray,
                Mode[Editable],
                Mode[Legacy]
              );
            }
            assert(`Can only use hasMany fields when the resource is in legacy mode`, Mode[Legacy]);
            entangleSignal(signals, receiver, field.name, null);
            return schema._kind('@legacy', 'hasMany').get(store, receiver, identifier, field);
          default:
            throw new Error(`Field '${String(prop)}' on '${identifier.type}' has the unknown kind '${field.kind}'`);
        }
      },
      set(
        target: ReactiveResource,
        prop: string | number | symbol,
        value: unknown,
        receiver: typeof Proxy<ReactiveResource>
      ) {
        if (!IS_EDITABLE) {
          const type = isEmbedded ? embeddedType : identifier.type;
          throw new Error(`Cannot set ${String(prop)} on ${type} because the record is not editable`);
        }

        const maybeField = prop === identityField?.name ? identityField : fields.get(prop as string);
        if (!maybeField) {
          const type = isEmbedded ? embeddedType! : identifier.type;
          throw new Error(`There is no field named ${String(prop)} on ${type}`);
        }
        const field = maybeField.kind === 'alias' ? maybeField.options : maybeField;
        assert(
          `Alias fields cannot alias '@id' '@local' '@hash' or 'derived' fields`,
          maybeField.kind !== 'alias' || !['@id', '@local', '@hash', 'derived'].includes(maybeField.options.kind)
        );
        const propArray = isEmbedded ? embeddedPath!.slice() : [];
        // we use the field.name instead of prop here because we want to use the cache-path not
        // the record path.
        propArray.push(field.name as string);
        // propArray.push(prop as string);

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
            return true;
          }
          case '@local': {
            const signal = getOrCreateInternalSignal(
              signals,
              receiver,
              prop as string | symbol,
              field.options?.defaultValue ?? null
            );
            if (signal.value !== value) {
              signal.value = value;
              notifyInternalSignal(signal);
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
                assert(
                  `Expected the peekManagedArray for ${field.kind} to return a ManagedArray`,
                  ARRAY_SIGNAL in peeked
                );
                const arrSignal = peeked[ARRAY_SIGNAL];
                arrSignal.isStale = true;
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
              assert(
                `Expected the peekManagedArray for ${field.kind} to return a ManagedArray`,
                ARRAY_SIGNAL in peeked
              );
              const arrSignal = peeked[ARRAY_SIGNAL];
              arrSignal.isStale = true;
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
              assert(
                `Expected the peekManagedArray for ${field.kind} to return a ManagedArray`,
                ARRAY_SIGNAL in peeked
              );
              const arrSignal = peeked[ARRAY_SIGNAL];
              arrSignal.isStale = true;
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
                objSignal.isStale = true;
              }
              return true;
            }

            const transform = schema.transformation(field);
            const rawValue = transform.serialize({ ...(value as ObjectValue) }, field.options ?? null, target);

            cache.setAttr(identifier, propArray, rawValue);
            const peeked = peekManagedObject(self, field);
            if (peeked) {
              const objSignal = peeked[OBJECT_SIGNAL];
              objSignal.isStale = true;
            }
            return true;
          }
          case 'schema-object': {
            let newValue = value;
            if (value !== null) {
              assert(`Expected value to be an object`, typeof value === 'object');
              newValue = { ...(value as ObjectValue) };
              const schemaFields = schema.fields({ type: field.type });
              for (const key of Object.keys(newValue as ObjectValue)) {
                if (!schemaFields.has(key)) {
                  throw new Error(`Field ${key} does not exist on schema object ${field.type}`);
                }
              }
            } else {
              ManagedObjectMap.delete(target);
            }
            cache.setAttr(identifier, propArray, newValue as Value);
            // const peeked = peekManagedObject(self, field);
            // if (peeked) {
            //   const objSignal = peeked[OBJECT_SIGNAL];
            //   objSignal.isStale = true;
            // }
            return true;
          }
          case 'derived': {
            throw new Error(`Cannot set ${String(prop)} on ${identifier.type} because it is derived`);
          }
          case 'belongsTo':
            assert(`Can only use belongsTo fields when the resource is in legacy mode`, Mode[Legacy]);
            schema._kind('@legacy', 'belongsTo').set(store, receiver, identifier, field, value);
            return true;
          case 'hasMany':
            assert(`Can only use hasMany fields when the resource is in legacy mode`, Mode[Legacy]);
            assert(`You must pass an array of records to set a hasMany relationship`, Array.isArray(value));
            schema._kind('@legacy', 'hasMany').set(store, receiver, identifier, field, value);
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
                notifyInternalSignal(signal);
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
                  notifyInternalSignal(signal);
                }
                const field = fields.get(key);
                if (field?.kind === 'array' || field?.kind === 'schema-array') {
                  const peeked = peekManagedArray(self, field);
                  if (peeked) {
                    assert(
                      `Expected the peekManagedArray for ${field.kind} to return a ManagedArray`,
                      ARRAY_SIGNAL in peeked
                    );
                    const arrSignal = peeked[ARRAY_SIGNAL];
                    notifyInternalSignal(arrSignal);
                  }
                }
                if (field?.kind === 'object') {
                  const peeked = peekManagedObject(self, field);
                  if (peeked) {
                    const objSignal = peeked[OBJECT_SIGNAL];
                    notifyInternalSignal(objSignal);
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
                    notifyInternalSignal(signal);
                  }
                  // FIXME
                } else if (field.kind === 'resource') {
                  // FIXME
                } else if (field.kind === 'hasMany') {
                  if (field.options.linksMode) {
                    const peeked = peekManagedArray(self, field) as ManyArray | undefined;
                    if (peeked) {
                      notifyInternalSignal(peeked[ARRAY_SIGNAL]);
                    }
                    return;
                  }

                  assert(`Can only use hasMany fields when the resource is in legacy mode`, Mode[Legacy]);

                  if (schema._kind('@legacy', 'hasMany').notify(store, proxy, identifier, field)) {
                    assert(`Expected options to exist on relationship meta`, field.options);
                    assert(`Expected async to exist on relationship meta options`, 'async' in field.options);
                    if (field.options.async) {
                      const signal = signals.get(key);
                      if (signal) {
                        notifyInternalSignal(signal);
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

    if (DEBUG) {
      Object.defineProperty(this, '__SHOW_ME_THE_DATA_(debug mode only)__', {
        enumerable: false,
        configurable: true,
        get() {
          const data: Record<string, unknown> = {};
          for (const key of fields.keys()) {
            data[key] = proxy[key as keyof ReactiveResource];
          }

          return data;
        },
      });
    }

    return proxy;
  }

  /** @internal */
  [Destroy](): void {
    if (this[Legacy]) {
      // @ts-expect-error
      this.isDestroying = true;
      // @ts-expect-error
      this.isDestroyed = true;
    }
    this[RecordStore].notifications.unsubscribe(this.___notifications);
  }

  /**
   * Create an editable copy of the record
   *
   * ReactiveResource instances are not editable by default. This method creates an editable copy of the record. To use,
   * import the `Checkout` symbol from `@warp-drive/schema-record` and call it on the record.
   *
   * ```ts
   * import { Checkout } from '@warp-drive/schema-record';
   *
   * const record = store.peekRecord('user', '1');
   * const editableRecord = await record[Checkout]();
   * ```
   *
   * @returns a promise that resolves to the editable record
   * @throws if the record is already editable or if the record is embedded
   *
   */
  [Checkout](): Promise<ReactiveResource> {
    // IF we are already the editable record, throw an error
    if (this[Editable]) {
      throw new Error(`Cannot checkout an already editable record`);
    }

    const editable = Editables.get(this);
    if (editable) {
      return Promise.resolve(editable);
    }

    const embeddedType = this[EmbeddedType];
    const embeddedPath = this[EmbeddedPath];
    const isEmbedded = embeddedType !== null && embeddedPath !== null;

    if (isEmbedded) {
      throw new Error(`Cannot checkout an embedded record (yet)`);
    }

    const editableRecord = new ReactiveResource(
      this[RecordStore],
      this[Identifier],
      {
        [Editable]: true,
        [Legacy]: this[Legacy],
      },
      isEmbedded,
      embeddedType,
      embeddedPath
    );
    setRecordIdentifier(editableRecord, recordIdentifierFor(this));
    return Promise.resolve(editableRecord);
  }
}
