/**
  @module @ember-data/store
*/
// @ts-expect-error
import { tagForProperty } from '@ember/-internals/metal';
import { assert } from '@ember/debug';
import { dependentKeyCompat } from '@ember/object/compat';
import { tracked } from '@glimmer/tracking';
// @ts-expect-error
import { dirtyTag } from '@glimmer/validator';
import Ember from 'ember';

import { DEPRECATE_COMPUTED_CHAINS } from '@ember-data/deprecations';
import { DEBUG } from '@ember-data/env';
import { ImmutableRequestInfo } from '@ember-data/request/-private/types';
import { addToTransaction, subscribe } from '@ember-data/tracking/-private';
import { Links, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

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
  meta?: Record<string, unknown> | null;
};

interface PrivateState {
  links: Links | PaginationLinks | null;
  meta: Record<string, unknown> | null;
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
  _updatingPromise: Promise<IdentifierArray> | null = null;

  [IS_COLLECTION] = true;
  [IDENTIFIER_ARRAY_TAG] = new Tag();
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
          PrivateState.meta = (value || null) as Record<string, unknown> | null;
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

    if (DEBUG) {
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
  update(): Promise<IdentifierArray> {
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
    let promise = Promise.all(this.map((record) => this.store.saveRecord(record))).then(() => this);

    return promise;
  }
}

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
//Object.setPrototypeOf(IdentifierArray.prototype, Array.prototype);

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
