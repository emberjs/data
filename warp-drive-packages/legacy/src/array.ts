import { get, set } from '@ember/object';
import { compare } from '@ember/utils';
import Ember from 'ember';

import { assert } from '@warp-drive/core/build-config/macros';
import type { CAUTION_MEGA_DANGER_ZONE_Extension } from '@warp-drive/core/reactive/-private/schema';
import type { OpaqueRecordInstance } from '@warp-drive/core/types/record';

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
  name: 'ember-object',
  features: EmberObjectFeatures,
};
export const EmberObjectExtension: CAUTION_MEGA_DANGER_ZONE_Extension = {
  kind: 'object',
  name: 'ember-object',
  features: EmberObjectFeatures,
};

const EmberArrayLikeFeatures = {
  addObject(this: OpaqueRecordInstance[], obj: OpaqueRecordInstance) {
    const index = this.indexOf(obj);
    if (index === -1) {
      this.push(obj);
    }
    return this;
  },

  addObjects(this: OpaqueRecordInstance[], objs: OpaqueRecordInstance[]) {
    objs.forEach((obj: OpaqueRecordInstance) => {
      const index = this.indexOf(obj);
      if (index === -1) {
        this.push(obj);
      }
    });
    return this;
  },

  popObject(this: OpaqueRecordInstance[]) {
    return this.pop();
  },

  pushObject(this: OpaqueRecordInstance[], obj: OpaqueRecordInstance) {
    this.push(obj);
    return obj;
  },

  pushObjects(this: OpaqueRecordInstance[], objs: OpaqueRecordInstance[]) {
    this.push(...objs);
    return this;
  },

  shiftObject(this: OpaqueRecordInstance[]) {
    return this.shift()!;
  },

  unshiftObject(this: OpaqueRecordInstance[], obj: OpaqueRecordInstance) {
    this.unshift(obj);
    return obj;
  },

  unshiftObjects(this: OpaqueRecordInstance[], objs: OpaqueRecordInstance[]) {
    this.unshift(...objs);
    return this;
  },

  objectAt(this: OpaqueRecordInstance[], index: number) {
    //For negative index values go back from the end of the array
    const arrIndex = Math.sign(index) === -1 ? this.length + index : index;

    return this[arrIndex];
  },

  objectsAt(this: OpaqueRecordInstance[], indices: number[]) {
    // @ts-expect-error adding MutableArray method
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return indices.map((index) => this.objectAt(index)!);
  },

  removeAt(this: OpaqueRecordInstance[], index: number) {
    this.splice(index, 1);
    return this;
  },

  insertAt(this: OpaqueRecordInstance[], index: number, obj: OpaqueRecordInstance) {
    this.splice(index, 0, obj);
    return this;
  },

  removeObject(this: OpaqueRecordInstance[], obj: OpaqueRecordInstance) {
    const index = this.indexOf(obj);
    if (index !== -1) {
      this.splice(index, 1);
    }
    return this;
  },

  removeObjects(this: OpaqueRecordInstance[], objs: OpaqueRecordInstance[]) {
    objs.forEach((obj) => {
      const index = this.indexOf(obj);
      if (index !== -1) {
        this.splice(index, 1);
      }
    });
    return this;
  },

  toArray(this: OpaqueRecordInstance[]) {
    return this.slice();
  },

  replace(this: OpaqueRecordInstance[], idx: number, amt: number, objects?: OpaqueRecordInstance[]) {
    if (objects) {
      this.splice(idx, amt, ...objects);
    } else {
      this.splice(idx, amt);
    }
  },

  clear(this: OpaqueRecordInstance[]) {
    this.splice(0, this.length);
    return this;
  },

  setObjects(this: OpaqueRecordInstance[], objects: OpaqueRecordInstance[]) {
    assert(`setObjects expects to receive an array as its argument`, Array.isArray(objects));
    this.splice(0, this.length);
    this.push(...objects);
    return this;
  },

  reverseObjects(this: OpaqueRecordInstance[]) {
    this.reverse();
    return this;
  },

  compact(this: OpaqueRecordInstance[]) {
    return this.filter((v) => v !== null && v !== undefined);
  },

  any(this: OpaqueRecordInstance[], callback, target) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.some(callback, target);
  },

  isAny(prop: string, value: unknown): boolean {
    const hasValue = arguments.length === 2;
    return (this as unknown as Array<Record<string, unknown>>).some((v) =>
      hasValue ? v[prop] === value : v[prop] === true
    );
  },

  isEvery(prop: string, value: unknown): boolean {
    const hasValue = arguments.length === 2;
    return (this as unknown as Array<Record<string, unknown>>).every((v) =>
      hasValue ? v[prop] === value : v[prop] === true
    );
  },

  getEach(this: OpaqueRecordInstance[], key: string) {
    return this.map((value) => get(value, key));
  },

  mapBy(this: OpaqueRecordInstance[], key: string) {
    return this.map((value) => get(value, key));
  },

  findBy(this: OpaqueRecordInstance[], key: string, value?: unknown) {
    if (arguments.length === 2) {
      return this.find((val) => {
        return get(val, key) === value;
      });
    } else {
      return this.find((val) => Boolean(get(val, key)));
    }
  },

  filterBy(this: OpaqueRecordInstance[], key: string, value?: unknown) {
    if (arguments.length === 2) {
      return this.filter((record) => {
        return get(record, key) === value;
      });
    }

    return this.filter((record) => {
      return Boolean(get(record, key));
    });
  },

  sortBy(this: OpaqueRecordInstance[], ...sortKeys: string[]) {
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

  invoke(key: string, ...args: unknown[]) {
    return (this as unknown as Array<Record<string, unknown>>).map((value) =>
      (value[key] as (...args: unknown[]) => unknown)(...args)
    );
  },

  addArrayObserver(this: OpaqueRecordInstance[]) {},

  removeArrayObserver(this: OpaqueRecordInstance[]) {},

  arrayContentWillChange(this: OpaqueRecordInstance[]) {},

  arrayContentDidChange(this: OpaqueRecordInstance[]) {},

  reject(this: OpaqueRecordInstance[], callback, target?: unknown) {
    assert('`reject` expects a function as first argument.', typeof callback === 'function');

    return this.filter((...args) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return !callback.apply(target, args);
    });
  },

  rejectBy(this: OpaqueRecordInstance[], key: string, value?: unknown) {
    if (arguments.length === 2) {
      return this.filter((record) => {
        return get(record, key) !== value;
      });
    }

    return this.filter((record) => {
      return !get(record, key);
    });
  },

  setEach(key: string, value: unknown) {
    (this as unknown as Array<Record<string, unknown>>).forEach((item) => set(item, key, value));
  },

  uniq(this: OpaqueRecordInstance[]) {
    return Array.from(new Set(this));
  },

  uniqBy(this: OpaqueRecordInstance[], key: string) {
    const seen = new Set();
    const result: OpaqueRecordInstance[] = [];
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

  without(this: OpaqueRecordInstance[], value: OpaqueRecordInstance) {
    const newArr = this.slice();
    const index = this.indexOf(value);
    if (index !== -1) {
      newArr.splice(index, 1);
    }

    return newArr;
  },

  get firstObject() {
    return (this as unknown as unknown[]).at(0);
  },

  get lastObject() {
    return (this as unknown as unknown[]).at(-1);
  },
};
export const EmberArrayLikeExtension: CAUTION_MEGA_DANGER_ZONE_Extension = {
  kind: 'array',
  name: 'ember-array-like',
  features: EmberArrayLikeFeatures,
};
