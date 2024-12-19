import ArrayMixin, { NativeArray } from '@ember/array';
import type ArrayProxy from '@ember/array/proxy';
import { deprecate } from '@ember/debug';
import Ember from 'ember';

import type { CreateRecordProperties } from '@ember-data/store/-private';
import type { BaseFinderOptions } from '@ember-data/store/types';
import { compat } from '@ember-data/tracking';
import { defineSignal } from '@ember-data/tracking/-private';
import {
  DEPRECATE_A_USAGE,
  DEPRECATE_COMPUTED_CHAINS,
  DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS,
} from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';

import type { RelatedCollection as ManyArray } from './many-array';
import { LegacyPromiseProxy } from './promise-belongs-to';

export interface HasManyProxyCreateArgs<T = unknown> {
  promise: Promise<ManyArray<T>>;
  content?: ManyArray<T>;
}

/**
 @module @ember-data/model
 */
/**
  This class is returned as the result of accessing an async hasMany relationship
  on an instance of a Model extending from `@ember-data/model`.

  A PromiseManyArray is an iterable proxy that allows templates to consume related
  ManyArrays and update once their contents are no longer pending.

  In your JS code you should resolve the promise first.

  ```js
  const comments = await post.comments;
  ```

  @class PromiseManyArray
  @public
*/
export interface PromiseManyArray<T = unknown> extends Omit<ArrayProxy<T>, 'destroy' | 'forEach'> {
  createRecord(hash: CreateRecordProperties<T>): T;
  reload(options: Omit<BaseFinderOptions, ''>): PromiseManyArray;
}
export class PromiseManyArray<T = unknown> {
  declare promise: Promise<ManyArray<T>> | null;
  declare isDestroyed: boolean;
  // @deprecated (isDestroyed is not deprecated)
  declare isDestroying: boolean;
  declare content: ManyArray<T> | null;

  constructor(promise: Promise<ManyArray<T>>, content?: ManyArray<T>) {
    this._update(promise, content);
    this.isDestroyed = false;
    this.isDestroying = false;

    if (DEPRECATE_A_USAGE) {
      const meta = Ember.meta(this);
      meta.hasMixin = (mixin: object) => {
        deprecate(`Do not use A() on an EmberData PromiseManyArray`, false, {
          id: 'ember-data:no-a-with-array-like',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
          for: 'ember-data',
        });
        if (mixin === NativeArray || mixin === ArrayMixin) {
          return true;
        }
        return false;
      };
    } else if (DEBUG) {
      const meta = Ember.meta(this);
      meta.hasMixin = (mixin: object) => {
        assert(`Do not use A() on an EmberData PromiseManyArray`);
      };
    }
  }

  //---- Methods/Properties on ArrayProxy that we will keep as our API

  /**
   * Retrieve the length of the content
   * @property length
   * @public
   */
  @compat
  get length(): number {
    // shouldn't be needed, but ends up being needed
    // for computed chains even in 4.x
    if (DEPRECATE_COMPUTED_CHAINS) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      this['[]'];
    }
    return this.content ? this.content.length : 0;
  }

  /**
   * Iterate the proxied content. Called by the glimmer iterator in #each
   * We do not guarantee that forEach will always be available. This
   * may eventually be made to use Symbol.Iterator once glimmer supports it.
   *
   * @method forEach
   * @param cb
   * @return
   * @private
   */
  forEach(cb: (item: T, index: number, array: T[]) => void) {
    if (this.content && this.length) {
      this.content.forEach(cb);
    }
  }

  /**
   * Reload the relationship
   * @method reload
   * @public
   * @param options
   * @return
   */
  reload(options: Omit<BaseFinderOptions, ''>) {
    assert('You are trying to reload an async manyArray before it has been created', this.content);
    void this.content.reload(options);
    return this;
  }

  //----  Properties/Methods from the PromiseProxyMixin that we will keep as our API

  /**
   * Whether the loading promise is still pending
   *
   * @property {boolean} isPending
   * @public
   */
  declare isPending: boolean;
  /**
   * Whether the loading promise rejected
   *
   * @property {boolean} isRejected
   * @public
   */
  declare isRejected: boolean;
  /**
   * Whether the loading promise succeeded
   *
   * @property {boolean} isFulfilled
   * @public
   */
  declare isFulfilled: boolean;
  /**
   * Whether the loading promise completed (resolved or rejected)
   *
   * @property {boolean} isSettled
   * @public
   */
  declare isSettled: boolean;

  /**
   * chain this promise
   *
   * @method then
   * @public
   * @param success
   * @param fail
   * @return Promise
   */
  then(s: Parameters<Promise<ManyArray<T>>['then']>[0], f?: Parameters<Promise<ManyArray<T>>['then']>[1]) {
    return this.promise!.then(s, f);
  }

  /**
   * catch errors thrown by this promise
   * @method catch
   * @public
   * @param callback
   * @return Promise
   */
  catch(cb: Parameters<Promise<ManyArray<T>>['catch']>[0]) {
    return this.promise!.catch(cb);
  }

  /**
   * run cleanup after this promise completes
   *
   * @method finally
   * @public
   * @param callback
   * @return Promise
   */
  finally(cb: Parameters<Promise<ManyArray<T>>['finally']>[0]) {
    return this.promise!.finally(cb);
  }

  //---- Methods on EmberObject that we should keep

  destroy() {
    this.isDestroying = true;
    this.isDestroyed = true;
    this.content = null;
    this.promise = null;
  }

  //---- Methods/Properties on ManyArray that we own and proxy to

  /**
   * Retrieve the links for this relationship
   * @property links
   * @public
   */
  @compat
  get links() {
    return this.content ? this.content.links : undefined;
  }

  /**
   * Retrieve the meta for this relationship
   * @property meta
   * @public
   */
  @compat
  get meta() {
    return this.content ? this.content.meta : undefined;
  }

  //---- Our own stuff

  _update(promise: Promise<ManyArray<T>>, content?: ManyArray<T>) {
    if (content !== undefined) {
      this.content = content;
    }

    this.promise = tapPromise(this, promise);
  }

  static create<T>({ promise, content }: HasManyProxyCreateArgs<T>): PromiseManyArray<T> {
    return new this(promise, content);
  }

  [LegacyPromiseProxy] = true as const;
}
defineSignal(PromiseManyArray.prototype, 'content', null);
defineSignal(PromiseManyArray.prototype, 'isPending', false);
defineSignal(PromiseManyArray.prototype, 'isRejected', false);
defineSignal(PromiseManyArray.prototype, 'isFulfilled', false);
defineSignal(PromiseManyArray.prototype, 'isSettled', false);

