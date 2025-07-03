import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { NotificationType, Store } from '../../index.ts';
import type { RelatedCollection as ManyArray } from '../../store/-private.ts';
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
import type { StableRecordIdentifier } from '../../types/identifier.ts';
import { STRUCTURED } from '../../types/request.ts';
import type {
  FieldSchema,
  GenericField,
  IdentityField,
  SchemaArrayField,
  SchemaObjectField,
} from '../../types/schema/fields.ts';
import { RecordStore } from '../../types/symbols.ts';
import type { ModeName } from './default-mode.ts';
import { DefaultMode } from './default-mode.ts';
import { computeHasMany, peekManagedArray, peekManagedObject } from './fields/compute.ts';
import type { ProxiedMethod } from './fields/extension.ts';
import { isExtensionProp, performExtensionSet, performObjectExtensionGet } from './fields/extension.ts';
import { getFieldCacheKey } from './fields/get-field-key.ts';
import type { SchemaService } from './schema.ts';
import { Checkout, Destroy, Editable, EmbeddedField, EmbeddedPath, Identifier, Legacy, Parent } from './symbols.ts';

export { Editable, Legacy, Checkout } from './symbols';
const IgnoredGlobalFields = new Set<string>(['length', 'nodeType', 'then', 'setInterval', 'document', STRUCTURED]);
const symbolList = [Destroy, RecordStore, Identifier, Editable, Parent, Checkout, Legacy, EmbeddedPath, EmbeddedField];
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

const Editables = new WeakMap<ReactiveResource, ReactiveResource>();

export interface ReactiveResource {
  [Symbol.toStringTag]: `ReactiveResource<${string}>`;

  /** @internal */
  [RecordStore]: Store;
  /** @internal */
  [Identifier]: StableRecordIdentifier;
  /** @internal */
  [Parent]: StableRecordIdentifier;
  /** @internal */
  [EmbeddedField]: SchemaArrayField | SchemaObjectField | null;
  /** @internal */
  [EmbeddedPath]: string[] | null;
  /** @internal */
  [Editable]: boolean;
  /** @internal */
  [Legacy]: boolean;
  /** @internal */
  ___notifications: object;

