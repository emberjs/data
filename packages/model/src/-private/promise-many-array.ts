import { assert } from '@ember/debug';

import type { BaseFinderOptions } from '@ember-data/store/-types/q/store';
import { compat } from '@ember-data/tracking';
import { defineSignal } from '@ember-data/tracking/-private';
import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/build-config/deprecations';

import type ManyArray from './many-array';
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
export default class PromiseManyArray<T = unknown> {
  declare promise: Promise<ManyArray<T>> | null;
  declare isDestroyed: boolean;
  declare content: ManyArray<T> | null;

  constructor(promise: Promise<ManyArray<T>>, content?: ManyArray<T>) {
    this._update(promise, content);
    this.isDestroyed = false;
  }

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
  compat(desc);

  // ember-source < 3.23 (e.g. 3.20 lts)
  // requires that the tag `'[]'` be notified
  // on the ArrayProxy in order for `{{#each}}`
  // to recompute. We entangle the '[]' tag from content
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  Object.defineProperty(PromiseManyArray.prototype, '[]', desc);
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
