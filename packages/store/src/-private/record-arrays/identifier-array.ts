/**
  @module @ember-data/store
*/
import { assert } from '@ember/debug';

import { compat } from '@ember-data/tracking';
import type { Signal } from '@ember-data/tracking/-private';
import {
  addToTransaction,
  createArrayTags,
  createSignal,
  defineSignal,
  subscribe,
} from '@ember-data/tracking/-private';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { ImmutableRequestInfo } from '@warp-drive/core-types/request';
import type { Links, PaginationLinks } from '@warp-drive/core-types/spec/raw';

import type { RecordInstance } from '../../-types/q/record-instance';
import { isStableIdentifier } from '../caches/identifier-cache';
import { recordIdentifierFor } from '../caches/instance-cache';
import type RecordArrayManager from '../managers/record-array-manager';
import type Store from '../store-service';

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
function isSelfProp<T extends object>(self: T, prop: KeyType): prop is keyof T {
  return prop in self;
}

export const ARRAY_SIGNAL = Symbol('#signal');
export const SOURCE = Symbol('#source');
export const MUTATE = Symbol('#update');
export const NOTIFY = Symbol('#notify');
const IS_COLLECTION = Symbol.for('Collection');

export function notifyArray(arr: IdentifierArray) {
  addToTransaction(arr[ARRAY_SIGNAL]);
}

function convertToInt(prop: KeyType): number | null {
  if (typeof prop === 'symbol') return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

type ProxiedMethod = (...args: unknown[]) => unknown;
declare global {
  interface ProxyConstructor {
    new <TSource extends object, TTarget extends object>(target: TSource, handler: ProxyHandler<TSource>): TTarget;
  }
}

export type IdentifierArrayCreateOptions = {
  identifiers: StableRecordIdentifier[];
  type?: string;
  store: Store;
  allowMutation: boolean;
  manager: RecordArrayManager;
  links?: Links | PaginationLinks | null;
  meta?: Record<string, unknown> | null;
};

interface PrivateState {
  links: Links | PaginationLinks | null;
  meta: Record<string, unknown> | null;
}
type ForEachCB = (record: RecordInstance, index: number, context: typeof Proxy<StableRecordIdentifier[]>) => void;
function safeForEach(
  instance: typeof Proxy<StableRecordIdentifier[]>,
  arr: StableRecordIdentifier[],
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
    callback.call(target, store._instanceCache.getRecord(arr[index]), index, instance);
  }

  return instance;
}

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
interface IdentifierArray extends Omit<Array<RecordInstance>, '[]'> {
  [MUTATE]?(
    target: StableRecordIdentifier[],
    receiver: typeof Proxy<StableRecordIdentifier[]>,
    prop: string,
    args: unknown[],
    _SIGNAL: Signal
  ): unknown;
}
class IdentifierArray {
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
  _updatingPromise: Promise<IdentifierArray> | null = null;

  [IS_COLLECTION] = true;
  declare [ARRAY_SIGNAL]: Signal;
  [SOURCE]: StableRecordIdentifier[];
  [NOTIFY]() {
    notifyArray(this);
  }

  declare links: Links | PaginationLinks | null;
  declare meta: Record<string, unknown> | null;
  declare modelName?: string;
  /**
    The store that created this record array.

    @property store
    @private
    @type Store
    */
  declare store: Store;
  declare _manager: RecordArrayManager;

  destroy(clear: boolean) {
    this.isDestroying = !clear;
    // changing the reference breaks the Proxy
    // this[SOURCE] = [];
    this[SOURCE].length = 0;
    this[NOTIFY]();
    this.isDestroyed = !clear;
  }

  // length must be on self for proxied methods to work properly
  @compat
  get length() {
    return this[SOURCE].length;
  }
  set length(value) {
    this[SOURCE].length = value;
  }