  /** @internal */
  [Destroy](): void;

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
  [Checkout]<T>(): Promise<T>;
}

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
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ReactiveResource {
  constructor(
    store: Store,
    identifier: StableRecordIdentifier,
    mode: { name: ModeName; editable: boolean; legacy: boolean },
    isEmbedded = false,
    embeddedField: SchemaArrayField | SchemaObjectField | null = null,
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
    const IS_EDITABLE = (this[Editable] = mode.editable ?? false);
    this[Legacy] = mode.legacy ?? false;

    const schema = store.schema as unknown as SchemaService;
    const cache = store.cache;
    const ResourceSchema = schema.resource(isEmbedded ? (embeddedField as SchemaObjectField) : identifier);
    const identityField = ResourceSchema.identity;
    const BoundFns = new Map<string | symbol, ProxiedMethod>();

    // prettier-ignore
    const extensions =
      !mode.legacy ? null :
      isEmbedded ? schema.CAUTION_MEGA_DANGER_ZONE_objectExtensions(embeddedField!) :
      schema.CAUTION_MEGA_DANGER_ZONE_resourceExtensions(identifier);

    this[EmbeddedField] = embeddedField;
    this[EmbeddedPath] = embeddedPath;

    const fields: Map<string, FieldSchema> = isEmbedded
      ? schema.fields(embeddedField as SchemaObjectField)
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
          if (prop === Destroy) {
            return () => _DESTROY(receiver as unknown as ReactiveResource);
          }
          if (prop === Checkout) {
            return () => _CHECKOUT(receiver as unknown as ReactiveResource);
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

          if (isExtensionProp(extensions, prop)) {
            return performObjectExtensionGet(receiver, extensions!, signals, prop);
          }

          // too many things check for random symbols
          if (typeof prop === 'symbol') return undefined;

          assert(`No field named ${String(prop)} on ${isEmbedded ? embeddedField!.type : identifier.type}`);
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
        const propArray = isEmbedded ? embeddedPath!.slice() : [];
        // we use the field.name instead of prop here because we want to use the cache-path not
        // the record path.
        // SAFETY: we lie as string here because if we were to get null
        // we would be in a field kind that won't use the propArray below.
        const fieldCacheKey = getFieldCacheKey(field) as string;
        propArray.push(fieldCacheKey);

        switch (field.kind) {
          case '@id':
            entangleSignal(signals, receiver, '@identity', null);
          // eslint-disable-next-line no-fallthrough
          case '@hash':
          case '@local':
          case 'derived':
            return DefaultMode[field.kind as '@id'].get(
              store,
              receiver as unknown as ReactiveResource,
              identifier,
              field as IdentityField,
              propArray,
              mode
            );

          case 'field':
          case 'attribute':
          case 'schema-array':
          case 'array':
          case 'schema-object':
          case 'object':
          case 'resource':
          case 'belongsTo':
            entangleSignal(signals, receiver, fieldCacheKey, null);
            return DefaultMode[field.kind as 'field'].get(
              store,
              receiver as unknown as ReactiveResource,
              identifier,
              field as GenericField,
              propArray,
              mode
            );

          case 'hasMany':
            if (field.options.linksMode) {
              entangleSignal(signals, receiver, fieldCacheKey, null);

              return computeHasMany(
                store,
                schema,
                cache,
                target,
                identifier,
                field,
                propArray,
                mode.editable,
                mode.legacy
              );
            }
            assert(`Can only use hasMany fields when the resource is in legacy mode`, mode.legacy);
            entangleSignal(signals, receiver, fieldCacheKey, null);
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
          const type = isEmbedded ? embeddedField!.type : identifier.type;
          throw new Error(`Cannot set ${String(prop)} on ${type} because the record is not editable`);
        }

        const maybeField = prop === identityField?.name ? identityField : fields.get(prop as string);
        if (!maybeField) {
          const type = isEmbedded ? embeddedField!.type : identifier.type;

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
        const propArray = isEmbedded ? embeddedPath!.slice() : [];
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
            return DefaultMode[field.kind as '@id'].set(
              store,
              receiver as unknown as ReactiveResource,
              identifier,
              field as unknown as IdentityField,
              propArray,
              mode,
              value
            );

          default:
            return assertNeverField(field);
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

                  assert(`Can only use hasMany fields when the resource is in legacy mode`, mode.legacy);

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
}

function _CHECKOUT(record: ReactiveResource): Promise<ReactiveResource> {
  // IF we are already the editable record, throw an error
  if (record[Editable]) {
    throw new Error(`Cannot checkout an already editable record`);
  }

  const editable = Editables.get(record);
  if (editable) {
    return Promise.resolve(editable);
  }

  const embeddedType = record[EmbeddedField];
  const embeddedPath = record[EmbeddedPath];
  const isEmbedded = embeddedType !== null && embeddedPath !== null;

  if (isEmbedded) {
    throw new Error(`Cannot checkout an embedded record (yet)`);
  }

  const legacy = record[Legacy];
  const editableRecord = new ReactiveResource(
    record[RecordStore],
    record[Identifier],
    {
      name: legacy ? 'legacy' : 'polaris',
      editable: true,
      legacy: record[Legacy],
    },
    isEmbedded,
    embeddedType,
    embeddedPath
  );
  setRecordIdentifier(editableRecord, recordIdentifierFor(record));
  return Promise.resolve(editableRecord);
}

function _DESTROY(record: ReactiveResource): void {
  if (record[Legacy]) {
    // @ts-expect-error
    record.isDestroying = true;
    // @ts-expect-error
    record.isDestroyed = true;
  }
  record[RecordStore].notifications.unsubscribe(record.___notifications);
}

function assertNeverField(field: never): false {
  assert(`Cannot use unknown field kind ${(field as FieldSchema).kind}`);
  return false;
}
