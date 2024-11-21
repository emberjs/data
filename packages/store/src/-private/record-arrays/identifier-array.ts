/**
  @module @ember-data/store
*/
import { deprecate } from '@ember/debug';
import { get, set } from '@ember/object';
import { compare } from '@ember/utils';
import Ember from 'ember';

import { compat } from '@ember-data/tracking';
import type { Signal } from '@ember-data/tracking/-private';
import {
  addToTransaction,
  createArrayTags,
  createSignal,
  defineSignal,
  subscribe,
} from '@ember-data/tracking/-private';
import {
  DEPRECATE_A_USAGE,
  DEPRECATE_ARRAY_LIKE,
  DEPRECATE_COMPUTED_CHAINS,
  DEPRECATE_PROMISE_PROXIES,
  DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS,
} from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { TypeFromInstanceOrString } from '@warp-drive/core-types/record';
import type { ImmutableRequestInfo } from '@warp-drive/core-types/request';
import type { Links, PaginationLinks } from '@warp-drive/core-types/spec/json-api-raw';

import type { OpaqueRecordInstance } from '../../-types/q/record-instance';
import { isStableIdentifier } from '../caches/identifier-cache';
import { recordIdentifierFor } from '../caches/instance-cache';
import type { RecordArrayManager } from '../managers/record-array-manager';
import { promiseArray } from '../proxies/promise-proxies';
import type { Store } from '../store-service';
import { NativeProxy } from './native-proxy-type-fix';

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
function isSelfProp<T extends object>(self: T, prop: KeyType): prop is Exclude<keyof T, number> {
  return prop in self;
}

export const ARRAY_SIGNAL = getOrSetGlobal('#signal', Symbol('#signal'));
export const SOURCE = getOrSetGlobal('#source', Symbol('#source'));
export const MUTATE = getOrSetGlobal('#update', Symbol('#update'));
export const NOTIFY = getOrSetGlobal('#notify', Symbol('#notify'));
const IS_COLLECTION = getOrSetGlobal('IS_COLLECTION', Symbol.for('Collection'));

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

export type IdentifierArrayCreateOptions<T = unknown> = {
  identifiers: StableRecordIdentifier<TypeFromInstanceOrString<T>>[];
  type?: TypeFromInstanceOrString<T>;
  store: Store;
  allowMutation: boolean;
  manager: MinimumManager;
  links?: Links | PaginationLinks | null;
  meta?: Record<string, unknown> | null;
};

function deprecateArrayLike(className: string, fnName: string, replName: string) {
  deprecate(
    `The \`${fnName}\` method on the class ${className} is deprecated. Use the native array method \`${replName}\` instead.`,
    false,
    {
      id: 'ember-data:deprecate-array-like',
      until: '5.0',
      since: { enabled: '4.7', available: '4.7' },
      for: 'ember-data',
    }
  );
}

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

