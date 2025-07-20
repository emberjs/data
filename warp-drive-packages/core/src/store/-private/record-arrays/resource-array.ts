import { DEBUG } from '@warp-drive/build-config/env';
import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';

import type { ExtensionDef } from '../../../reactive.ts';
import { Context } from '../../../reactive/-private.ts';
import {
  isExtensionProp,
  performArrayExtensionGet,
  performExtensionSet,
} from '../../../reactive/-private/fields/extension.ts';
import { getOrSetGlobal } from '../../../types/-private.ts';
import type { ResourceKey, StableDocumentIdentifier } from '../../../types/identifier.ts';
import type { ObjectValue, Value } from '../../../types/json/raw.ts';
import type { CollectionField } from '../../../types/schema/fields.ts';
import type { OpaqueRecordInstance } from '../../-types/q/record-instance.ts';
import { recordIdentifierFor } from '../caches/instance-cache.ts';
import { isResourceKey } from '../managers/cache-key-manager.ts';
import type { SignalStore, WarpDriveSignal } from '../new-core-tmp/reactivity/internal.ts';
import {
  ARRAY_SIGNAL,
  consumeInternalSignal,
  createInternalSignal,
  notifyInternalSignal,
  Signals,
  withSignalStore,
} from '../new-core-tmp/reactivity/internal.ts';
import { createSignalDescriptor } from '../new-core-tmp/reactivity/signal.ts';
import type { Store } from '../store-service.ts';
import type { ForEachCB, KeyType, MinimumManager } from './-utils.ts';
import { convertToInt, isArrayGetter, isArraySetter, safeForEach } from './-utils.ts';
import { NativeProxy } from './native-proxy-type-fix.ts';

const IS_COLLECTION: '___(unique) Symbol(IS_COLLECTION)' = getOrSetGlobal('IS_COLLECTION', Symbol.for('Collection'));
function isContextProp(prop: string | symbol | number): prop is keyof ReactiveResourceArrayContext {
  return prop === 'destroy' || prop === 'isDestroying' || prop === 'isDestroyed';
}
type ProxiedMethod = (...args: unknown[]) => unknown;

// these are "internally" mutable, they should not be mutated by consumers
// though this is not currently enforced.
//
// all of these should become gated by field-type as they shouldn't be available
// on request results or non-legacy relationships.
const MUTABLE_PROPS = [
  '_updatingPromise',
  'isDestroying',
  'isDestroyed',
  'query',
  'isUpdating',
  'isLoaded',
  'meta',
  'links',
  'isAsync',
  'isPolymorphic',
  'identifier',
  'cache',
  'key',
  'DEPRECATED_CLASS_NAME',
];

interface ReactiveResourceArrayCreateOptions {
  // passed in
  store: Store;
  manager: MinimumManager;
  editable: boolean;
  source: ResourceKey[];

  // reactive, passed in
  data: ObjectValue | null;

  // non-reactive, passed in
  features: Record<string | symbol, unknown> | null;
  extensions: Map<string | symbol, ExtensionDef> | null;

  // not-accessible except by the context
  options: Record<string, unknown> | null;

  destroy: null | ((this: ReactiveResourceArray, clear: boolean) => void);
  mutate:
    | null
    | ((
        target: ResourceKey[],
        receiver: typeof NativeProxy<ResourceKey[], unknown[]>,
        prop: string,
        args: unknown[],
        _SIGNAL: WarpDriveSignal
      ) => unknown);
}

interface ReactiveResourceArrayContext extends ReactiveResourceArrayCreateOptions {
  destroy: (this: ReactiveResourceArray, clear: boolean) => void;
  mutate: (
    target: ResourceKey[],
    receiver: typeof NativeProxy<ResourceKey[], unknown[]>,
    prop: string,
    args: unknown[],
    _SIGNAL: WarpDriveSignal
  ) => unknown;

  // generated
  signals: SignalStore;
  signal: WarpDriveSignal;
  isDestroying: boolean;
  isDestroyed: boolean;
  transaction: boolean;
  boundFns: Map<KeyType, ProxiedMethod>;
}

export interface ReactiveResourceArray<T = unknown> extends Omit<Array<T>, '[]'> {
  /** @internal */
  isDestroying: boolean;
  /** @internal */
  isDestroyed: boolean;
  /** @internal */
  destroy: (this: ReactiveResourceArray, clear: boolean) => void;
  /** @internal */
  [IS_COLLECTION]: boolean;
  /** @internal */
  [Context]: ReactiveResourceArrayContext;
}

