import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';

import type { Store } from '../../../index.ts';
import type { WarpDriveSignal } from '../../../store/-private.ts';
import { ARRAY_SIGNAL, consumeInternalSignal, entangleSignal, withSignalStore } from '../../../store/-private.ts';
import type { StableRecordIdentifier } from '../../../types/identifier.ts';
import type { ArrayValue, ObjectValue, Value } from '../../../types/json/raw.ts';
import type { OpaqueRecordInstance } from '../../../types/record.ts';
import type { ArrayField, HashField, SchemaArrayField } from '../../../types/schema/fields.ts';
import type { KindContext } from '../default-mode.ts';
import { ReactiveResource } from '../record.ts';
import type { SchemaService } from '../schema.ts';
import { Editable, Legacy, SOURCE } from '../symbols.ts';
import type { ProxiedMethod } from './extension.ts';
import { isExtensionProp, performArrayExtensionGet, performExtensionSet } from './extension.ts';

type KeyType = string | symbol | number;
const ARRAY_GETTER_METHODS = new Set<KeyType>([
  Symbol.iterator,
  'concat',
  'entries',
  'every',
  'fill',
  'filter',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'forEach',
  'includes',
  'indexOf',
  'join',
  'keys',
  'lastIndexOf',
  'map',
  'reduce',
  'reduceRight',
  'slice',
  'some',
  'values',
]);
// const ARRAY_SETTER_METHODS = new Set<KeyType>(['push', 'pop', 'unshift', 'shift', 'splice', 'sort']);
const SYNC_PROPS = new Set<KeyType>(['[]', 'length']);
function isArrayGetter<T>(prop: KeyType): prop is keyof Array<T> {
  return ARRAY_GETTER_METHODS.has(prop);
}
const ARRAY_SETTER_METHODS = new Set<KeyType>(['push', 'pop', 'unshift', 'shift', 'splice', 'sort']);

function isArraySetter<T>(prop: KeyType): prop is keyof Array<T> {
  return ARRAY_SETTER_METHODS.has(prop);
}

// function isSelfProp<T extends object>(self: T, prop: KeyType): prop is keyof T {
//   return prop in self;
// }

