import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/core/build-config/deprecations';
import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { ExtensionDef } from '../../../reactive.ts';
import { Context } from '../../../reactive/-private.ts';
import {
  isExtensionProp,
  performArrayExtensionGet,
  performExtensionSet,
} from '../../../reactive/-private/fields/extension.ts';
import type { BaseFinderOptions } from '../../../types';
import { getOrSetGlobal } from '../../../types/-private.ts';
import type { LocalRelationshipOperation } from '../../../types/graph.ts';
import type { StableDocumentIdentifier, StableRecordIdentifier } from '../../../types/identifier.ts';
import type { TypeFromInstanceOrString } from '../../../types/record.ts';
import type { ImmutableRequestInfo } from '../../../types/request.ts';
import type { LegacyHasManyField, LinksModeHasManyField } from '../../../types/schema/fields.ts';
import type { Links, PaginationLinks } from '../../../types/spec/json-api-raw.ts';
import type { OpaqueRecordInstance } from '../../-types/q/record-instance.ts';
import { isStableIdentifier } from '../caches/identifier-cache.ts';
import { recordIdentifierFor } from '../caches/instance-cache.ts';
import type { RecordArrayManager } from '../managers/record-array-manager.ts';
import type { SignalStore, WarpDriveSignal } from '../new-core-tmp/reactivity/internal.ts';
import {
  ARRAY_SIGNAL,
  consumeInternalSignal,
  notifyInternalSignal,
  withSignalStore,
} from '../new-core-tmp/reactivity/internal.ts';
import { defineSignal, entangleSignal } from '../new-core-tmp/reactivity/signal.ts';
import type { Store } from '../store-service.ts';
import { NativeProxy } from './native-proxy-type-fix.ts';

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
const ARRAY_SETTER_METHODS = new Set<KeyType>(['push', 'pop', 'unshift', 'shift', 'splice', 'sort']);
const SYNC_PROPS = new Set<KeyType>(['[]', 'length', 'links', 'meta']);
function isArrayGetter<T>(prop: KeyType): prop is keyof Array<T> {
  return ARRAY_GETTER_METHODS.has(prop);
}
function isArraySetter<T>(prop: KeyType): prop is keyof Array<T> {
  return ARRAY_SETTER_METHODS.has(prop);
}

export const SOURCE: '___(unique) Symbol(#source)' = getOrSetGlobal('#source', Symbol('#source'));
export const MUTATE: '___(unique) Symbol(#update)' = getOrSetGlobal('#update', Symbol('#update'));
const IS_COLLECTION: '___(unique) Symbol(IS_COLLECTION)' = getOrSetGlobal('IS_COLLECTION', Symbol.for('Collection'));

function convertToInt(prop: KeyType): number | null {
  if (typeof prop === 'symbol') return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

type ProxiedMethod = (...args: unknown[]) => unknown;

export type IdentifierArrayCreateOptions<T = unknown> = {
  identifiers: StableRecordIdentifier<TypeFromInstanceOrString<T>>[];
  type?: TypeFromInstanceOrString<T>;
  store: Store;
  allowMutation: boolean;
  manager: MinimumManager;
  field?: LegacyHasManyField | LinksModeHasManyField;
  links?: Links | PaginationLinks | null;
  meta?: Record<string, unknown> | null;
  identifier?: StableDocumentIdentifier | null;
  [MUTATE]?(
    target: StableRecordIdentifier[],
    receiver: typeof NativeProxy<StableRecordIdentifier[], T[]>,
    prop: string,
    args: unknown[],
    _SIGNAL: WarpDriveSignal
  ): unknown;
};

interface PrivateState {
  links: Links | PaginationLinks | null;
  meta: Record<string, unknown> | null;
}
type ForEachCB<T> = (record: T, index: number, context: typeof NativeProxy<StableRecordIdentifier[], T[]>) => void;
function safeForEach<T>(
  instance: typeof NativeProxy<StableRecordIdentifier[], T[]>,
  arr: StableRecordIdentifier[],
  store: Store,
  callback: ForEachCB<T>,
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
    callback.call(target, store._instanceCache.getRecord(arr[index]) as T, index, instance);
  }

  return instance;
}

type PromiseTo<T> = Omit<Promise<T>, typeof Symbol.toStringTag>;

type PromiseManyArray<T> = {
  length: number;
  content: IdentifierArray<T> | null;
  promise: Promise<IdentifierArray<T>> | null;
} & PromiseTo<IdentifierArray<T>>;

export type MinimumManager = {
  _syncArray: (array: IdentifierArray) => void;
  mutate?(mutation: LocalRelationshipOperation): void;
  reloadHasMany?<T>(key: string, options?: BaseFinderOptions): Promise<IdentifierArray<T>> | PromiseManyArray<T>;
};

