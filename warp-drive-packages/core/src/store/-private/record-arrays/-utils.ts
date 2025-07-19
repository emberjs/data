import { assert } from '@warp-drive/build-config/macros';

import { Context } from '../../../reactive/-private';
import type { BaseFinderOptions } from '../../../types';
import type { LocalRelationshipOperation } from '../../../types/graph';
import type { ResourceKey } from '../../../types/identifier';
import type { Store } from '../store-service';
import type { NativeProxy } from './native-proxy-type-fix';
import type { ReactiveResourceArray } from './resource-array';

/**
 * LegacyArrays have the capability of updating via `array.update()`
 * and saving each contained record individually via `array.save()`
 */
export interface LegacyArray<T = unknown> extends ReactiveResourceArray<T> {
  /**
    The flag to signal a `RecordArray` is currently loading data.
    Example
    ```javascript
    let people = store.peekAll('person');
    people.isUpdating; // false
    people.update();
    people.isUpdating; // true
    ```
  */
  isUpdating: boolean;
  /** @internal */
  _updatingPromise: Promise<LegacyArray<T>> | null;

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
  update(this: LegacyArray<T>): Promise<LegacyArray<T>>;

  /**
    Saves all of the records in the `RecordArray`.

    Example

    ```js
    let messages = store.peekAll('message');
    messages.forEach(function(message) {
      message.hasBeenSeen = true;
    });
    messages.save();
    ```

    @public
  */
  save(this: LegacyArray<T>): Promise<LegacyArray<T>>;
}

export function upgradeThis(obj: unknown): asserts obj is LegacyArray {}

export function update(this: ReactiveResourceArray): Promise<ReactiveResourceArray> {
  upgradeThis(this);
  if (this.isUpdating) {
    return this._updatingPromise!;
  }

  this.isUpdating = true;

  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const updatingPromise = this._update() as Promise<IdentifierArray>;
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

export function save(this: ReactiveResourceArray): Promise<ReactiveResourceArray> {
  upgradeThis(this);

  const context = this[Context];
  const promise = Promise.all(this.map((record) => context.store.saveRecord(record))).then(() => this);

  return promise;
}

export type KeyType = string | symbol | number;
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
export function isArrayGetter<T>(prop: KeyType): prop is keyof Array<T> {
  return ARRAY_GETTER_METHODS.has(prop);
}
export function isArraySetter<T>(prop: KeyType): prop is keyof Array<T> {
  return ARRAY_SETTER_METHODS.has(prop);
}

export function convertToInt(prop: KeyType): number | null {
  if (typeof prop === 'symbol') return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

export type ForEachCB<T> = (record: T, index: number, context: typeof NativeProxy<ResourceKey[], T[]>) => void;
export function safeForEach<T>(
  instance: typeof NativeProxy<ResourceKey[], T[]>,
  arr: ResourceKey[],
  store: Store,
  callback: ForEachCB<T>,
  target: unknown
): typeof NativeProxy<ResourceKey[], T[]> {
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
  content: ReactiveResourceArray<T> | null;
  promise: Promise<ReactiveResourceArray<T>> | null;
} & PromiseTo<ReactiveResourceArray<T>>;
export interface MinimumManager {
  _syncArray(array: ReactiveResourceArray): void;
  mutate?(mutation: LocalRelationshipOperation): void;
  reloadHasMany?<T>(key: string, options?: BaseFinderOptions): Promise<ReactiveResourceArray> | PromiseManyArray<T>;
}
