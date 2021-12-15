import ArrayMixin from '@ember/array';
import { assert } from '@ember/debug';
import { dependentKeyCompat } from '@ember/object/compat';
import { tracked } from '@glimmer/tracking';
import Ember from 'ember';

import { resolve } from 'rsvp';

import { DEPRECATE_EVENTED_API_USAGE } from '@ember-data/private-build-infra/deprecations';

/**
 @module @ember-data/model
 */
/**
  This class is returned as the result of accessing an async hasMany relationship
  on an instance of a Model extending from `@ember-data/model`.

  A PromiseManyArray is an array-like proxy that also proxies certain method calls
  to the underlying ManyArray in addition to being "promisified".

  Right now we proxy:

    * `reload()`
    * `createRecord()`

  This promise-proxy behavior is primarily to ensure that async relationship interact
  nicely with templates. In your JS code you should resolve the promise first.

  ```js
  const comments = await post.comments;
  ```

  @class PromiseManyArray
  @public
*/
export default class PromiseManyArray {
  declare promise: Promise<any> | null;
  declare isDestroyed: boolean;
  declare isDestroying: boolean;

  constructor(promise, content) {
    this._update(promise, content);
    this.isDestroyed = false;
    this.isDestroying = false;

    const meta = Ember.meta(this);
    meta.hasMixin = (mixin: Object) => {
      if (mixin === ArrayMixin) {
        return true;
      }
      return false;
    };
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
    return this.content ? this.content.length : 0;
  }

  // ember-source < 3.23 (e.g. 3.20 lts)
  // requires that the tag `'[]'` be notified
  // on the ArrayProxy in order for `{{#each}}`
  // to recompute. We entangle the '[]' tag from
  @dependentKeyCompat
  get '[]'() {
    return this.content ? this.content['[]'] : this.content;
  }

  /**
   * Iterate the proxied content. Called by the glimmer iterator in #each
   *
   * @method forEach
   * @param cb
   * @returns
   * @private
   */
  forEach(cb) {
    this['[]']; // needed for < 3.23 support e.g. 3.20 lts
    if (this.content && this.length) {
      this.content.forEach(cb);
    }
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

  /**
   * Reload the relationship
   * @method reload
   * @public
   * @param options
   * @returns
   */
  reload(options) {
    assert('You are trying to reload an async manyArray before it has been created', this.content);
    this.content.reload(options);
    return this;
  }

  //---- Our own stuff

  _update(promise, content) {
    if (content !== undefined) {
      this.content = content;
    }

    this.promise = tapPromise(this, promise);
  }

  static create({ promise, content }) {
    return new this(promise, content);
  }

  // Methods on ManyArray which people should resolve the relationship first before calling
  createRecord(...args) {
    assert('You are trying to createRecord on an async manyArray before it has been created', this.content);
    return this.content.createRecord(...args);
  }

  // Properties/Methods on ArrayProxy we should deprecate

  get firstObject() {
    return this.content ? this.content.firstObject : undefined;
  }

  get lastObject() {
    return this.content ? this.content.lastObject : undefined;
  }
}

function tapPromise(proxy, promise) {
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
    assert(`Cannot call ${method} before content is assigned.`, this.content);
    return this.content[method](...args);
  };
});

if (DEPRECATE_EVENTED_API_USAGE) {
  ['on', 'has', 'trigger', 'off', 'one'].forEach((method) => {
    PromiseManyArray.prototype[method] = function proxiedMethod(...args) {
      assert(`Cannot call ${method} before content is assigned.`, this.content);
      return this.content[method](...args);
    };
  });
}