// this will error if someone tries to call
// A(identifierArray) since it is not configurable
// which is preferrable to the `meta` override we used
// before which required importing all of Ember
if (DEPRECATE_COMPUTED_CHAINS) {
  const desc = {
    enumerable: true,
    configurable: false,
    get: function (this: PromiseManyArray) {
      return this.content?.length && this.content;
    },
  };
  compat(PromiseManyArray.prototype, '[]', desc);

  // ember-source < 3.23 (e.g. 3.20 lts)
  // requires that the tag `'[]'` be notified
  // on the ArrayProxy in order for `{{#each}}`
  // to recompute. We entangle the '[]' tag from content

  Object.defineProperty(PromiseManyArray.prototype, '[]', desc);
}

if (DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS) {
  PromiseManyArray.prototype.createRecord = function createRecord<R>(
    this: PromiseManyArray<R>,
    hash: CreateRecordProperties<R>
  ) {
    deprecate(
      `The createRecord method on ember-data's PromiseManyArray is deprecated. await the promise and work with the ManyArray directly.`,
      false,
      {
        id: 'ember-data:deprecate-promise-many-array-behaviors',
        until: '5.0',
        since: { enabled: '4.7', available: '4.7' },
        for: 'ember-data',
      }
    );
    assert('You are trying to createRecord on an async manyArray before it has been created', this.content);
    return this.content.createRecord(hash);
  };

  Object.defineProperty(PromiseManyArray.prototype, 'firstObject', {
    get() {
      deprecate(
        `The firstObject property on ember-data's PromiseManyArray is deprecated. await the promise and work with the ManyArray directly.`,
        false,
        {
          id: 'ember-data:deprecate-promise-many-array-behaviors',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
          for: 'ember-data',
        }
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return this.content ? this.content.firstObject : undefined;
    },
  });

  Object.defineProperty(PromiseManyArray.prototype, 'lastObject', {
    get() {
      deprecate(
        `The lastObject property on ember-data's PromiseManyArray is deprecated. await the promise and work with the ManyArray directly.`,
        false,
        {
          id: 'ember-data:deprecate-promise-many-array-behaviors',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
          for: 'ember-data',
        }
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return this.content ? this.content.lastObject : undefined;
    },
  });
}

function tapPromise<T>(proxy: PromiseManyArray<T>, promise: Promise<ManyArray<T>>) {
  proxy.isPending = true;
  proxy.isSettled = false;
  proxy.isFulfilled = false;
  proxy.isRejected = false;
  return Promise.resolve(promise).then(
    (content) => {
      proxy.isPending = false;
      proxy.isFulfilled = true;
      proxy.isSettled = true;
      proxy.content = content;
      return content;
    },
    (error) => {
      proxy.isPending = false;
      proxy.isFulfilled = false;
      proxy.isRejected = true;
      proxy.isSettled = true;
      throw error;
    }
  );
}

if (DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS) {
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
    PromiseManyArray.prototype[method] = function delegatedMethod(...args) {
      deprecate(
        `The ${method} method on ember-data's PromiseManyArray is deprecated. await the promise and work with the ManyArray directly.`,
        false,
        {
          id: 'ember-data:deprecate-promise-many-array-behaviors',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
          for: 'ember-data',
        }
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return Ember[method](this, ...args);
    };
  });

  const InheritedProxyMethods = [
    'addArrayObserver',
    'addObject',
    'addObjects',
    'any',
    'arrayContentDidChange',
    'arrayContentWillChange',
    'clear',
    'compact',
    'every',
    'filter',
    'filterBy',
    'find',
    'findBy',
    'getEach',
    'includes',
    'indexOf',
    'insertAt',
    'invoke',
    'isAny',
    'isEvery',
    'lastIndexOf',
    'map',
    'mapBy',
    // TODO update RFC to note objectAt was deprecated (forEach was left for iteration)
    'objectAt',
    'objectsAt',
    'popObject',
    'pushObject',
    'pushObjects',
    'reduce',
    'reject',
    'rejectBy',
    'removeArrayObserver',
    'removeAt',
    'removeObject',
    'removeObjects',
    'replace',
    'reverseObjects',
    'setEach',
    'setObjects',
    'shiftObject',
    'slice',
    'sortBy',
    'toArray',
    'uniq',
    'uniqBy',
    'unshiftObject',
    'unshiftObjects',
    'without',
  ];
  InheritedProxyMethods.forEach((method) => {
    PromiseManyArray.prototype[method] = function proxiedMethod(...args) {
      deprecate(
        `The ${method} method on ember-data's PromiseManyArray is deprecated. await the promise and work with the ManyArray directly.`,
        false,
        {
          id: 'ember-data:deprecate-promise-many-array-behaviors',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
          for: 'ember-data',
        }
      );
      assert(`Cannot call ${method} before content is assigned.`, this.content);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return this.content[method](...args);
    };
  });
}
