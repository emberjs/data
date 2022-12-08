import ArrayMixin, { NativeArray } from '@ember/array';
import type ArrayProxy from '@ember/array/proxy';
import { assert, deprecate } from '@ember/debug';
import { dependentKeyCompat } from '@ember/object/compat';
import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import Ember from 'ember';

import { resolve } from 'rsvp';

import {
  DEPRECATE_A_USAGE,
  DEPRECATE_COMPUTED_CHAINS,
  DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS,
} from '@ember-data/private-build-infra/deprecations';
import { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import { FindOptions } from '@ember-data/types/q/store';

import type ManyArray from './many-array';

export interface HasManyProxyCreateArgs {
  promise: Promise<ManyArray>;
  content?: ManyArray;
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
export default interface PromiseManyArray extends Omit<ArrayProxy<StableRecordIdentifier, RecordInstance>, 'destroy'> {
  createRecord(): RecordInstance;
  reload(options: FindOptions): PromiseManyArray;
}
export default class PromiseManyArray {
  declare promise: Promise<ManyArray> | null;
  declare isDestroyed: boolean;
  // @deprecated (isDestroyed is not deprecated)
  declare isDestroying: boolean;

  constructor(promise: Promise<ManyArray>, content?: ManyArray) {
    this._update(promise, content);
    this.isDestroyed = false;
    this.isDestroying = false;

    if (DEPRECATE_A_USAGE) {
      const meta = Ember.meta(this);
      meta.hasMixin = (mixin: Object) => {
        deprecate(`Do not use A() on an EmberData PromiseManyArray`, false, {
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
        assert(`Do not use A() on an EmberData PromiseManyArray`);
      };
    }
  }

  //---- Methods/Properties on ArrayProxy that we will keep as our API

  @tracked content: any | null = null;

  /**
   * Retrieve the length of the content
   * @property length
   * @public
   */
  @dependentKeyCompat
  get length(): number {
    // shouldn't be needed, but ends up being needed
    // for computed chains even in 4.x
    if (DEPRECATE_COMPUTED_CHAINS) {
      this['[]'];
    }
    return this.content ? this.content.length : 0;
  }

  // ember-source < 3.23 (e.g. 3.20 lts)
  // requires that the tag `'[]'` be notified
  // on the ArrayProxy in order for `{{#each}}`
  // to recompute. We entangle the '[]' tag from
  @dependentKeyCompat
  get '[]'() {
    if (DEPRECATE_COMPUTED_CHAINS) {
      return this.content?.length && this.content;
    }
  }

  /**
   * Iterate the proxied content. Called by the glimmer iterator in #each
   * We do not guarantee that forEach will always be available. This
   * may eventually be made to use Symbol.Iterator once glimmer supports it.
   *
   * @method forEach
   * @param cb
   * @returns
   * @private
   */
  forEach(cb) {
    if (this.content && this.length) {
      this.content.forEach(cb);
    }
  }

  /**
   * Reload the relationship
   * @method reload
   * @public
   * @param options
   * @returns
   */
  reload(options: FindOptions) {
    assert('You are trying to reload an async manyArray before it has been created', this.content);
    this.content.reload(options);
    return this;
  }

  //----  Properties/Methods from the PromiseProxyMixin that we will keep as our API

  /**
   * Whether the loading promise is still pending
   *
   * @property {boolean} isPending
   * @public
   */
  @tracked isPending: boolean = false;
  /**
   * Whether the loading promise rejected
   *
   * @property {boolean} isRejected
   * @public
   */
  @tracked isRejected: boolean = false;
  /**
   * Whether the loading promise succeeded
   *
   * @property {boolean} isFulfilled
   * @public
   */
  @tracked isFulfilled: boolean = false;
  /**
   * Whether the loading promise completed (resolved or rejected)
   *
   * @property {boolean} isSettled
   * @public
   */
  @tracked isSettled: boolean = false;

  /**
   * chain this promise
   *
   * @method then
   * @public
   * @param success
   * @param fail
   * @returns Promise
   */
  then(s, f) {
    return this.promise!.then(s, f);
  }

  /**
   * catch errors thrown by this promise
   * @method catch
   * @public
   * @param callback
   * @returns Promise
   */
  catch(cb) {
    return this.promise!.catch(cb);
  }

  /**
   * run cleanup after this promise completes
   *
   * @method finally
   * @public
   * @param callback
   * @returns Promise
   */
  finally(cb) {
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
  @dependentKeyCompat
  get links() {
    return this.content ? this.content.links : undefined;
  }

  /**
   * Retrieve the meta for this relationship
   * @property meta
   * @public
   */
  @dependentKeyCompat
  get meta() {
    return this.content ? this.content.meta : undefined;
  }

  //---- Our own stuff

  _update(promise: Promise<ManyArray>, content?: ManyArray) {
    if (content !== undefined) {
      this.content = content;
    }

    this.promise = tapPromise(this, promise);
  }

  static create({ promise, content }: HasManyProxyCreateArgs): PromiseManyArray {
    return new this(promise, content);
  }
}

if (DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS) {
  PromiseManyArray.prototype.createRecord = function createRecord(...args) {
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
    return this.content.createRecord(...args);
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
      return this.content ? this.content.lastObject : undefined;
    },
  });
}

function tapPromise(proxy: PromiseManyArray, promise: Promise<ManyArray>) {
  proxy.isPending = true;
  proxy.isSettled = false;
  proxy.isFulfilled = false;
  proxy.isRejected = false;
  return resolve(promise).then(
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
      return this.content[method](...args);
    };
  });
}
