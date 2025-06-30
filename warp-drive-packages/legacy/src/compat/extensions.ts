import { type default as EmberObject, get, set } from '@ember/object';
import { compare } from '@ember/utils';
import Ember from 'ember';

import { assert } from '@warp-drive/core/build-config/macros';
import type { CAUTION_MEGA_DANGER_ZONE_Extension } from '@warp-drive/core/reactive/-private/schema';

const EmberObjectFeatures = {};
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
  EmberObjectFeatures[method] = function delegatedMethod(...args: unknown[]): unknown {
    return (Ember[method] as (...args: unknown[]) => unknown)(this, ...args);
  };
});
export const EmberObjectArrayExtension: CAUTION_MEGA_DANGER_ZONE_Extension = {
  kind: 'array',
  name: 'ember-object' as const,
  features: EmberObjectFeatures,
};
export const EmberObjectExtension: CAUTION_MEGA_DANGER_ZONE_Extension = {
  kind: 'object',
  name: 'ember-object' as const,
  features: EmberObjectFeatures,
};

const EmberArrayLikeFeatures = {
  addObject<T>(this: T[], obj: T): T[] {
    const index = this.indexOf(obj);
    if (index === -1) {
      this.push(obj);
    }
    return this;
  },

  addObjects<T>(this: T[], objs: T[]): T[] {
    objs.forEach((obj: T) => {
      const index = this.indexOf(obj);
      if (index === -1) {
        this.push(obj);
      }
    });
    return this;
  },

  popObject<T>(this: T[]): T | undefined {
    return this.pop();
  },

  pushObject<T>(this: T[], obj: T): T {
    this.push(obj);
    return obj;
  },

  pushObjects<T>(this: T[], objs: T[]): T[] {
    this.push(...objs);
    return this;
  },

  shiftObject<T>(this: T[]): NonNullable<T> {
    return this.shift()!;
  },

  unshiftObject<T>(this: T[], obj: T): T {
    this.unshift(obj);
    return obj;
  },

  unshiftObjects<T>(this: T[], objs: T[]): T[] {
    this.unshift(...objs);
    return this;
  },

  objectAt<T>(this: T[], index: number): T {
    //For negative index values go back from the end of the array
    const arrIndex = Math.sign(index) === -1 ? this.length + index : index;

    return this[arrIndex];
  },

  objectsAt<T>(this: T[], indices: number[]): T[] {
    // @ts-expect-error adding MutableArray method
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return indices.map((index) => this.objectAt(index)!);
  },

  removeAt<T>(this: T[], index: number): T[] {
    this.splice(index, 1);
    return this;
  },

  insertAt<T>(this: T[], index: number, obj: T): T[] {
    this.splice(index, 0, obj);
    return this;
  },

  removeObject<T>(this: T[], obj: T): T[] {
    const index = this.indexOf(obj);
    if (index !== -1) {
      this.splice(index, 1);
    }
    return this;
  },

  removeObjects<T>(this: T[], objs: T[]): T[] {
    objs.forEach((obj) => {
      const index = this.indexOf(obj);
      if (index !== -1) {
        this.splice(index, 1);
      }
    });
    return this;
  },

  toArray<T>(this: T[]): T[] {
    return this.slice();
  },

  replace<T>(this: T[], idx: number, amt: number, objects?: T[]): void {
    if (objects) {
      this.splice(idx, amt, ...objects);
    } else {
      this.splice(idx, amt);
    }
  },

  clear<T>(this: T[]): T[] {
    this.splice(0, this.length);
    return this;
  },

  setObjects<T>(this: T[], objects: T[]): T[] {
    assert(`setObjects expects to receive an array as its argument`, Array.isArray(objects));
    this.splice(0, this.length);
    this.push(...objects);
    return this;
  },

  reverseObjects<T>(this: T[]): T[] {
    this.reverse();
    return this;
  },

  compact<T>(this: T[]): (T & {})[] {
    return this.filter((v) => v !== null && v !== undefined);
  },

  any<T>(this: T[], callback: Parameters<Array<T>['some']>[0], target?: unknown): boolean {
    return this.some(callback, target);
  },

  isAny<T>(this: T[], prop: string, value: unknown): boolean {
    const hasValue = arguments.length === 2;
    return (this as unknown as Array<Record<string, unknown>>).some((v) =>
      hasValue ? v[prop] === value : v[prop] === true
    );
  },

  isEvery<T>(this: T[], prop: string, value: unknown): boolean {
    const hasValue = arguments.length === 2;
    return (this as unknown as Array<Record<string, unknown>>).every((v) =>
      hasValue ? v[prop] === value : v[prop] === true
    );
  },

  getEach<T>(this: T[], key: string): unknown[] {
    return this.map((value) => get(value, key));
  },

  mapBy<T>(this: T[], key: string): unknown[] {
    return this.map((value) => get(value, key));
  },

  findBy<T>(this: T[], key: string, value?: unknown): T | undefined {
    if (arguments.length === 2) {
      return this.find((val) => {
        return get(val, key) === value;
      });
    } else {
      return this.find((val) => Boolean(get(val, key)));
    }
  },

  filterBy<T>(this: T[], key: string, value?: unknown): T[] {
    if (arguments.length === 2) {
      return this.filter((record) => {
        return get(record, key) === value;
      });
    }

    return this.filter((record) => {
      return Boolean(get(record, key));
    });
  },

  sortBy<T>(this: T[], ...sortKeys: string[]): T[] {
    return this.slice().sort((a, b) => {
      for (let i = 0; i < sortKeys.length; i++) {
        const key = sortKeys[i];

        const propA = get(a, key);

        const propB = get(b, key);
        // return 1 or -1 else continue to the next sortKey
        const compareValue = compare(propA, propB);

        if (compareValue) {
          return compareValue;
        }
      }
      return 0;
    });
  },

  invoke<T>(this: T[], key: string, ...args: unknown[]): unknown[] {
    return (this as unknown as Array<Record<string, unknown>>).map((value) =>
      (value[key] as (...args: unknown[]) => unknown)(...args)
    );
  },

  addArrayObserver<T>(this: T[]): void {},

  removeArrayObserver<T>(this: T[]): void {},

  arrayContentWillChange<T>(this: T[]): void {},

  arrayContentDidChange<T>(this: T[]): void {},

  reject<T>(this: T[], callback: Parameters<Array<T>['filter']>[0], target?: unknown): T[] {
    assert('`reject` expects a function as first argument.', typeof callback === 'function');

    return this.filter((...args) => {
      return !callback.apply(target, args);
    });
  },

  rejectBy<T>(this: T[], key: string, value?: unknown): T[] {
    if (arguments.length === 2) {
      return this.filter((record) => {
        return get(record, key) !== value;
      });
    }

    return this.filter((record) => {
      return !get(record, key);
    });
  },

  setEach<T>(this: T[], key: string, value: unknown): void {
    (this as unknown as Array<Record<string, unknown>>).forEach((item) => set(item, key, value));
  },

  uniq<T>(this: T[]): T[] {
    return Array.from(new Set(this));
  },

  uniqBy<T>(this: T[], key: string): T[] {
    const seen = new Set();
    const result: T[] = [];
    this.forEach((item) => {
      const value = get(item, key);
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
      result.push(item);
    });
    return result;
  },

  without<T>(this: T[], value: T): T[] {
    const newArr = this.slice();
    const index = this.indexOf(value);
    if (index !== -1) {
      newArr.splice(index, 1);
    }

    return newArr;
  },

  get firstObject(): unknown {
    return (this as unknown as unknown[]).at(0);
  },

  get lastObject(): unknown {
    return (this as unknown as unknown[]).at(-1);
  },
};

export const EmberArrayLikeExtension: CAUTION_MEGA_DANGER_ZONE_Extension = {
  kind: 'array',
  name: 'ember-array-like' as const,
  features: EmberArrayLikeFeatures,
};

export type ArrayType<T> = T extends ReadonlyArray<infer U> ? U : never;
export type WithEmberObject<T> = T & Pick<T & EmberObject, ArrayType<typeof EmberObjectMethods>>;

export type WithArrayLike<T> =
  T extends Array<infer U>
    ? U &
        Omit<typeof EmberArrayLikeFeatures, 'firstObject' | 'lastObject'> & {
          firstObject: T | undefined;
          lastObject: T | undefined;
        }
    : T[] &
        Omit<typeof EmberArrayLikeFeatures, 'firstObject' | 'lastObject'> & {
          firstObject: T | undefined;
          lastObject: T | undefined;
        };
