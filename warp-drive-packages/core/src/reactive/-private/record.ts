import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { NotificationType } from '../../index.ts';
import type { LegacyManyArray, Store } from '../../store/-private.ts';
import {
  ARRAY_SIGNAL,
  entangleSignal,
  notifyInternalSignal,
  OBJECT_SIGNAL,
  recordIdentifierFor,
  setRecordIdentifier,
  Signals,
  withSignalStore,
} from '../../store/-private.ts';
import { removeRecordIdentifier } from '../../store/-private/caches/instance-cache.ts';
import type { StableRecordIdentifier } from '../../types/identifier.ts';
import { STRUCTURED } from '../../types/request.ts';
import type { FieldSchema, GenericField, IdentityField } from '../../types/schema/fields.ts';
import { RecordStore } from '../../types/symbols.ts';
import type { ObjectContext, ResourceContext } from './default-mode.ts';
import { DefaultMode } from './default-mode.ts';
import type { ProxiedMethod } from './fields/extension.ts';
import { isExtensionProp, performExtensionSet, performObjectExtensionGet } from './fields/extension.ts';
import { getFieldCacheKey } from './fields/get-field-key.ts';
import type { ManagedArray } from './fields/managed-array.ts';
import { peekManagedObject } from './fields/managed-object.ts';
import type { SchemaService } from './schema.ts';
import { Checkout, Commit, Context, Destroy } from './symbols.ts';

const IgnoredGlobalFields = new Set<string>(['length', 'nodeType', 'then', 'setInterval', 'document', STRUCTURED]);
const symbolList = [Context, Destroy, RecordStore, Checkout, Commit];
const RecordSymbols = new Set(symbolList);

type RecordSymbol = (typeof symbolList)[number];

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

const Editables = new Map<ReactiveResource, ReactiveResource>();

export interface ReactiveResource {
  /** @internal */
  [Symbol.toStringTag]: `ReactiveResource<${string}>`;

  /** @internal */
  [Context]: ObjectContext | ResourceContext;

  /** @internal */
  [RecordStore]: Store;

  /** @internal */
  ___notifications: object;

  /** @internal */
  [Destroy](): void;

  /** @internal */
  [Commit](): Promise<void>;

  /**
   * Create an editable copy of the record
   *
   * ReactiveResource instances are not editable by default. This method creates an editable copy of the record. To use,
   * import the `Checkout` symbol from `@warp-drive/core/reactive` and call it on the record.
   *
   * ```ts
   * import { Checkout } from '@warp-drive/core/reactive';
   *
   * const record = store.peekRecord('user', '1');
   * const editableRecord = await record[Checkout]();
   * ```
   *
   * @returns a promise that resolves to the editable record
   * @throws if the record is already editable or if the record is embedded
   * @internal
   */
  [Checkout]<T>(): Promise<T>;
}

