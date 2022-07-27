import { deprecate } from '@ember/debug';
import type ComputedProperty from '@ember/object/computed';
import { reads } from '@ember/object/computed';

import { resolve } from 'rsvp';

import type { Dict } from '@ember-data/types/q/utils';

import { PromiseArrayProxy, PromiseObjectProxy } from './promise-proxy-base';

/**
  @module @ember-data/store
*/

/**
  A `PromiseArray` is an object that acts like both an `Ember.Array`
  and a promise. When the promise is resolved the resulting value
  will be set to the `PromiseArray`'s `content` property. This makes
  it easy to create data bindings with the `PromiseArray` that will be
  updated when the promise resolves.

  This class should not be imported and instantiated directly.

  For more information see the [Ember.PromiseProxyMixin
  documentation](/ember/release/classes/PromiseProxyMixin).

  Example

  ```javascript
  let promiseArray = PromiseArray.create({
    promise: $.getJSON('/some/remote/data.json')
  });

  promiseArray.get('length'); // 0

  promiseArray.then(function() {
    promiseArray.get('length'); // 100
  });
  ```

  @class PromiseArray
  @public
  @extends Ember.ArrayProxy
  @uses Ember.PromiseProxyMixin
*/
interface EmberNativeArrayLike<T> {
  length: number | ComputedProperty<number>;
  objectAt(idx: number): T | undefined;
}
interface EmberArrayProxyLike<T> {
  length: number | ComputedProperty<number>;
  objectAtContent(idx: number): T | undefined;
}
type EmberArrayLike<T> = EmberNativeArrayLike<T> | EmberArrayProxyLike<T>;

export class PromiseArray<I, T extends EmberArrayLike<I>> extends PromiseArrayProxy<I, T> {
  @reads('content.meta')
  declare meta?: Dict<unknown>;
}

/**
  A `PromiseObject` is an object that acts like both an `EmberObject`
  and a promise. When the promise is resolved, then the resulting value
  will be set to the `PromiseObject`'s `content` property. This makes
  it easy to create data bindings with the `PromiseObject` that will
  be updated when the promise resolves.

  This class should not be imported and instantiated directly.

  For more information see the [Ember.PromiseProxyMixin
  documentation](/ember/release/classes/PromiseProxyMixin.html).

  Example

  ```javascript
  let promiseObject = PromiseObject.create({
    promise: $.getJSON('/some/remote/data.json')
  });

  promiseObject.get('name'); // null

  promiseObject.then(function() {
    promiseObject.get('name'); // 'Tomster'
  });
  ```

  @class PromiseObject
  @public
  @extends Ember.ObjectProxy
  @uses Ember.PromiseProxyMixin
*/
export { PromiseObjectProxy as PromiseObject };

export function promiseObject<T>(promise: Promise<T>, label?: string): PromiseObjectProxy<T> {
  return PromiseObjectProxy.create({
    promise: resolve(promise, label),
  }) as PromiseObjectProxy<T>;
}

export function promiseArray<I, T extends EmberArrayLike<I>>(promise: Promise<T>, label?: string): PromiseArray<I, T> {
  return PromiseArray.create({
    promise: resolve(promise, label),
  }) as unknown as PromiseArray<I, T>;
}

// constructor is accessed in some internals but not including it in the copyright for the deprecation
const ALLOWABLE_METHODS = ['constructor', 'then', 'catch', 'finally'];

export function deprecatedPromiseObject<T>(promise: Promise<T>): PromiseObjectProxy<T> {
  const promiseObjectProxy: PromiseObjectProxy<T> = promiseObject(promise);
  const handler = {
    get(target: object, prop: string, receiver?: object): unknown {
      if (!ALLOWABLE_METHODS.includes(prop)) {
        deprecate(
          `Accessing ${prop} is deprecated. The return type is being changed fomr PromiseObjectProxy to a Promise. The only available methods to access on this promise are .then, .catch and .finally`,
          false,
          {
            id: 'ember-data:model-save-promise',
            until: '5.0',
            for: '@ember-data/store',
            since: {
              available: '4.4',
              enabled: '4.4',
            },
          }
        );
      }

      const value: unknown = Reflect.get(target, prop, receiver);
      if (value && typeof value === 'function' && typeof value.bind === 'function') {
        return value.bind(target);
      }

      return value;
    },
  };

  return new Proxy(promiseObjectProxy, handler) as PromiseObjectProxy<T>;
}