  constructor(options: IdentifierArrayCreateOptions) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.modelName = options.type;
    this.store = options.store;
    this._manager = options.manager;
    this[SOURCE] = options.identifiers;
    this[ARRAY_SIGNAL] = createSignal(this, 'length');
    const store = options.store;
    const boundFns = new Map<KeyType, ProxiedMethod>();
    const _SIGNAL = this[ARRAY_SIGNAL];
    const PrivateState: PrivateState = {
      links: options.links || null,
      meta: options.meta || null,
    };
    let transaction = false;

    // when a mutation occurs
    // we track all mutations within the call
    // and forward them as one

    const proxy = new Proxy<StableRecordIdentifier[], RecordInstance[]>(this[SOURCE], {
      get<R extends typeof Proxy<StableRecordIdentifier[]>>(
        target: StableRecordIdentifier[],
        prop: keyof R,
        receiver: R
      ): unknown {
        const index = convertToInt(prop);
        if (_SIGNAL.shouldReset && (index !== null || SYNC_PROPS.has(prop) || isArrayGetter(prop))) {
          options.manager._syncArray(receiver as unknown as IdentifierArray);
          _SIGNAL.t = false;
          _SIGNAL.shouldReset = false;
        }

        if (index !== null) {
          const identifier = target[index];
          if (!transaction) {
            subscribe(_SIGNAL);
          }
          return identifier && store._instanceCache.getRecord(identifier);
        }

        if (prop === 'meta') return subscribe(_SIGNAL), PrivateState.meta;
        if (prop === 'links') return subscribe(_SIGNAL), PrivateState.links;
        if (prop === '[]') return subscribe(_SIGNAL), receiver;

        if (isArrayGetter(prop)) {
          let fn = boundFns.get(prop);

          if (fn === undefined) {
            if (prop === 'forEach') {
              fn = function () {
                subscribe(_SIGNAL);
                transaction = true;
                const result = safeForEach(receiver, target, store, arguments[0] as ForEachCB, arguments[1]);
                transaction = false;
                return result;
              };
            } else {
              fn = function () {
                subscribe(_SIGNAL);
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
              // array functions must run through Reflect to work properly
              // binding via other means will not work.
              if (!options.allowMutation) {
                assert(`Mutating this array of records via ${String(prop)} is not allowed.`, options.allowMutation);
                return;
              }
              const args: unknown[] = Array.prototype.slice.call(arguments);
              assert(`Cannot start a new array transaction while a previous transaction is underway`, !transaction);
              transaction = true;
              const result = self[MUTATE]!(target, receiver, prop as string, args, _SIGNAL);
              transaction = false;
              return result;
            };

            boundFns.set(prop, fn);
          }

          return fn;
        }

        if (isSelfProp(self, prop)) {
          if (prop === NOTIFY || prop === ARRAY_SIGNAL || prop === SOURCE) {
            return self[prop];
          }

          let fn = boundFns.get(prop);
          if (fn) return fn;

          const outcome: unknown = self[prop];

          if (typeof outcome === 'function') {
            fn = function () {
              subscribe(_SIGNAL);
              // array functions must run through Reflect to work properly
              // binding via other means will not work.
              return Reflect.apply(outcome as ProxiedMethod, receiver, arguments) as unknown;
            };

            boundFns.set(prop, fn);
            return fn;
          }

          return subscribe(_SIGNAL), outcome;
        }

        return target[prop as keyof StableRecordIdentifier[]];
      },

      // FIXME: Should this get a generic like get above?
      set(
        target: StableRecordIdentifier[],
        prop: KeyType,
        value: unknown,
        receiver: typeof Proxy<StableRecordIdentifier[]>
      ): boolean {
        if (prop === 'length') {
          if (!transaction && value === 0) {
            transaction = true;
            self[MUTATE]!(target, receiver, 'length 0', [], _SIGNAL);
            transaction = false;
            return true;
          } else if (transaction) {
            return Reflect.set(target, prop, value);
          } else {
            assert(`unexpected length set`);
          }
        }
        if (prop === 'links') {
          PrivateState.links = (value || null) as PaginationLinks | Links | null;
          return true;
        }
        if (prop === 'meta') {
          PrivateState.meta = (value || null) as Record<string, unknown> | null;
          return true;
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
          if (index !== null && transaction) {
            const identifier = recordIdentifierFor(value);
            assert(`Cannot set index ${index} past the end of the array.`, isStableIdentifier(identifier));
            target[index] = identifier;
            return true;
          } else if (isSelfProp(self, prop)) {
            self[prop] = value;
            return true;
          }
          return false;
        }

        if (!options.allowMutation) {
          assert(`Mutating ${String(prop)} on this RecordArray is not allowed.`, options.allowMutation);
          return false;
        }

        const original: StableRecordIdentifier | undefined = target[index];
        const newIdentifier = extractIdentifierFromRecord(value);
        (target as unknown as Record<KeyType, unknown>)[index] = newIdentifier;
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
        if (!transaction) {
          self[MUTATE]!(target, receiver, 'replace cell', [index, original, newIdentifier], _SIGNAL);
        } else {
          target[index] = newIdentifier;
        }

        return true;
      },

      deleteProperty(target: StableRecordIdentifier[], prop: string | symbol): boolean {
        assert(`Deleting keys on managed arrays is disallowed`, transaction);
        if (!transaction) {
          return false;
        }
        return Reflect.deleteProperty(target, prop);
      },

      getPrototypeOf() {
        return IdentifierArray.prototype;
      },
    }) as IdentifierArray;

    createArrayTags(proxy, _SIGNAL);

    this[NOTIFY] = this[NOTIFY].bind(proxy);

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

    @method update
    @public
  */
  update(): Promise<IdentifierArray> {
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
    Update this RecordArray and return a promise which resolves once the update
    is finished.
   */
  _update(): Promise<IdentifierArray> {
    assert(`_update cannot be used with this array`, this.modelName);
    return this.store.findAll(this.modelName, { reload: true });
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

    @method save
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
    return this;
  },
};
compat(desc);
Object.defineProperty(IdentifierArray.prototype, '[]', desc);

defineSignal(IdentifierArray.prototype, 'isUpdating', false);

export default IdentifierArray;

export type CollectionCreateOptions = IdentifierArrayCreateOptions & {
  query: ImmutableRequestInfo | Record<string, unknown> | null;
  isLoaded: boolean;
};

export class Collection extends IdentifierArray {
  query: ImmutableRequestInfo | Record<string, unknown> | null = null;

  constructor(options: CollectionCreateOptions) {
    super(options as IdentifierArrayCreateOptions);
    this.query = options.query || null;
    this.isLoaded = options.isLoaded || false;
  }

  _update(): Promise<Collection> {
    const { store, query } = this;

    // TODO save options from initial request?
    assert(`update cannot be used with this array`, this.modelName);
    assert(`update cannot be used with no query`, query);
    const promise = store.query(this.modelName, query as Record<string, unknown>, { _recordArray: this });

    return promise;
  }

  destroy(clear: boolean) {
    super.destroy(clear);
    this._manager._managed.delete(this);
    this._manager._pending.delete(this);
  }
}
// trick the proxy "in" check
Collection.prototype.query = null;

// Ensure instanceof works correctly
// Object.setPrototypeOf(IdentifierArray.prototype, Array.prototype);

type PromiseProxyRecord = { then(): void; content: RecordInstance | null | undefined };

function assertRecordPassedToHasMany(record: RecordInstance | PromiseProxyRecord) {
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

function extractIdentifierFromRecord(record: PromiseProxyRecord | RecordInstance | null) {
  if (!record) {
    return null;
  }

  assertRecordPassedToHasMany(record);
  return recordIdentifierFor(record);
}