/**
 * A class that uses a the ResourceSchema for a ResourceType
 * and a ResourceKey to transform data from the cache into a rich, reactive
 * object.
 *
 * This class is not directly instantiable. To use it, you should
 * configure the store's `instantiateRecord` and `teardownRecord` hooks
 * with the matching hooks provided by this package.
 *
 * @hideconstructor
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ReactiveResource {
  constructor(context: ResourceContext | ObjectContext) {
    const resourceKey = context.resourceKey;
    const isEmbedded = context.path !== null;
    const schema = context.store.schema as unknown as SchemaService;
    const objectType = isEmbedded ? context.value : resourceKey.type;
    const ResourceSchema = schema.resource(isEmbedded ? { type: objectType } : resourceKey);
    const identityField = ResourceSchema.identity;
    const BoundFns = new Map<string | symbol, ProxiedMethod>();

    // prettier-ignore
    const extensions =
      !context.legacy ? null
      : isEmbedded ? schema.CAUTION_MEGA_DANGER_ZONE_objectExtensions(context.field, objectType)
      : schema.CAUTION_MEGA_DANGER_ZONE_resourceExtensions(resourceKey);

    this[Context] = context;
    this[RecordStore] = context.store;

    const fields = isEmbedded ? schema.fields({ type: objectType }) : schema.fields(resourceKey);
    const method = typeof schema.cacheFields === 'function' ? 'cacheFields' : 'fields';
    const cacheFields = isEmbedded ? schema[method]({ type: objectType }) : schema[method](resourceKey);

    const signals = withSignalStore(this);
    this.___notifications = context.store.notifications.subscribe(
      resourceKey,
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
                if (context.path === null) return; // deep paths will be handled by embedded records
                // TODO we should have the notification manager
                // ensure it is safe for each callback to mutate this array
                if (isPathMatch(context.path, key)) {
                  // handle the notification
                  // TODO we should likely handle this notification here
                  // also we should add a LOGGING flag
                  // eslint-disable-next-line no-console
                  console.warn(`Notification unhandled for ${key.join(',')} on ${resourceKey.type}`, proxy);
                  return;
                }

                // TODO we should add a LOGGING flag
                // console.log(`Deep notification skipped for ${key.join('.')} on ${identifier.type}`, proxy);
                // deep notify the key path
              } else {
                if (isEmbedded) return; // base paths never apply to embedded records

                // TODO determine what LOGGING flag to wrap this in if any
                // console.log(`Notification for ${key} on ${identifier.type}`, proxy);
                const signal = signals.get(key);
                if (signal) {
                  notifyInternalSignal(signal);
                }
                const field = cacheFields.get(key);
                if (field?.kind === 'array' || field?.kind === 'schema-array') {
                  const peeked = signal?.value as ManagedArray | undefined;
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
                  const peeked = peekManagedObject(proxy, field);
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

                const field = cacheFields.get(key);
                assert(`Expected relationship ${key} to be the name of a field`, field);
                if (field.kind === 'belongsTo') {
                  // TODO determine what LOGGING flag to wrap this in if any
                  // console.log(`Notification for ${key} on ${identifier.type}`, proxy);
                  const signal = signals.get(key);
                  if (signal) {
                    notifyInternalSignal(signal);
                  }
                  // FIXME
                } else if (field.kind === 'resource') {
                  // FIXME
                } else if (field.kind === 'hasMany') {
                  if (field.options.linksMode) {
                    const signal = signals.get(key);
                    if (signal) {
                      const peeked = signal.value as LegacyManyArray | undefined;
                      if (peeked) {
                        notifyInternalSignal(peeked[Context].signal);
                      }
                    }
                    return;
                  }

                  assert(`Can only use hasMany fields when the resource is in legacy mode`, context.legacy);

                  if (schema._kind('@legacy', 'hasMany').notify(context.store, proxy, resourceKey, field)) {
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
        assert(`No field named ${String(prop)} on ${resourceKey.type}`, schemaForField);

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
              writable: resourceKey.id === null,
              enumerable: true,
              configurable: true,
            };
          case '@hash':
            return schemaForField.name
              ? {
                  writable: false,
                  enumerable: true,
                  configurable: true,
                }
              : {
                  writable: false,
                  enumerable: false,
                  configurable: false,
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
              writable: context.editable,
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
          if (prop === Destroy) {
            return () => _DESTROY(receiver as unknown as ReactiveResource);
          }
          if (prop === Checkout) {
            return () => Promise.resolve(_CHECKOUT(receiver as unknown as ReactiveResource));
          }
          if (prop === Commit) {
            return () => Promise.resolve(_COMMIT(receiver as unknown as ReactiveResource));
          }
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
                return `Record<${resourceKey.type}:${resourceKey.id} (${resourceKey.lid})>`;
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
                return `<span>Record<${resourceKey.type}:${resourceKey.id} (${resourceKey.lid})></span>`;
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

          if (isExtensionProp(extensions, prop)) {
            return performObjectExtensionGet(receiver, extensions!, signals, prop);
          }

          // too many things check for random symbols
          if (typeof prop === 'symbol') return undefined;

          assert(`No field named ${String(prop)} on ${context.path ? context.value : resourceKey.type}`);
          return undefined;
        }

        const field = maybeField.kind === 'alias' ? maybeField.options : maybeField;
        assert(
          `Alias fields cannot alias '@id' '@local' '@hash' or 'derived' fields`,
          maybeField.kind !== 'alias' || !['@id', '@local', '@hash', 'derived'].includes(maybeField.options.kind)
        );
        /**
         * Prop Array is the path from a resource to the field including
         * intermediate "links" on arrays,objects,schema-arrays and schema-objects.
         *
         * E.g. in the following
         *
         * ```
         * const user = {
         *   addresses: [{
         *     street: 'Sunset Blvd',
         *     zip: 90210
         *   }]
         * }
         * ```
         *
         * The propArray for "street" is ['addresses', 0, 'street']
         *
         * Prop Array follows the `cache` path to the value, not the ui path.
         * Thus, if `addresses` has a sourceKey of `user_addresses` and
         * `zip` has a sourceKey of `zip_code` then the propArray for "zip" is
         * ['user_addresses', 0, 'zip_code']
         */
        const propArray = context.path?.slice() ?? [];
        // we use the field.name instead of prop here because we want to use the cache-path not
        // the record path.
        // SAFETY: we lie as string here because if we were to get null
        // we would be in a field kind that won't use the propArray below.
        const fieldCacheKey = getFieldCacheKey(field) as string;
        propArray.push(fieldCacheKey);

        switch (field.kind) {
          case '@id':
          case '@hash':
          case '@local':
          case 'derived':
          case 'field':
          case 'attribute':
          case 'schema-array':
          case 'array':
          case 'schema-object':
          case 'object':
          case 'resource':
          case 'belongsTo':
          case 'hasMany':
          case 'collection':
            return DefaultMode[field.kind as 'field'].get({
              store: context.store,
              resourceKey: resourceKey,
              modeName: context.modeName,
              legacy: context.legacy,
              editable: context.editable,
              path: propArray,
              field: field as GenericField,
              record: receiver as unknown as ReactiveResource,
              signals,
              value: null,
            });

          default:
            assertNeverField(resourceKey, field, propArray);
        }
      },

      set(
        target: ReactiveResource,
        prop: string | number | symbol,
        value: unknown,
        receiver: typeof Proxy<ReactiveResource>
      ) {
        // the only "editable" prop as it is currently a proxy for "isDestroyed"
        if (prop === '___notifications') {
          target[prop] = value as object;
          return true;
        }

        if (!context.editable) {
          assert(
            `Cannot set ${String(prop)} on ${context.path !== null ? context.value : resourceKey.type} because the record is not editable`
          );
          return false;
        }

        const maybeField = prop === identityField?.name ? identityField : fields.get(prop as string);
        if (!maybeField) {
          const type = context.path !== null ? context.value : resourceKey.type;

          if (isExtensionProp(extensions, prop)) {
            return performExtensionSet(receiver, extensions!, signals, prop, value);
          }

          assert(`There is no settable field named ${String(prop)} on ${type}`);
          return false;
        }
        const field = maybeField.kind === 'alias' ? maybeField.options : maybeField;
        assert(
          `Alias fields cannot alias '@id' '@local' '@hash' or 'derived' fields`,
          maybeField.kind !== 'alias' || !['@id', '@local', '@hash', 'derived'].includes(maybeField.options.kind)
        );
        /**
         * Prop Array is the path from a resource to the field including
         * intermediate "links" on arrays,objects,schema-arrays and schema-objects.
         *
         * E.g. in the following
         *
         * ```
         * const user = {
         *   addresses: [{
         *     street: 'Sunset Blvd',
         *     zip: 90210
         *   }]
         * }
         * ```
         *
         * The propArray for "street" is ['addresses', 0, 'street']
         *
         * Prop Array follows the `cache` path to the value, not the ui path.
         * Thus, if `addresses` has a sourceKey of `user_addresses` and
         * `zip` has a sourceKey of `zip_code` then the propArray for "zip" is
         * ['user_addresses', 0, 'zip_code']
         */
        const propArray = context.path?.slice() ?? [];
        // we use the field.name instead of prop here because we want to use the cache-path not
        // the record path.
        // SAFETY: we lie as string here because if we were to get null
        // we would be in a field kind that won't use the propArray below.
        const fieldCacheKey = getFieldCacheKey(field) as string;
        propArray.push(fieldCacheKey);

        switch (field.kind) {
          case '@id':
          case '@hash':
          case '@local':
          case 'field':
          case 'attribute':
          case 'derived':
          case 'array':
          case 'schema-array':
          case 'schema-object':
          case 'object':
          case 'resource':
          case 'belongsTo':
          case 'hasMany':
          case 'collection':
            return DefaultMode[field.kind as '@id'].set({
              store: context.store,
              resourceKey: resourceKey,
              modeName: context.modeName,
              legacy: context.legacy,
              editable: context.editable,
              path: propArray,
              field: field as IdentityField,
              record: receiver as unknown as ReactiveResource,
              signals,
              value,
            });

          default:
            return assertNeverField(resourceKey, field, propArray);
        }
      },
    });

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
}

