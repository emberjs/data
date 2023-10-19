import { assert } from '@ember/debug';

import { DEPRECATE_COMPUTED_CHAINS } from '@ember-data/deprecations';
import { compat } from '@ember-data/tracking';
import { defineSignal } from '@ember-data/tracking/-private';
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
export default class PromiseManyArray {
  declare promise: Promise<ManyArray> | null;
  declare isDestroyed: boolean;

  constructor(promise: Promise<ManyArray>, content?: ManyArray) {
    this._update(promise, content);
    this.isDestroyed = false;
  }

  //---- Methods/Properties on ArrayProxy that we will keep as our API

  declare content: ManyArray | null;

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
   * @returns
   * @private
   */
  forEach(cb: Parameters<typeof Array.prototype.forEach>[0]) {
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
   * @returns Promise
   */
  then(s: Parameters<typeof Promise.prototype.then>[0], f: Parameters<typeof Promise.prototype.then>[1]) {
    return this.promise!.then(s, f);
  }

  /**
   * catch errors thrown by this promise
   * @method catch
   * @public
   * @param callback
   * @returns Promise
   */
  catch(cb: Parameters<typeof Promise.prototype.catch>[0]) {
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
  finally(cb: Parameters<typeof Promise.prototype.finally>[0]) {
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

function tapPromise(proxy: PromiseManyArray, promise: Promise<ManyArray>) {
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