function convertToInt(prop: KeyType): number | null {
  if (typeof prop === 'symbol') return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

type ForEachCB = (record: OpaqueRecordInstance, index: number, context: typeof Proxy<unknown[]>) => void;
function safeForEach(
  instance: typeof Proxy<unknown[]>,
  arr: unknown[],
  store: Store,
  callback: ForEachCB,
  target: unknown
) {
  if (target === undefined) {
    target = null;
  }
  // clone to prevent mutation
  arr = arr.slice();
  assert('`forEach` expects a function as first argument.', typeof callback === 'function');

  // because we retrieveLatest above we need not worry if array is mutated during iteration
  // by unloadRecord/rollbackAttributes
  // push/add/removeObject may still be problematic
  // but this is a more traditionally expected forEach bug.
  const length = arr.length; // we need to access length to ensure we are consumed

  for (let index = 0; index < length; index++) {
    callback.call(target, arr[index], index, instance);
  }

  return instance;
}

export interface ManagedArray extends Omit<Array<unknown>, '[]'> {
  [SOURCE]: unknown[];
  identifier: StableRecordIdentifier;
  path: string | string[];
  owner: ReactiveResource;
  [ARRAY_SIGNAL]: WarpDriveSignal;
  [Editable]: boolean;
  [Legacy]: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ManagedArray {
  constructor(context: KindContext<SchemaArrayField | ArrayField>, owner: ReactiveResource, data: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this[SOURCE] = data?.slice();
    const IS_EDITABLE = (this[Editable] = context.editable ?? false);
    this[Legacy] = context.legacy;
    const schema = context.store.schema as SchemaService;
    const cache = context.store.cache;

    const signals = withSignalStore(this);
    let _SIGNAL: WarpDriveSignal = null as unknown as WarpDriveSignal;
    const boundFns = new Map<KeyType, ProxiedMethod>();
    this.identifier = context.resourceKey;
    this.path = context.path;
    this.owner = owner;
    let transaction = false;
    type StorageKlass = typeof WeakMap<object, WeakRef<ReactiveResource>>;
    const mode = (context.field as SchemaArrayField).options?.key ?? '@identity';
    const RefStorage: StorageKlass =
      mode === '@identity'
        ? (WeakMap as unknown as StorageKlass)
        : // CAUTION CAUTION CAUTION
          // this is a pile of lies
          // the Map is Map<string, WeakRef<ReactiveResource>>
          // but TS does not understand how to juggle modes like this
          // internal to a method like ours without us duplicating the code
          // into two separate methods.
          Map<object, WeakRef<ReactiveResource>>;
    const ManagedRecordRefs = context.field.kind === 'schema-array' ? new RefStorage() : null;
    const extensions = context.legacy ? schema.CAUTION_MEGA_DANGER_ZONE_arrayExtensions(context.field) : null;
    const proxy = new Proxy(this[SOURCE], {
      get<R extends typeof Proxy<unknown[]>>(target: unknown[], prop: keyof R, receiver: R) {
        if (prop === ARRAY_SIGNAL) {
          return _SIGNAL;
        }
        if (prop === 'identifier') {
          return self.identifier;
        }
        if (prop === 'owner') {
          return self.owner;
        }

        const index = convertToInt(prop);
        if (_SIGNAL.isStale && (index !== null || SYNC_PROPS.has(prop) || isArrayGetter(prop))) {
          _SIGNAL.isStale = false;
          const newData = cache.getAttr(context.resourceKey, context.path);
          if (newData && newData !== self[SOURCE]) {
            self[SOURCE].length = 0;
            self[SOURCE].push(...(newData as ArrayValue));
          }
        }

        if (prop === 'length') {
          return consumeInternalSignal(_SIGNAL), target.length;
        }
        if (prop === '[]') return consumeInternalSignal(_SIGNAL), receiver;

        if (index !== null) {
          let val;
          if (mode === '@hash') {
            val = target[index];
            const hashField = schema.resource({ type: context.field.type! }).identity as HashField;
            const hashFn = schema.hashFn(hashField);
            val = hashFn(val as object, null, null);
          } else {
            // if mode is not @identity or @index, then access the key path.
            // we should assert that `mode` is a string
            // it should read directly from the cache value for that field (e.g. no derivation, no transformation)
            // and, we likely should lookup the associated field and throw an error IF
            // the given field does not exist OR
            // the field is anything other than a GenericField or LegacyAttributeField.
            if (mode !== '@identity' && mode !== '@index') {
              assert('mode must be a string', typeof mode === 'string');
              const modeField = schema.resource({ type: context.field.type! }).fields.find((f) => f.name === mode);
              assert('field must exist in schema', modeField);
              assert(
                'field must be a GenericField or LegacyAttributeField',
                modeField.kind === 'field' || modeField.kind === 'attribute'
              );
            }
            val =
              mode === '@identity'
                ? target[index]
                : mode === '@index'
                  ? '@index'
                  : (target[index] as ObjectValue)[mode];
          }

          if (context.field.kind === 'schema-array') {
            if (!transaction) {
              consumeInternalSignal(_SIGNAL);
            }

            if (val) {
              const recordRef = ManagedRecordRefs!.get(val);
              let record = recordRef?.deref();

              if (!record) {
                const recordPath = context.path.slice();
                // this is a dirty lie since path is string[] but really we
                // should change the types for paths to `Array<string | number>`
                // TODO we should allow the schema for the field to define a "key"
                // for stability. Default should be `@identity` which means that
                // same object reference from cache should result in same ReactiveResource
                // embedded object.
                recordPath.push(index as unknown as string);

                record = new ReactiveResource({
                  store: context.store,
                  resourceKey: context.resourceKey,
                  modeName: context.modeName,
                  legacy: context.legacy,
                  editable: context.editable,
                  path: recordPath,
                  field: context.field,
                });

                // if mode is not @identity or @index, then access the key path now
                // to determine the key value.
                // chris says we can implement this as a special kind `@hash` which
                // would be a function that only has access to the cache value and not
                // the record itself, so derivation is possible but intentionally limited
                // and non-reactive?
                ManagedRecordRefs!.set(val, new WeakRef(record));
              } else {
                // TODO update embeddedPath if required
              }
              return record;
            }

            return val;
          }

          if (!transaction) {
            consumeInternalSignal(_SIGNAL);
          }
          if (context.field.type) {
            const transform = schema.transformation(context.field);
            return transform.hydrate(val as Value, context.field.options ?? null, self.owner);
          }
          return val;
        }

        if (isArrayGetter(prop)) {
          let fn = boundFns.get(prop);

          if (fn === undefined) {
            if (prop === 'forEach') {
              fn = function () {
                consumeInternalSignal(_SIGNAL);
                transaction = true;
                const result = safeForEach(receiver, target, context.store, arguments[0] as ForEachCB, arguments[1]);
                transaction = false;
                return result;
              };
            } else {
              fn = function () {
                consumeInternalSignal(_SIGNAL);
                // array functions must run through Reflect to work properly
                // binding via other means will not work.
                transaction = true;
                const result = Reflect.apply(target[prop] as ProxiedMethod, receiver, arguments) as unknown;
                transaction = false;
                return result;
              };
            }
            boundFns.set(prop, fn);
          }
          return fn;
        }

        if (isArraySetter(prop)) {
          let fn = boundFns.get(prop);

          if (fn === undefined) {
            fn = function () {
              if (!IS_EDITABLE) {
                throw new Error(
                  `Mutating this array via ${String(prop)} is not allowed because the record is not editable`
                );
              }
              consumeInternalSignal(_SIGNAL);
              transaction = true;
              const result = Reflect.apply(target[prop] as ProxiedMethod, receiver, arguments) as unknown;
              transaction = false;
              return result;
            };
            boundFns.set(prop, fn);
          }
          return fn;
        }

        if (isExtensionProp(extensions, prop)) {
          return performArrayExtensionGet(
            receiver,
            extensions!,
            signals,
            prop,
            _SIGNAL,
            boundFns,
            (v: boolean) => void (transaction = v)
          );
        }

        return Reflect.get(target, prop, receiver);
      },
      set(target, prop: KeyType, value: unknown, receiver: object) {
        if (!IS_EDITABLE) {
          let errorPath = context.resourceKey.type;
          if (context.path) {
            errorPath = context.path[context.path.length - 1];
          }
          throw new Error(`Cannot set ${String(prop)} on ${errorPath} because the record is not editable`);
        }
        if (prop === 'identifier') {
          self.identifier = value as StableRecordIdentifier;
          return true;
        }
        if (prop === 'owner') {
          self.owner = value as ReactiveResource;
          return true;
        }

        if (isExtensionProp(extensions, prop)) {
          return performExtensionSet(receiver, extensions!, signals, prop, value);
        }

        const reflect = Reflect.set(target, prop, value, receiver);

        if (reflect) {
          if (!context.field.type) {
            cache.setAttr(context.resourceKey, context.path, self[SOURCE] as Value);
            _SIGNAL.isStale = true;
            return true;
          }

          let rawValue = self[SOURCE] as ArrayValue;
          if (context.field.kind !== 'schema-array') {
            const transform = schema.transformation(context.field);
            if (!transform) {
              throw new Error(
                `No '${context.field.type}' transform defined for use by ${context.resourceKey.type}.${String(prop)}`
              );
            }
            rawValue = (self[SOURCE] as ArrayValue).map((item) =>
              transform.serialize(item, context.field.options ?? null, self.owner)
            );
          }
          cache.setAttr(context.resourceKey, context.path, rawValue as Value);
          _SIGNAL.isStale = true;
        }
        return reflect;
      },
      has(target, prop) {
        if (prop === 'identifier' || prop === 'owner' || prop === ARRAY_SIGNAL) {
          return true;
        }
        return Reflect.has(target, prop);
      },
    }) as ManagedArray;

    // we entangle the signal on the returned proxy since that is
    // the object that other code will be interfacing with.
    _SIGNAL = entangleSignal(signals, proxy, ARRAY_SIGNAL, undefined);

    return proxy;
  }
}

// this will error if someone tries to call
// A(identifierArray) since it is not configurable
// which is preferable to the `meta` override we used
// before which required importing all of Ember
const desc = {
  enumerable: true,
  configurable: false,
  get: function () {
    // here to support computed chains
    // and {{#each}}
    if (DEPRECATE_COMPUTED_CHAINS) {
      return this;
    }
  },
};
// compat(desc);
Object.defineProperty(ManagedArray.prototype, '[]', desc);