async function _COMMIT(record: ReactiveResource): Promise<void> {
  await Promise.resolve();
  const context = record[Context];
  context.store.cache.willCommit(context.resourceKey, null);
  context.store.cache.didCommit(context.resourceKey, null);
}

export function _CHECKOUT(record: ReactiveResource): ReactiveResource {
  const context = record[Context];

  // IF we are already the editable record, throw an error
  if (context.editable) {
    throw new Error(`Cannot checkout an already editable record`);
  }

  const editable = Editables.get(record);
  if (editable) {
    return editable;
  }

  if (context.path !== null) {
    throw new Error(`Cannot checkout an embedded record`);
  }

  const editableRecord = new ReactiveResource({
    store: context.store,
    resourceKey: context.resourceKey,
    modeName: context.legacy ? 'legacy' : 'polaris',
    legacy: context.legacy,
    editable: true,
    path: null,
    field: null,
    value: null,
  });
  setRecordIdentifier(editableRecord, recordIdentifierFor(record));
  Editables.set(record, editableRecord);
  return editableRecord;
}

function _DESTROY(record: ReactiveResource): void {
  if (record[Context].legacy) {
    // @ts-expect-error
    record.isDestroying = true;
    // @ts-expect-error
    record.isDestroyed = true;
  } else if (!record[Context].editable) {
    const editable = Editables.get(record);
    if (editable) {
      _DESTROY(editable);
      removeRecordIdentifier(editable);
    }
  }

  record[Context].store.notifications.unsubscribe(record.___notifications);
  record.___notifications = null as unknown as object;

  // FIXME we need a way to also unsubscribe all SchemaObjects when the primary
  // resource is destroyed.
}

