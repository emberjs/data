/**
  @module @ember-data/store
*/
// @ts-expect-error
import { tagForProperty } from '@ember/-internals/metal';
import { assert, deprecate } from '@ember/debug';
import { get, set } from '@ember/object';
import { dependentKeyCompat } from '@ember/object/compat';
// eslint-disable-next-line no-restricted-imports
import { compare } from '@ember/utils';
import { tracked } from '@glimmer/tracking';
// @ts-expect-error
import { dirtyTag } from '@glimmer/validator';
import Ember from 'ember';

import { DEBUG } from '@ember-data/env';
import {
  DEPRECATE_A_USAGE,
  DEPRECATE_ARRAY_LIKE,
  DEPRECATE_COMPUTED_CHAINS,
  DEPRECATE_PROMISE_PROXIES,
  DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS,
} from '@ember-data/private-build-infra/current-deprecations';
import { ImmutableRequestInfo } from '@ember-data/request/-private/types';
import { addToTransaction, subscribe } from '@ember-data/tracking/-private';
import { Links, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import { Dict } from '@ember-data/types/q/utils';

import { recordIdentifierFor } from '../caches/instance-cache';
import type RecordArrayManager from '../managers/record-array-manager';
import { PromiseArray, promiseArray } from '../proxies/promise-proxies';
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
function isArrayGetter(prop: KeyType): boolean {
  return ARRAY_GETTER_METHODS.has(prop);
}
function isArraySetter(prop: KeyType): boolean {
  return ARRAY_SETTER_METHODS.has(prop);
}

export const IDENTIFIER_ARRAY_TAG = Symbol('#tag');
export const SOURCE = Symbol('#source');
export const MUTATE = Symbol('#update');
export const NOTIFY = Symbol('#notify');
const IS_COLLECTION = Symbol.for('Collection');

export function notifyArray(arr: IdentifierArray) {
  arr[IDENTIFIER_ARRAY_TAG].ref = null;

  if (DEPRECATE_COMPUTED_CHAINS) {
    // eslint-disable-next-line
    dirtyTag(tagForProperty(arr, 'length'));
    // eslint-disable-next-line
    dirtyTag(tagForProperty(arr, '[]'));
  }
}

function convertToInt(prop: KeyType): number | null {
  if (typeof prop === 'symbol') return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

class Tag {
  @tracked ref = null;
  declare shouldReset: boolean;
  /*
   * whether this was part of a transaction when last mutated
   */
  declare t: boolean;

  constructor() {
    this.shouldReset = false;
    this.t = false;
  }
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
  meta?: Dict<unknown> | null;
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
  meta: Dict<unknown> | null;
}
type ForEachCB = (record: RecordInstance, index: number, context: IdentifierArray) => void;
function safeForEach(
  instance: IdentifierArray,
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
  [MUTATE]?(prop: string, args: unknown[], result?: unknown): void;
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
  @tracked isUpdating: boolean = false;
  isLoaded: boolean = true;
  isDestroying: boolean = false;
  isDestroyed: boolean = false;
  _updatingPromise: PromiseArray<RecordInstance, IdentifierArray> | Promise<IdentifierArray> | null = null;

  [IS_COLLECTION] = true;
  [IDENTIFIER_ARRAY_TAG] = new Tag();
  [SOURCE]: StableRecordIdentifier[];
  [NOTIFY]() {
    notifyArray(this);
  }

  declare links: Links | PaginationLinks | null;
  declare meta: Dict<unknown> | null;

  /**
   The modelClass represented by this record array.

   @property type
    @public
    @deprecated
   @type {subclass of Model}
   */
  declare modelName?: string;
  /**
    The store that created this record array.

    @property store
    @private
    @type Store
    */
  declare store: Store;
  declare _manager: RecordArrayManager;

  destroy() {
    this.isDestroying = true;
    // changing the reference breaks the Proxy
    // this[SOURCE] = [];
    this[SOURCE].length = 0;
    this[NOTIFY]();
    this.isDestroyed = true;
  }

  // length must be on self for proxied methods to work properly
  @dependentKeyCompat
  get length() {
    return this[SOURCE].length;
  }
  set length(value) {
    this[SOURCE].length = value;
  }

  // here to support computed chains
  // and {{#each}}
  get '[]'() {
    if (DEPRECATE_COMPUTED_CHAINS) {
      return this;
    }
  }

  constructor(options: IdentifierArrayCreateOptions) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let self = this;
    this.modelName = options.type;
    this.store = options.store;
    this._manager = options.manager;
    this[SOURCE] = options.identifiers;
    const store = options.store;
    const boundFns = new Map<KeyType, ProxiedMethod>();
    const _TAG = this[IDENTIFIER_ARRAY_TAG];
    const PrivateState: PrivateState = {
      links: options.links || null,
      meta: options.meta || null,
    };
    let transaction: boolean = false;

    // when a mutation occurs
    // we track all mutations within the call
    // and forward them as one

    const proxy = new Proxy<StableRecordIdentifier[], RecordInstance[]>(this[SOURCE], {
      get(target: StableRecordIdentifier[], prop: KeyType, receiver: IdentifierArray): unknown {
        let index = convertToInt(prop);
        if (_TAG.shouldReset && (index !== null || SYNC_PROPS.has(prop) || isArrayGetter(prop))) {
          options.manager._syncArray(receiver as unknown as IdentifierArray);
          _TAG.t = false;
          _TAG.shouldReset = false;
        }

        if (index !== null) {
          const identifier = target[index];
          if (!transaction) {
            subscribe(_TAG);
          }
          return identifier && store._instanceCache.getRecord(identifier);
        }

        if (prop === 'meta') return subscribe(_TAG), PrivateState.meta;
        if (prop === 'links') return subscribe(_TAG), PrivateState.links;
        if (prop === '[]') return subscribe(_TAG), receiver;

        if (isArrayGetter(prop)) {
          let fn = boundFns.get(prop);

          if (fn === undefined) {
            if (prop === 'forEach') {
              fn = function () {
                subscribe(_TAG);
                transaction = true;
                let result = safeForEach(receiver, target, store, arguments[0] as ForEachCB, arguments[1]);
                transaction = false;
                return result;
              };
            } else {
              fn = function () {
                subscribe(_TAG);
                // array functions must run through Reflect to work properly
                // binding via other means will not work.
                transaction = true;
                let result = Reflect.apply(target[prop] as ProxiedMethod, receiver, arguments) as unknown;
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
              let result: unknown = Reflect.apply(target[prop] as ProxiedMethod, receiver, args);
              self[MUTATE]!(prop as string, args, result);
              addToTransaction(_TAG);
              // TODO handle cache updates
              transaction = false;
              return result;
            };

            boundFns.set(prop, fn);
          }

          return fn;
        }

        if (prop in self) {
          if (DEPRECATE_ARRAY_LIKE) {
            if (prop === 'firstObject') {
              deprecateArrayLike(self.DEPRECATED_CLASS_NAME, prop, '[0]');
              return receiver[0];
            } else if (prop === 'lastObject') {
              deprecateArrayLike(self.DEPRECATED_CLASS_NAME, prop, 'at(-1)');
              return receiver[receiver.length - 1];
            }
          }

          if (prop === NOTIFY || prop === IDENTIFIER_ARRAY_TAG || prop === SOURCE) {
            return self[prop];
          }

          let fn = boundFns.get(prop);
          if (fn) return fn;

          let outcome: unknown = self[prop];

          if (typeof outcome === 'function') {
            fn = function () {
              subscribe(_TAG);
              // array functions must run through Reflect to work properly
              // binding via other means will not work.
              return Reflect.apply(outcome as ProxiedMethod, receiver, arguments) as unknown;
            };

            boundFns.set(prop, fn);
            return fn;
          }

          return subscribe(_TAG), outcome;
        }

        return target[prop];
      },

      set(target: StableRecordIdentifier[], prop: KeyType, value: unknown /*, receiver */): boolean {
        if (prop === 'length') {
          if (!transaction && value === 0) {
            transaction = true;
            addToTransaction(_TAG);
            Reflect.set(target, prop, value);
            self[MUTATE]!('length 0', []);
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
          PrivateState.meta = (value || null) as Dict<unknown> | null;
          return true;
        }
        let index = convertToInt(prop);

        if (index === null || index > target.length) {
          if (prop in self) {
            self[prop] = value;
            return true;
          }
          return false;
        }

        if (!options.allowMutation) {
          assert(`Mutating ${String(prop)} on this RecordArray is not allowed.`, options.allowMutation);
          return false;
        }

        let original: StableRecordIdentifier | undefined = target[index];
        let newIdentifier = extractIdentifierFromRecord(value as RecordInstance);
        (target as unknown as Record<KeyType, unknown>)[index] = newIdentifier;
        if (!transaction) {
          self[MUTATE]!('replace cell', [index, original, newIdentifier]);
          addToTransaction(_TAG);
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

    if (DEPRECATE_A_USAGE) {
      const meta = Ember.meta(this);
      meta.hasMixin = (mixin: Object) => {
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
      meta.hasMixin = (mixin: Object) => {
        assert(`Do not call A() on EmberData RecordArrays`);
      };
    }

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
  update(): PromiseArray<RecordInstance, IdentifierArray> | Promise<IdentifierArray> {
    if (this.isUpdating) {
      return this._updatingPromise!;
    }

    this.isUpdating = true;

    let updatingPromise = this._update();
    updatingPromise.finally(() => {
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
  _update(): PromiseArray<RecordInstance, IdentifierArray> | Promise<IdentifierArray> {
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
    @return {PromiseArray} promise
  */
  save(): PromiseArray<RecordInstance, IdentifierArray> | Promise<IdentifierArray> {
    let promise = Promise.all(this.map((record) => this.store.saveRecord(record))).then(() => this);

    if (DEPRECATE_PROMISE_PROXIES) {
      return promiseArray<RecordInstance, IdentifierArray>(promise);
    }

    return promise;
  }
}

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
  query: ImmutableRequestInfo | Dict<unknown> | null;
  isLoaded: boolean;
};

export class Collection extends IdentifierArray {
  query: ImmutableRequestInfo | Dict<unknown> | null = null;

  constructor(options: CollectionCreateOptions) {
    super(options as IdentifierArrayCreateOptions);
    this.query = options.query || null;
    this.isLoaded = options.isLoaded || false;
  }

  _update(): PromiseArray<RecordInstance, Collection> | Promise<Collection> {
    const { store, query } = this;

    // TODO save options from initial request?
    assert(`update cannot be used with this array`, this.modelName);
    assert(`update cannot be used with no query`, query);
    const promise = store.query(this.modelName, query as Dict<unknown>, { _recordArray: this });

    if (DEPRECATE_PROMISE_PROXIES) {
      return promiseArray(promise);
    }
    return promise;
  }

  destroy() {
    super.destroy();
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
  ];
  EmberObjectMethods.forEach((method) => {
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
      return (Ember[method] as (...args: unknown[]) => unknown)(this, ...args);
    };
  });

  IdentifierArray.prototype.addObject = function (obj: RecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'addObject', 'push');
    let index = this.indexOf(obj);
    if (index === -1) {
      this.push(obj);
    }
    return this;
  };

  IdentifierArray.prototype.addObjects = function (objs: RecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'addObjects', 'push');
    objs.forEach((obj: RecordInstance) => {
      let index = this.indexOf(obj);
      if (index === -1) {
        this.push(obj);
      }
    });
    return this;
  };

  IdentifierArray.prototype.popObject = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'popObject', 'pop');
    return this.pop() as RecordInstance;
  };

  IdentifierArray.prototype.pushObject = function (obj: RecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'pushObject', 'push');
    this.push(obj);
    return obj;
  };

  IdentifierArray.prototype.pushObjects = function (objs: RecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'pushObjects', 'push');
    this.push(...objs);
    return this;
  };

  IdentifierArray.prototype.shiftObject = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'shiftObject', 'shift');
    return this.shift()!;
  };

  IdentifierArray.prototype.unshiftObject = function (obj: RecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'unshiftObject', 'unshift');
    this.unshift(obj);
    return obj;
  };

  IdentifierArray.prototype.unshiftObjects = function (objs: RecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'unshiftObjects', 'unshift');
    this.unshift(...objs);
    return this;
  };

  IdentifierArray.prototype.objectAt = function (index: number) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'objectAt', 'at');
    //For negative index values go back from the end of the array
    let arrIndex = Math.sign(index) === -1 ? this.length + index : index;
    return this[arrIndex];
  };

  IdentifierArray.prototype.objectsAt = function (indeces: number[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'objectsAt', 'at');
    return indeces.map((index) => this.objectAt(index)!);
  };

  IdentifierArray.prototype.removeAt = function (index: number) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'removeAt', 'splice');
    this.splice(index, 1);
    return this;
  };

  IdentifierArray.prototype.insertAt = function (index: number, obj: RecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'insertAt', 'splice');
    this.splice(index, 0, obj);
    return this;
  };

  IdentifierArray.prototype.removeObject = function (obj: RecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'removeObject', 'splice');
    const index = this.indexOf(obj);
    if (index !== -1) {
      this.splice(index, 1);
    }
    return this;
  };

  IdentifierArray.prototype.removeObjects = function (objs: RecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'removeObjects', 'splice');
    objs.forEach((obj) => {
      const index = this.indexOf(obj);
      if (index !== -1) {
        this.splice(index, 1);
      }
    });
    return this;
  };

  IdentifierArray.prototype.toArray = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'toArray', 'slice');
    return this.slice();
  };

  IdentifierArray.prototype.replace = function (idx: number, amt: number, objects?: RecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'replace', 'splice');
    if (objects) {
      this.splice(idx, amt, ...objects);
    } else {
      this.splice(idx, amt);
    }
  };

  IdentifierArray.prototype.clear = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'clear', 'length = 0');
    this.splice(0, this.length);
    return this;
  };

  IdentifierArray.prototype.setObjects = function (objects: RecordInstance[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'setObjects', '`arr.length = 0; arr.push(objects);`');
    assert(
      `${this.DEPRECATED_CLASS_NAME}.setObjects expects to receive an array as its argument`,
      Array.isArray(objects)
    );
    this.splice(0, this.length);
    this.push(...objects);
    return this;
  };

  IdentifierArray.prototype.reverseObjects = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'reverseObjects', 'reverse');
    this.reverse();
    return this;
  };

  IdentifierArray.prototype.compact = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'compact', 'filter');
    return this.filter((v) => v !== null && v !== undefined);
  };

  IdentifierArray.prototype.any = function (callback, target) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'any', 'some');
    return this.some(callback, target);
  };

  IdentifierArray.prototype.isAny = function (prop, value) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'isAny', 'some');
    let hasValue = arguments.length === 2;
    return this.some((v) => (hasValue ? v[prop] === value : v[prop] === true));
  };

  IdentifierArray.prototype.isEvery = function (prop, value) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'isEvery', 'every');
    let hasValue = arguments.length === 2;
    return this.every((v) => (hasValue ? v[prop] === value : v[prop] === true));
  };

  IdentifierArray.prototype.getEach = function (key: string) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'getEach', 'map');
    return this.map((value) => get(value, key));
  };

  IdentifierArray.prototype.mapBy = function (key: string) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'mapBy', 'map');
    return this.map((value) => get(value, key));
  };

  IdentifierArray.prototype.findBy = function (key: string, value?: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'findBy', 'find');
    if (arguments.length === 2) {
      return this.find((val) => {
        return get(val, key) === value;
      });
    } else {
      return this.find((val) => Boolean(get(val, key)));
    }
  };

  IdentifierArray.prototype.filterBy = function (key: string, value?: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'filterBy', 'filter');
    if (arguments.length === 2) {
      return this.filter((record) => {
        return get(record, key) === value;
      });
    }
    return this.filter((record) => {
      return Boolean(get(record, key));
    });
  };

  IdentifierArray.prototype.sortBy = function (...sortKeys: string[]) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'sortBy', '.slice().sort');
    return this.slice().sort((a, b) => {
      for (let i = 0; i < sortKeys.length; i++) {
        let key = sortKeys[i];
        let propA = get(a, key);
        let propB = get(b, key);
        // return 1 or -1 else continue to the next sortKey
        let compareValue = compare(propA, propB);

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

  IdentifierArray.prototype.reject = function (callback, target?: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'reject', 'filter');
    assert('`reject` expects a function as first argument.', typeof callback === 'function');
    return this.filter((...args) => {
      return !callback.apply(target, args);
    });
  };

  IdentifierArray.prototype.rejectBy = function (key: string, value?: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'rejectBy', 'filter');
    if (arguments.length === 2) {
      return this.filter((record) => {
        return get(record, key) !== value;
      });
    }
    return this.filter((record) => {
      return !get(record, key);
    });
  };

  IdentifierArray.prototype.setEach = function (key: string, value: unknown) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'setEach', 'forEach');
    this.forEach((item) => set(item, key, value));
  };

  IdentifierArray.prototype.uniq = function () {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'uniq', 'filter');
    // all current managed arrays are already enforced as unique
    return this.slice();
  };

  // @ts-expect-error
  IdentifierArray.prototype.uniqBy = function (key: string) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'uniqBy', 'filter');
    // all current managed arrays are already enforced as unique
    let seen = new Set();
    let result: RecordInstance[] = [];
    this.forEach((item) => {
      let value = get(item, key);
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
      result.push(item);
    });
    return result;
  };

  IdentifierArray.prototype.without = function (value: RecordInstance) {
    deprecateArrayLike(this.DEPRECATED_CLASS_NAME, 'without', 'slice');
    const newArr = this.slice();
    const index = this.indexOf(value);
    if (index !== -1) {
      newArr.splice(index, 1);
    }
    return newArr;
  };

  // @ts-expect-error
  IdentifierArray.prototype.firstObject = null;
  // @ts-expect-error
  IdentifierArray.prototype.lastObject = null;
}

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

function extractIdentifierFromRecord(recordOrPromiseRecord: PromiseProxyRecord | RecordInstance | null) {
  if (!recordOrPromiseRecord) {
    return null;
  }

  if (isPromiseRecord(recordOrPromiseRecord)) {
    let content = recordOrPromiseRecord.content;
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

function isPromiseRecord(record: PromiseProxyRecord | RecordInstance): record is PromiseProxyRecord {
  return !!record.then;
}
