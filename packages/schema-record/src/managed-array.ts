import { assert } from '@ember/debug';

import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { RecordInstance } from '@ember-data/store/-types/q/record-instance';
import type { FieldSchema } from '@ember-data/store/-types/q/schema-service';
import type { Signal } from '@ember-data/tracking/-private';
import {
  addToTransaction,
  addTransactionCB,
  createArrayTags,
  createSignal,
  defineSignal,
  subscribe,
} from '@ember-data/tracking/-private';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { ArrayValue, Value } from '@warp-drive/core-types/json/raw';

import type { SchemaRecord } from './record';
import { Identifier } from './record';
import type { SchemaService } from './schema';

export const SOURCE = Symbol('#source');
export const MUTATE = Symbol('#update');
export const ARRAY_SIGNAL = Symbol('#signal');
export const NOTIFY = Symbol('#notify');

export function notifyArray(arr: ManagedArray) {
  addToTransaction(arr[ARRAY_SIGNAL]);
}

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
const SYNC_PROPS = new Set<KeyType>(['[]', 'length']);
function isArrayGetter<T>(prop: KeyType): prop is keyof Array<T> {
  return ARRAY_GETTER_METHODS.has(prop);
}
function isArraySetter<T>(prop: KeyType): prop is keyof Array<T> {
  return ARRAY_SETTER_METHODS.has(prop);
}
function isSelfProp<T extends object>(self: T, prop: KeyType): prop is keyof T {
  return prop in self;
}

function convertToInt(prop: KeyType): number | null {
  if (typeof prop === 'symbol') return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

type ProxiedMethod = (...args: unknown[]) => unknown;

type ForEachCB = (record: RecordInstance, index: number, context: typeof Proxy<unknown[]>) => void;
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
  [MUTATE]?(
    target: unknown[],
    receiver: typeof Proxy<unknown[]>,
    prop: string,
    args: unknown[],
    _SIGNAL: Signal
  ): unknown;
}

export class ManagedArray {
  [SOURCE]: unknown[];
  declare address: StableRecordIdentifier;
  declare key: string;
  declare owner: SchemaRecord;
  declare [ARRAY_SIGNAL]: Signal;

  constructor(
    store: Store,
    schema: SchemaService,
    cache: Cache,
    field: FieldSchema,
    data: unknown[],
    address: StableRecordIdentifier,
    key: string,
    owner: SchemaRecord
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this[SOURCE] = data.slice();
    this[ARRAY_SIGNAL] = createSignal(this, 'length');
    const _SIGNAL = this[ARRAY_SIGNAL];
    const boundFns = new Map<KeyType, ProxiedMethod>();
    this.address = address;
    this.key = key;
    this.owner = owner;
    let transaction = false;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const proxy = new Proxy(this[SOURCE], {
      get<R extends typeof Proxy<unknown[]>>(target: unknown[], prop: keyof R, receiver: R) {
        if (prop === ARRAY_SIGNAL) {
          return _SIGNAL;
        }
        if (prop === 'address') {
          return self.address;
        }
        if (prop === 'key') {
          return self.key;
        }
        if (prop === 'owner') {
          return self.owner;
        }

        const index = convertToInt(prop);
        if (_SIGNAL.shouldReset && (index !== null || SYNC_PROPS.has(prop) || isArrayGetter(prop))) {
          _SIGNAL.t = false;
          _SIGNAL.shouldReset = false;
          const newData = cache.getAttr(self.address, self.key);
          if (newData && newData !== self[SOURCE]) {
            self[SOURCE].length = 0;
            self[SOURCE].push(...(newData as ArrayValue));
          }
        }

        if (index !== null) {
          const val = target[index];
          if (!transaction) {
            subscribe(_SIGNAL);
          }
          if (field.type !== null) {
            const transform = schema.transforms.get(field.type);
            if (!transform) {
              throw new Error(`No '${field.type}' transform defined for use by ${address.type}.${String(prop)}`);
            }
            return transform.hydrate(val as Value, field.options ?? null, self.owner);
          }
          return val;
        }

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
        // step 1: if we've been told we are dirty, and we are accessing something that
        // asks for a value back, then update current data from the cache

        // step 2: if the prop appears to be a number, then we are accessing an array index
        // return the value at that index
        // guarding subscription against whether we are in a transaction
        // potentially error if the index is out of bounds.

        // step 3: if the prop is an array getter, generate the bound function if needed
        // then run the bound function with the appropriate args and return the result
        // this sohuld be wrapped in a transaction

        return Reflect.get(target, prop, receiver);
      },
      set(target, prop: KeyType, value, receiver) {
        if (prop === 'address') {
          self.address = value;
          return true;
        }
        if (prop === 'key') {
          self.key = value;
          return true;
        }
        if (prop === 'owner') {
          self.owner = value;
          return true;
        }
        const reflect = Reflect.set(target, prop, value, receiver);

        console.count('set');
        // a[0] = 'bar';
        // a.push('bar');
        if (reflect) {
          debugger;
          if (field.type === null) {
            cache.setAttr(self.address, self.key, self[SOURCE] as Value);
            _SIGNAL.shouldReset = true;
            return true;
          }

          const transform = schema.transforms.get(field.type);
          if (!transform) {
            throw new Error(`No '${field.type}' transform defined for use by ${address.type}.${String(prop)}`);
          }
          const rawValue = (self[SOURCE] as ArrayValue).map((item) =>
            transform.serialize(item, field.options ?? null, self.owner)
          );
          cache.setAttr(self.address, self.key, rawValue as Value);
          _SIGNAL.shouldReset = true;
        }
        return reflect;
      },
    }) as ManagedArray;

    return proxy;
  }
}