/**
  A record array is an array that contains records of a certain type (or modelName).
  The record array materializes records as needed when they are retrieved for the first
  time. You should not create record arrays yourself. Instead, an instance of
  `RecordArray` or its subclasses will be returned by your application's store
  in response to queries.

  This class should not be imported and instantiated by consuming applications.

  @class RecordArray
  @public
*/
export interface IdentifierArray<T = unknown> extends Omit<Array<T>, '[]'> {
  [IS_COLLECTION]: boolean;
  [ARRAY_SIGNAL]: WarpDriveSignal;
  [SOURCE]: StableRecordIdentifier[];
}

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
  '_inverseIsAsync',
  'key',
  'DEPRECATED_CLASS_NAME',
];

interface ArrayContext {
  identifier: StableDocumentIdentifier | null;
  field: LegacyHasManyField | LinksModeHasManyField | null;
  SIGNAL: WarpDriveSignal;
  transaction: boolean;
  store: Store;
  manager: MinimumManager;
  editable: boolean;
  boundFns: Map<KeyType, ProxiedMethod>;
  data: PrivateState;
  extensions: Map<string | symbol, ExtensionDef> | null;
  signals: SignalStore;
  SOURCE: StableRecordIdentifier[];
  MUTATE(
    target: StableRecordIdentifier[],
    receiver: typeof NativeProxy<StableRecordIdentifier[], unknown[]>,
    prop: string,
    args: unknown[],
    _SIGNAL: WarpDriveSignal
  ): unknown;
}

const ArrayHandler = {
  get<R extends typeof NativeProxy<StableRecordIdentifier[], unknown[]>>(
    target: StableRecordIdentifier[],
    prop: keyof R,
    receiver: R
  ): unknown {
    // @ts-expect-error this is our side-channel for data
    const CONTEXT = target[Context] as unknown as ArrayContext;
    const index = convertToInt(prop);
    if (CONTEXT.SIGNAL.isStale && (index !== null || SYNC_PROPS.has(prop) || isArrayGetter(prop))) {
      CONTEXT.manager._syncArray(receiver as unknown as IdentifierArray);
      CONTEXT.SIGNAL.isStale = false;
    }

    if (index !== null) {
      const identifier = target[index];
      if (!CONTEXT.transaction) {
        consumeInternalSignal(CONTEXT.SIGNAL);
      }
      return identifier && CONTEXT.store._instanceCache.getRecord(identifier);
    }

    if (prop === ARRAY_SIGNAL) {
      return CONTEXT.SIGNAL;
    }

    if (prop === 'length') {
      return consumeInternalSignal(CONTEXT.SIGNAL), target.length;
    }

    if (prop === 'meta') return consumeInternalSignal(CONTEXT.SIGNAL), CONTEXT.data.meta;
    if (prop === 'links') return consumeInternalSignal(CONTEXT.SIGNAL), CONTEXT.data.links;
    if (prop === '[]') return consumeInternalSignal(CONTEXT.SIGNAL), receiver;

    if (isArrayGetter(prop)) {
      let fn = CONTEXT.boundFns.get(prop);

      if (fn === undefined) {
        if (prop === 'forEach') {
          fn = function () {
            consumeInternalSignal(CONTEXT.SIGNAL);
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
            consumeInternalSignal(CONTEXT.SIGNAL);
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
          const result = CONTEXT.MUTATE(target, receiver, prop as string, args, CONTEXT.SIGNAL);
          CONTEXT.transaction = false;
          return result;
        };

        CONTEXT.boundFns.set(prop, fn);
      }

      return fn;
    }

    if (prop === SOURCE) {
      return target;
    }

    if (prop === MUTATE) {
      let fn = CONTEXT.boundFns.get(prop);
      if (fn) return fn;

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const outcome = CONTEXT.MUTATE;

      fn = function () {
        consumeInternalSignal(CONTEXT.SIGNAL);
        // array functions must run through Reflect to work properly
        // binding via other means will not work.
        return Reflect.apply(outcome as ProxiedMethod, receiver, arguments) as unknown;
      };

      CONTEXT.boundFns.set(prop, fn);
      return fn;
    }

    if (isExtensionProp(CONTEXT.extensions, prop)) {
      return performArrayExtensionGet(
        receiver,
        CONTEXT.extensions!,
        CONTEXT.signals,
        prop,
        CONTEXT.SIGNAL,
        CONTEXT.boundFns,
        (v: boolean) => void (CONTEXT.transaction = v)
      );
    }

    return target[prop as keyof StableRecordIdentifier[]];
  },

  // FIXME: Should this get a generic like get above?
  set(
    target: StableRecordIdentifier[],
    prop: KeyType,
    value: unknown,
    receiver: typeof NativeProxy<StableRecordIdentifier[], unknown[]>
  ): boolean {
    // @ts-expect-error this is our side-channel for data
    const CONTEXT = target[Context] as unknown as ArrayContext;
    if (!CONTEXT.editable && !MUTABLE_PROPS.includes(prop as string)) {
      assert(`Mutating ${String(prop)} on this Array is not allowed.`, CONTEXT.editable);
      return false;
    }
    if (prop === 'length') {
      if (!CONTEXT.transaction && value === 0) {
        CONTEXT.transaction = true;
        CONTEXT.MUTATE(target, receiver, 'length 0', [], CONTEXT.SIGNAL);
        CONTEXT.transaction = false;
        return true;
      } else if (CONTEXT.transaction) {
        return Reflect.set(target, prop, value);
      } else {
        assert(`unexpected length set`);
      }
    }
    if (prop === 'links') {
      CONTEXT.data.links = (value || null) as PaginationLinks | Links | null;
      return true;
    }
    if (prop === 'meta') {
      CONTEXT.data.meta = (value || null) as Record<string, unknown> | null;
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
        assert(`Cannot set index ${index} past the end of the array.`, isStableIdentifier(identifier));
        target[index] = identifier;
        return true;
      }
      return false;
    }

    const original: StableRecordIdentifier | undefined = target[index];
    const newIdentifier = extractIdentifierFromRecord(value);
    assert(`Expected a record`, isStableIdentifier(newIdentifier));
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
      CONTEXT.MUTATE(target, receiver, 'replace cell', [index, original, newIdentifier], CONTEXT.SIGNAL);
    } else {
      target[index] = newIdentifier;
    }

    return true;
  },

  deleteProperty(target: StableRecordIdentifier[], prop: string | symbol): boolean {
    // @ts-expect-error this is our side-channel for data
    const CONTEXT = target[Context] as unknown as ArrayContext;
    assert(`Deleting keys on managed arrays is disallowed`, CONTEXT.transaction);
    if (!CONTEXT.transaction) {
      return false;
    }
    return Reflect.deleteProperty(target, prop);
  },

  getPrototypeOf() {
    return Array.prototype as unknown as IdentifierArray;
  },
};