type MinimumManager = {
  _syncArray: (array: IdentifierArray) => void;
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
  [MUTATE]?(
    target: StableRecordIdentifier[],
    receiver: typeof NativeProxy<StableRecordIdentifier[], T[]>,
    prop: string,
    args: unknown[],
    _SIGNAL: Signal
  ): unknown;
}

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

  [IS_COLLECTION] = true;
  declare [ARRAY_SIGNAL]: Signal;
  [SOURCE]: StableRecordIdentifier[];
  [NOTIFY]() {
    notifyArray(this);
  }

  declare links: Links | PaginationLinks | null;
  declare meta: Record<string, unknown> | null;
  declare modelName?: TypeFromInstanceOrString<T>;

  /**
   The modelClass represented by this record array.

   @property type
    @public
    @deprecated
   @type {subclass of Model}
   */
  declare type: unknown;
  /**
    The store that created this record array.

    @property store
    @private
    @type Store
    */
  declare store: Store;
  declare _manager: MinimumManager;

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

  constructor(options: IdentifierArrayCreateOptions<T>) {
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

    const proxy = new NativeProxy<StableRecordIdentifier[], T[]>(this[SOURCE], {
      get<R extends typeof NativeProxy<StableRecordIdentifier[], T[]>>(
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
                const result = safeForEach(receiver, target, store, arguments[0] as ForEachCB<T>, arguments[1]);
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
          if (DEPRECATE_ARRAY_LIKE) {
            if (prop === 'firstObject') {
              deprecateArrayLike(self.DEPRECATED_CLASS_NAME, prop as string, '[0]');
              // @ts-expect-error adding MutableArray method calling index signature
              return receiver[0];
            } else if (prop === 'lastObject') {
              deprecateArrayLike(self.DEPRECATED_CLASS_NAME, prop as string, 'at(-1)');
              // @ts-expect-error adding MutableArray method calling index signature
              return receiver[receiver.length - 1];
            }
          }

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
        receiver: typeof NativeProxy<StableRecordIdentifier[], T[]>
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
            // @ts-expect-error not all properties are indeces and we can't safely cast
            self[prop] = value;
            return true;
          }
          return false;
        }

        if (!options.allowMutation) {
          assert(`Mutating ${String(prop)} on this Array is not allowed.`, options.allowMutation);
          return false;
        }

        const original: StableRecordIdentifier | undefined = target[index];
        const newIdentifier = extractIdentifierFromRecord(value);
        // FIXME this line was added on main and I'm not sure why
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
    }) as IdentifierArray<T>;

    if (DEPRECATE_A_USAGE) {
      const meta = Ember.meta(this);
      meta.hasMixin = (mixin: object) => {
        deprecate(`Do not call A() on EmberData RecordArrays`, false, {
          id: 'ember-data:no-a-with-array-like',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
          for: 'ember-data',
        });
        // @ts-expect-error ArrayMixin is more than a type
        if (mixin === NativeArray || mixin === ArrayMixin) {
          return true;
        }
        return false;
      };
    } else if (DEBUG) {
      const meta = Ember.meta(this);
      meta.hasMixin = (mixin: object) => {
        assert(`Do not call A() on EmberData RecordArrays`);
      };
    }

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
    Update this RecordArray and return a promise which resolves once the update
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

    @method save
    @public
    @return {Promise<IdentifierArray>} promise
  */
  save(): Promise<IdentifierArray<T>> {
    const promise = Promise.all(this.map((record) => this.store.saveRecord(record))).then(() => this);

    if (DEPRECATE_PROMISE_PROXIES) {
      // @ts-expect-error IdentifierArray is not a MutableArray
      return promiseArray<T, IdentifierArray<T>>(promise);
    }

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
compat(desc);
Object.defineProperty(IdentifierArray.prototype, '[]', desc);

defineSignal(IdentifierArray.prototype, 'isUpdating', false);

export default IdentifierArray;

if (DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS) {
  Object.defineProperty(IdentifierArray.prototype, 'type', {
    get() {
      deprecate(
        `Using RecordArray.type to access the ModelClass for a record is deprecated. Use store.modelFor(<modelName>) instead.`,
        false,
        {
          id: 'ember-data:deprecate-snapshot-model-class-access',
          until: '5.0',
          for: 'ember-data',
          since: { available: '4.5.0', enabled: '4.5.0' },
        }
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!this.modelName) {
        return null;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      return this.store.modelFor(this.modelName);
    },
  });
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

    if (DEPRECATE_PROMISE_PROXIES) {
      // @ts-expect-error Collection is not a MutableArray
      return promiseArray(promise);
    }

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
//Object.setPrototypeOf(IdentifierArray.prototype, Array.prototype);

if (DEPRECATE_ARRAY_LIKE) {
  IdentifierArray.prototype.DEPRECATED_CLASS_NAME = 'RecordArray';
  Collection.prototype.DEPRECATED_CLASS_NAME = 'RecordArray';
  const EmberObjectMethods = [
    'addObserver',
    'cacheFor',
    'decrementProperty',
    'get',
    'getProperties',
    'incrementProperty',
    'notifyPropertyChange',
    'removeObserver',
    'set',
    'setProperties',
    'toggleProperty',
  ] as const;
  EmberObjectMethods.forEach((method) => {
    // @ts-expect-error adding MutableArray method
    IdentifierArray.prototype[method] = function delegatedMethod(...args: unknown[]): unknown {
      deprecate(
        `The EmberObject ${method} method on the class ${this.DEPRECATED_CLASS_NAME} is deprecated. Use dot-notation javascript get/set access instead.`,
        false,
        {
          id: 'ember-data:deprecate-array-like',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
          for: 'ember-data',
        }
      );
      // @ts-expect-error ember is missing types for some methods
      return (Ember[method] as (...args: unknown[]) => unknown)(this, ...args);
    };
  });

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.addObject = function (obj: OpaqueRecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'addObject', 'push');
    const index = this.indexOf(obj);
    if (index === -1) {
      this.push(obj);
    }
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.addObjects = function (objs: OpaqueRecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'addObjects', 'push');
    objs.forEach((obj: OpaqueRecordInstance) => {
      const index = this.indexOf(obj);
      if (index === -1) {
        this.push(obj);
      }
    });
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.popObject = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'popObject', 'pop');
    return this.pop() as OpaqueRecordInstance;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.pushObject = function (obj: OpaqueRecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'pushObject', 'push');
    this.push(obj);
    return obj;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.pushObjects = function (objs: OpaqueRecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'pushObjects', 'push');
    this.push(...objs);
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.shiftObject = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'shiftObject', 'shift');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.shift()!;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.unshiftObject = function (obj: OpaqueRecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'unshiftObject', 'unshift');
    this.unshift(obj);
    return obj;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.unshiftObjects = function (objs: OpaqueRecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'unshiftObjects', 'unshift');
    this.unshift(...objs);
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.objectAt = function (index: number) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'objectAt', 'at');
    //For negative index values go back from the end of the array
    const arrIndex = Math.sign(index) === -1 ? this.length + index : index;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this[arrIndex];
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.objectsAt = function (indices: number[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'objectsAt', 'at');
    // @ts-expect-error adding MutableArray method
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return indices.map((index) => this.objectAt(index)!);
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.removeAt = function (index: number) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'removeAt', 'splice');
    this.splice(index, 1);
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.insertAt = function (index: number, obj: OpaqueRecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'insertAt', 'splice');
    this.splice(index, 0, obj);
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.removeObject = function (obj: OpaqueRecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'removeObject', 'splice');
    const index = this.indexOf(obj);
    if (index !== -1) {
      this.splice(index, 1);
    }
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.removeObjects = function (objs: OpaqueRecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'removeObjects', 'splice');
    objs.forEach((obj) => {
      const index = this.indexOf(obj);
      if (index !== -1) {
        this.splice(index, 1);
      }
    });
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.toArray = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'toArray', 'slice');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.slice();
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.replace = function (idx: number, amt: number, objects?: OpaqueRecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'replace', 'splice');
    if (objects) {
      this.splice(idx, amt, ...objects);
    } else {
      this.splice(idx, amt);
    }
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.clear = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'clear', 'length = 0');
    this.splice(0, this.length);
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.setObjects = function (objects: OpaqueRecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'setObjects', '`arr.length = 0; arr.push(objects);`');
    assert(
      `${this.DEPRECATED_CLASS_NAME}.setObjects expects to receive an array as its argument`,
      Array.isArray(objects)
    );
    this.splice(0, this.length);
    this.push(...objects);
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.reverseObjects = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'reverseObjects', 'reverse');
    this.reverse();
    return this;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.compact = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'compact', 'filter');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.filter((v) => v !== null && v !== undefined);
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.any = function (callback, target) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'any', 'some');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.some(callback, target);
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.isAny = function (prop, value) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'isAny', 'some');
    const hasValue = arguments.length === 2;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.some((v) => (hasValue ? v[prop] === value : v[prop] === true));
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.isEvery = function (prop, value) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'isEvery', 'every');
    const hasValue = arguments.length === 2;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.every((v) => (hasValue ? v[prop] === value : v[prop] === true));
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.getEach = function (key: string) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'getEach', 'map');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.map((value) => get(value, key));
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.mapBy = function (key: string) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'mapBy', 'map');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.map((value) => get(value, key));
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.findBy = function (key: string, value?: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'findBy', 'find');
    if (arguments.length === 2) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.find((val) => {
        return get(val, key) === value;
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.find((val) => Boolean(get(val, key)));
    }
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.filterBy = function (key: string, value?: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'filterBy', 'filter');
    if (arguments.length === 2) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.filter((record) => {
        return get(record, key) === value;
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.filter((record) => {
      return Boolean(get(record, key));
    });
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.sortBy = function (...sortKeys: string[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'sortBy', '.slice().sort');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.slice().sort((a, b) => {
      for (let i = 0; i < sortKeys.length; i++) {
        const key = sortKeys[i];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const propA = get(a, key);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const propB = get(b, key);
        // return 1 or -1 else continue to the next sortKey
        const compareValue = compare(propA, propB);

        if (compareValue) {
          return compareValue;
        }
      }
      return 0;
    });
  };

  // @ts-expect-error
  IdentifierArray.prototype.invoke = function (key: string, ...args: unknown[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'invoke', 'forEach');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.map((value) => (value[key] as (...args: unknown[]) => unknown)(...args));
  };

  // @ts-expect-error
  IdentifierArray.prototype.addArrayObserver = function () {
    deprecateArrayLike(
      this.DEPRECATED_CLASS_NAME,
      'addArrayObserver',
      'derived state or reacting at the change source'
    );
  };

  // @ts-expect-error
  IdentifierArray.prototype.removeArrayObserver = function () {
    deprecateArrayLike(
      this.DEPRECATED_CLASS_NAME,
      'removeArrayObserver',
      'derived state or reacting at the change source'
    );
  };

  // @ts-expect-error
  IdentifierArray.prototype.arrayContentWillChange = function () {
    deprecateArrayLike(
      this.DEPRECATED_CLASS_NAME,
      'arrayContentWillChange',
      'derived state or reacting at the change source'
    );
  };

  // @ts-expect-error
  IdentifierArray.prototype.arrayContentDidChange = function () {
    deprecateArrayLike(
      this.DEPRECATED_CLASS_NAME,
      'arrayContentDidChange',
      'derived state or reacting at the change source.'
    );
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.reject = function (callback, target?: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'reject', 'filter');
    assert('`reject` expects a function as first argument.', typeof callback === 'function');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.filter((...args) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return !callback.apply(target, args);
    });
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.rejectBy = function (key: string, value?: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'rejectBy', 'filter');
    if (arguments.length === 2) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.filter((record) => {
        return get(record, key) !== value;
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.filter((record) => {
      return !get(record, key);
    });
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.setEach = function (key: string, value: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'setEach', 'forEach');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.forEach((item) => set(item, key, value));
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.uniq = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'uniq', 'filter');
    // all current managed arrays are already enforced as unique
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.slice();
  };

  // @ts-expect-error
  IdentifierArray.prototype.uniqBy = function (key: string) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'uniqBy', 'filter');
    // all current managed arrays are already enforced as unique
    const seen = new Set();
    const result: OpaqueRecordInstance[] = [];
    this.forEach((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = get(item, key);
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
      result.push(item);
    });
    return result;
  };

  // @ts-expect-error adding MutableArray method
  IdentifierArray.prototype.without = function (value: OpaqueRecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'without', 'slice');
    const newArr = this.slice();
    const index = this.indexOf(value);
    if (index !== -1) {
      newArr.splice(index, 1);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return newArr;
  };

  // @ts-expect-error
  IdentifierArray.prototype.firstObject = null;
  // @ts-expect-error
  IdentifierArray.prototype.lastObject = null;
}

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

function extractIdentifierFromRecord(recordOrPromiseRecord: PromiseProxyRecord | OpaqueRecordInstance | null) {
  if (!recordOrPromiseRecord) {
    return null;
  }

  if (isPromiseRecord(recordOrPromiseRecord)) {
    const content = recordOrPromiseRecord.content;
    assert(
      'You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo relationship.',
      content !== undefined && content !== null
    );
    assertRecordPassedToHasMany(content);
    return recordIdentifierFor(content);
  }

  assertRecordPassedToHasMany(recordOrPromiseRecord);
  return recordIdentifierFor(recordOrPromiseRecord);
}

function isPromiseRecord(record: PromiseProxyRecord | OpaqueRecordInstance): record is PromiseProxyRecord {
  return Boolean(typeof record === 'object' && record && 'then' in record);
}