export interface TargetArray extends Array<ResourceKey> {
  /** @internal */
  [Context]: ReactiveResourceArrayContext;
}

// this will error if someone tries to call
// A(identifierArray) since it is not configurable
// which is preferable to the `meta` override we used
// before which required importing all of Ember
const ARR_BRACKET_DESC = {
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

const IS_UPDATING_DESC = createSignalDescriptor('isUpdating', false);
const ArrayHandler: ProxyHandler<ResourceKey[]> = {
  getOwnPropertyDescriptor<R extends typeof NativeProxy<ResourceKey[], unknown[]>>(target: TargetArray, prop: keyof R) {
    if (prop === '[]') {
      // proxies do not allow you to report a descriptor as non-configurable
      // if there is no descriptor or the underlying descriptor is configurable
      const underlying = Reflect.getOwnPropertyDescriptor(target, prop);
      if (!underlying) {
        Object.defineProperty(target, prop, ARR_BRACKET_DESC);
      }
      return ARR_BRACKET_DESC;
    }
    if (prop === 'isUpdating') {
      return IS_UPDATING_DESC;
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },

  get<R extends typeof NativeProxy<ResourceKey[], unknown[]>>(
    target: TargetArray,
    prop: keyof R,
    receiver: R
  ): unknown {
    const CONTEXT = target[Context];

    // we place this prop first as it needs initialized
    // prior to the signal check below
    if (prop === Signals) return CONTEXT.signals;

    const index = convertToInt(prop);
    if (
      // prettier-ignore
      CONTEXT.signal.isStale &&
      (
        index !== null ||
        prop === 'length' ||
        prop === '[]' ||
        (CONTEXT.data && prop in CONTEXT.data) ||
        isArrayGetter(prop)
      )
    ) {
      CONTEXT.manager._syncArray(receiver as unknown as ReactiveResourceArray);
      CONTEXT.signal.isStale = false;
    }

    if (index !== null) {
      const identifier = target[index];
      if (!CONTEXT.transaction) {
        consumeInternalSignal(CONTEXT.signal);
      }
      return identifier && CONTEXT.store._instanceCache.getRecord(identifier);
    }

    if (prop === 'length') return consumeInternalSignal(CONTEXT.signal), target.length;
    if (prop === '[]') return consumeInternalSignal(CONTEXT.signal), receiver;
    // TODO move this to ?? so its only on subclasses
    if (prop === 'isUpdating') return IS_UPDATING_DESC.get!.call(receiver);
    if (prop === IS_COLLECTION) return true;
    if (prop === Context) return CONTEXT;
    if (isContextProp(prop)) {
      return CONTEXT[prop];
    }

    if (CONTEXT.data && prop in CONTEXT.data) {
      // all props in data are reactive props.
      return consumeInternalSignal(CONTEXT.signal), CONTEXT.data[prop];
    }

    if (isArrayGetter(prop)) {
      let fn = CONTEXT.boundFns.get(prop);

      if (fn === undefined) {
        if (prop === 'forEach') {
          fn = function () {
            consumeInternalSignal(CONTEXT.signal);
            CONTEXT.transaction = true;
            const result = safeForEach(
              receiver,
              target,
              CONTEXT.store,
              arguments[0] as ForEachCB<unknown>,
              arguments[1]
            );
            CONTEXT.transaction = false;
            return result;
          };
        } else {
          fn = function () {
            consumeInternalSignal(CONTEXT.signal);
            // array functions must run through Reflect to work properly
            // binding via other means will not work.
            CONTEXT.transaction = true;
            const result = Reflect.apply(target[prop] as ProxiedMethod, receiver, arguments) as unknown;
            CONTEXT.transaction = false;
            return result;
          };
        }

        CONTEXT.boundFns.set(prop, fn);
      }

      return fn;
    }

    if (isArraySetter(prop)) {
      let fn = CONTEXT.boundFns.get(prop);

      if (fn === undefined) {
        fn = function () {
          // array functions must run through Reflect to work properly
          // binding via other means will not work.
          if (!CONTEXT.editable) {
            assert(`Mutating this array of records via ${String(prop)} is not allowed.`, CONTEXT.editable);
            return;
          }
          const args: unknown[] = Array.prototype.slice.call(arguments);
          assert(`Cannot start a new array transaction while a previous transaction is underway`, !CONTEXT.transaction);
          CONTEXT.transaction = true;
          const result = CONTEXT.mutate(target, receiver, prop as string, args, CONTEXT.signal);
          CONTEXT.transaction = false;
          return result;
        };

        CONTEXT.boundFns.set(prop, fn);
      }

      return fn;
    }

    if (CONTEXT.features && prop in CONTEXT.features) {
      let fn = CONTEXT.boundFns.get(prop);
      if (fn) return fn;

      // @ts-expect-error
      const outcome: unknown = CONTEXT.features[prop];

      if (typeof outcome === 'function') {
        fn = function () {
          consumeInternalSignal(CONTEXT.signal);
          // array functions must run through Reflect to work properly
          // binding via other means will not work.
          return Reflect.apply(outcome as ProxiedMethod, receiver, arguments) as unknown;
        };

        CONTEXT.boundFns.set(prop, fn);
        return fn;
      }

      return consumeInternalSignal(CONTEXT.signal), outcome;
    }

    if (isExtensionProp(CONTEXT.extensions, prop)) {
      return performArrayExtensionGet(
        receiver,
        CONTEXT.extensions!,
        CONTEXT.signals,
        prop,
        CONTEXT.signal,
        CONTEXT.boundFns,
        (v: boolean) => void (CONTEXT.transaction = v)
      );
    }

    return target[prop as keyof ResourceKey[]];
  },

  set(
    target: TargetArray,
    prop: KeyType,
    value: unknown,
    receiver: typeof NativeProxy<ResourceKey[], unknown[]>
  ): boolean {
    const CONTEXT = target[Context];
    if (prop === Signals) {
      CONTEXT.signals = value as SignalStore;
      return true;
    }

    if (!CONTEXT.editable && !MUTABLE_PROPS.includes(prop as string)) {
      assert(`Mutating ${String(prop)} on this Array is not allowed.`, CONTEXT.editable);
      return false;
    }
    if (prop === 'length') {
      if (!CONTEXT.transaction && value === 0) {
        CONTEXT.transaction = true;
        CONTEXT.mutate(target, receiver, 'length 0', [], CONTEXT.signal);
        CONTEXT.transaction = false;
        return true;
      } else if (CONTEXT.transaction) {
        return Reflect.set(target, prop, value);
      } else {
        assert(`unexpected length set`);
      }
    }

    if (isContextProp(prop)) {
      // @ts-expect-error
      CONTEXT[prop] = value;
      return true;
    }

    if (CONTEXT.data && prop in CONTEXT.data) {
      CONTEXT.data[prop as string] = (value || null) as Value;
      return true;
    }

    // TODO move this to subclass
    if (prop === 'isUpdating') {
      IS_UPDATING_DESC.set!.call(receiver, value);
      return true;
    }

    if (isExtensionProp(CONTEXT.extensions, prop)) {
      return performExtensionSet(receiver, CONTEXT.extensions!, CONTEXT.signals, prop, value);
    }

    const index = convertToInt(prop);

    // we do not allow "holey" arrays and so if the index is
    // greater than length then we will disallow setting it.
    // however, there is a special case for "unshift" with more than
    // one item being inserted since current items will be moved to the
    // new indices first.
    // we "loosely" detect this by just checking whether we are in
    // a transaction.
    if (index === null || index > target.length) {
      if (index !== null && CONTEXT.transaction) {
        const identifier = recordIdentifierFor(value);
        assert(`Cannot set index ${index} past the end of the array.`, isResourceKey(identifier));
        target[index] = identifier;
        return true;
      } else if (CONTEXT.features && prop in CONTEXT.features) {
        CONTEXT.features[prop] = value;
        return true;
      }
      return false;
    }

    const original: ResourceKey | undefined = target[index];
    const newIdentifier = extractIdentifierFromRecord(value);
    assert(`Expected a record`, newIdentifier && isResourceKey(newIdentifier));
    // We generate "transactions" whenever a setter method on the array
    // is called and might bulk update multiple array cells. Fundamentally,
    // all array operations decompose into individual cell replacements.
    // e.g. a push is really a "replace cell at next index with new value"
    // or a splice is "shift all values left/right by X and set out of new
    // bounds cells to undefined"
    //
    // so, if we are in a transaction, then this is not a user generated change
    // but one generated by a setter method. In this case we want to only apply
    // the change to the target array and not call the MUTATE method.
    // If there is no transaction though, then this means the user themselves has
    // directly changed the value of a specific index and we need to thus generate
    // a mutation for that change.
    // e.g. "arr.push(newVal)" is handled by a "addToRelatedRecords" mutation within
    // a transaction.
    // while "arr[arr.length] = newVal;" is handled by this replace cell code path.
    if (!CONTEXT.transaction) {
      CONTEXT.mutate(target, receiver, 'replace cell', [index, original, newIdentifier], CONTEXT.signal);
    } else {
      target[index] = newIdentifier;
    }

    return true;
  },

  deleteProperty(target: TargetArray, prop: string | symbol): boolean {
    const CONTEXT = target[Context];
    assert(`Deleting keys on managed arrays is disallowed`, CONTEXT.transaction);
    if (!CONTEXT.transaction) {
      return false;
    }
    return Reflect.deleteProperty(target, prop);
  },

  getPrototypeOf() {
    return Array.prototype as ReactiveResourceArray;
  },
};

const ILLEGAL_MUTATION = () => {
  assert(`ILLEGAL OPERATION: This ReactiveResourceArray is immutable`);
};

export function createReactiveResourceArray<T>(options: ReactiveResourceArrayCreateOptions): ReactiveResourceArray<T> {
  const TARGET = options.source as TargetArray;
  const context = {
    store: options.store,
    manager: options.manager,
    editable: options.editable,
    source: options.source,
    data: options.data,
    features: options.features,
    extensions: options.extensions,
    options: options.options,
    destroy: options.destroy || destroy,
    mutate: options.mutate || ILLEGAL_MUTATION,
    signals: null as unknown as SignalStore,
    signal: null as unknown as WarpDriveSignal,
    isDestroying: false,
    isDestroyed: false,
    transaction: false,
    boundFns: new Map(),
  } satisfies ReactiveResourceArrayContext;
  TARGET[Context] = context;

  const proxy = new NativeProxy<ResourceKey[], T[]>(TARGET, ArrayHandler) as ReactiveResourceArray<T>;
  if (DEBUG) {
    Object.defineProperty(TARGET, '__SHOW_ME_THE_DATA_(debug mode only)__', {
      enumerable: false,
      configurable: true,
      get() {
        return proxy.slice();
      },
    });
  }

  // we entangle the signal on the returned proxy since that is
  // the object that other code will be interfacing with.
  // when a mutation occurs
  // we track all mutations within the call
  // and forward them as one
  withSignalStore(proxy);
  context.signal = createInternalSignal(context.signals, proxy, ARRAY_SIGNAL, undefined);

  return proxy;
}

// Ensure instanceof works correctly
// Object.setPrototypeOf(IdentifierArray.prototype, Array.prototype);

function extractIdentifierFromRecord(record: OpaqueRecordInstance | null) {
  if (!record) {
    return null;
  }

  assert(
    `All elements of a ReactiveResourceArray must be instances of a ReactiveResource, you passed $${typeof record}`,
    (function () {
      try {
        recordIdentifierFor(record);
        return true;
      } catch {
        return false;
      }
    })()
  );

  return recordIdentifierFor(record);
}

export function destroy(this: ReactiveResourceArray, clear: boolean): void {
  const context = this[Context];
  this.isDestroying = !clear;
  // changing the reference breaks the Proxy
  // this[SOURCE] = [];
  context.source.length = 0;
  notifyInternalSignal(context.signal);
  this.isDestroyed = !clear;
}

export interface ReactiveRequestCollectionCreateArgs {
  // passed in
  store: Store;
  manager: MinimumManager;
  source: ResourceKey[];

  options: {
    requestKey: StableDocumentIdentifier;
  } | null;
}

export function createRequestCollection(config: ReactiveRequestCollectionCreateArgs): ReactiveResourceArray {
  return createReactiveResourceArray({
    store: config.store,
    manager: config.manager,
    editable: false,
    source: config.source,
    data: null,
    features: null,
    extensions: null,
    options: config.options,
    destroy: null,
    mutate: null,
  });
}

export interface ReactiveRelatedCollectionCreateArgs {
  // passed in
  store: Store;
  manager: MinimumManager;
  source: ResourceKey[];

  // not-accessible except by the context
  options: {
    resourceKey: ResourceKey;
    path: string[];
    field: CollectionField;
  };

  editable: boolean;
  extensions: Map<string | symbol, ExtensionDef> | null;
}

export function createRelatedCollection(config: ReactiveRelatedCollectionCreateArgs): ReactiveResourceArray {
  return createReactiveResourceArray({
    store: config.store,
    manager: config.manager,
    editable: config.editable,
    source: config.source,
    data: null,
    features: null,
    extensions: config.extensions,
    options: config.options,
    destroy: null,
    mutate: null,
  });
}