export class IdentifierArray<T = unknown> {
  declare DEPRECATED_CLASS_NAME: string;
  /**
    The flag to signal a `RecordArray` is currently loading data.
    Example
    ```javascript
    let people = store.peekAll('person');
    people.isUpdating; // false
    people.update();
    people.isUpdating; // true
    ```
    @property isUpdating
    @public
    @type Boolean
  */
  declare isUpdating: boolean;
  isLoaded = true;
  isDestroying = false;
  isDestroyed = false;
  _updatingPromise: Promise<IdentifierArray<T>> | null = null;
  readonly identifier: StableDocumentIdentifier | null;

  declare links: Links | PaginationLinks | null;
  declare meta: Record<string, unknown> | null;
  declare modelName?: TypeFromInstanceOrString<T>;
  /**
    The store that created this record array.

    @property store
    @private
    @type Store
    */
  declare store: Store;
  declare _manager: MinimumManager;

  destroy(clear: boolean): void {
    this.isDestroying = !clear;
    // changing the reference breaks the Proxy
    // this[SOURCE] = [];
    this[SOURCE].length = 0;
    notifyInternalSignal(this[ARRAY_SIGNAL]);
    this.isDestroyed = !clear;
  }

  constructor(options: IdentifierArrayCreateOptions<T>) {
    this.modelName = options.type;
    this.store = options.store;
    this._manager = options.manager;
    this.identifier = options.identifier || null;
    this[SOURCE] = options.identifiers;
    this[IS_COLLECTION] = true;

    // we attach the signal storage to the class
    // so that its easier to find debugging.
    const signals = withSignalStore(this);
    const boundFns = new Map<KeyType, ProxiedMethod>();
    const PrivateState: PrivateState = {
      links: options.links || null,
      meta: options.meta || null,
    };

    const extensions =
      options.field && this.store.schema.CAUTION_MEGA_DANGER_ZONE_arrayExtensions
        ? this.store.schema.CAUTION_MEGA_DANGER_ZONE_arrayExtensions(options.field)
        : null;

    const context = {
      identifier: options.identifier || null,
      field: options.field || null,
      SIGNAL: null as unknown as WarpDriveSignal,
      transaction: false,
      store: options.store,
      manager: options.manager,
      editable: options.allowMutation,
      boundFns: boundFns,
      data: PrivateState,
      extensions,
      signals,
      SOURCE: options.identifiers,
      MUTATE: options[MUTATE] || (() => {}),
    } satisfies ArrayContext;
    // @ts-expect-error assigning a non-number prop to the array
    options.identifiers[Context] = context;

    const proxy = new NativeProxy<StableRecordIdentifier[], T[]>(this[SOURCE], ArrayHandler) as IdentifierArray<T>;

    if (DEBUG) {
      Object.defineProperty(this, '__SHOW_ME_THE_DATA_(debug mode only)__', {
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
    context.SIGNAL = entangleSignal(signals, proxy, ARRAY_SIGNAL, undefined);

    return proxy;
  }

  /**
    Used to get the latest version of all of the records in this array
    from the adapter.

    Example

    ```javascript
    let people = store.peekAll('person');
    people.isUpdating; // false

    people.update().then(function() {
      people.isUpdating; // false
    });

    people.isUpdating; // true
    ```

    @public
  */
  update(): Promise<IdentifierArray<T>> {
    if (this.isUpdating) {
      return this._updatingPromise!;
    }

    this.isUpdating = true;

    const updatingPromise = this._update();
    void updatingPromise.finally(() => {
      this._updatingPromise = null;
      if (this.isDestroying || this.isDestroyed) {
        return;
      }
      this.isUpdating = false;
    });

    this._updatingPromise = updatingPromise;

    return updatingPromise;
  }

  /*
    Update this Array and return a promise which resolves once the update
    is finished.
   */
  _update(): Promise<IdentifierArray<T>> {
    assert(`_update cannot be used with this array`, this.modelName);
    // @ts-expect-error typescript is unable to handle the complexity of
    //   T = unknown, modelName = string
    //   T extends TypedRecordInstance, modelName = TypeFromInstance<T>
    // both being valid options to pass through here.
    return this.store.findAll<T>(this.modelName, { reload: true });
  }

  // TODO deprecate
  /**
    Saves all of the records in the `RecordArray`.

    Example

    ```javascript
    let messages = store.peekAll('message');
    messages.forEach(function(message) {
      message.hasBeenSeen = true;
    });
    messages.save();
    ```

    @public
    @return {Promise<IdentifierArray>} promise
  */
  save(): Promise<IdentifierArray> {
    const promise = Promise.all(this.map((record) => this.store.saveRecord(record))).then(() => this);

    return promise;
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
Object.defineProperty(IdentifierArray.prototype, '[]', desc);

defineSignal(IdentifierArray.prototype, 'isUpdating', false);

export function createIdentifierArray<T = unknown>(options: IdentifierArrayCreateOptions<T>): IdentifierArray<T> {
  return new IdentifierArray<T>(options);
}

export type CollectionCreateOptions = IdentifierArrayCreateOptions & {
  manager: RecordArrayManager;
  query: ImmutableRequestInfo | Record<string, unknown> | null;
  isLoaded: boolean;
};

export class Collection<T = unknown> extends IdentifierArray<T> {
  query: ImmutableRequestInfo | Record<string, unknown> | null = null;
  declare _manager: RecordArrayManager;

  constructor(options: CollectionCreateOptions) {
    super(options as IdentifierArrayCreateOptions);
    this.query = options.query || null;
    this.isLoaded = options.isLoaded || false;
  }

  _update(): Promise<Collection<T>> {
    const { store, query } = this;

    // TODO save options from initial request?
    assert(`update cannot be used with this array`, this.modelName);
    assert(`update cannot be used with no query`, query);
    // @ts-expect-error typescript is unable to handle the complexity of
    //   T = unknown, modelName = string
    //   T extends TypedRecordInstance, modelName = TypeFromInstance<T>
    // both being valid options to pass through here.
    const promise = store.query<T>(this.modelName, query as Record<string, unknown>, { _recordArray: this });

    return promise;
  }

  destroy(clear: boolean): void {
    super.destroy(clear);
    this._manager._managed.delete(this);
    this._manager._pending.delete(this);
  }
}
// trick the proxy "in" check
Collection.prototype.query = null;

export function createCollection<T = unknown>(options: CollectionCreateOptions): Collection<T> {
  return new Collection<T>(options);
}

// Ensure instanceof works correctly
// Object.setPrototypeOf(IdentifierArray.prototype, Array.prototype);

type PromiseProxyRecord = { then(): void; content: OpaqueRecordInstance | null | undefined };

function assertRecordPassedToHasMany(record: OpaqueRecordInstance | PromiseProxyRecord) {
  assert(
    `All elements of a hasMany relationship must be instances of Model, you passed $${typeof record}`,
    (function () {
      try {
        recordIdentifierFor(record);
        return true;
      } catch {
        return false;
      }
    })()
  );
}

function extractIdentifierFromRecord(record: PromiseProxyRecord | OpaqueRecordInstance | null) {
  if (!record) {
    return null;
  }

  assertRecordPassedToHasMany(record);
  return recordIdentifierFor(record);
}