function assertNeverField(identifier: StableRecordIdentifier, field: never, path: string | string[]): false {
  assert(
    `Cannot use unknown field kind ${(field as FieldSchema).kind} on <${identifier.type}>.${Array.isArray(path) ? path.join('.') : path}`
  );
  return false;
}

/**
 * Checkout an immutable resource for editing.
 *
 * {@link ReactiveResource | ReactiveResources} are not editable by default. This method
 * creates an editable copy of the resource.
 *
 * This returns a promise which resolves with the editable
 * version of the resource.
 *
 * ```ts
 * import { checkout } from '@warp-drive/core/reactive';
 *
 * const immutable = store.peekRecord('user', '1');
 * const editable = await checkout(immutable);
 * ```
 *
 * Edits to editable resources will be automatically committed if a new
 * payload from the cache matches their existing value.
 *
 * @public
 *
 * @returns a promise that resolves to the editable resource
 * @throws if the resource is already editable or if resource is an embedded object
 */
export function checkout<T>(resource: unknown): Promise<T & ReactiveResource> {
  return (resource as ReactiveResource)[Checkout]();
}

/**
 * Forcibly commit all local changes on an editable resource to
 * the remote (immutable) version.
 *
 * This API should only be used cautiously. Typically a better
 * approach is for either the API or a Handler to reflect saved
 * changes back to update the cache.
 *
 * @public
 */
export function commit(record: ReactiveResource): Promise<void> {
  return record[Commit]();
}
