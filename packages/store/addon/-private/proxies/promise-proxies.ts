import { deprecate } from '@ember/debug';
import { get } from '@ember/object';
import type ComputedProperty from '@ember/object/computed';
import { reads } from '@ember/object/computed';
import { DEBUG } from '@glimmer/env';

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

  promiseArray.length; // 0

  promiseArray.then(function() {
    promiseArray.length; // 100
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

  promiseObject.name; // null

  promiseObject.then(function() {
    promiseObject.name; // 'Tomster'
  });
  ```

  @class PromiseObject
  @public
  @extends Ember.ObjectProxy
  @uses Ember.PromiseProxyMixin
*/
export { PromiseObjectProxy as PromiseObject };

function _promiseObject<T>(promise: Promise<T>, label?: string): PromiseObjectProxy<T> {
  return PromiseObjectProxy.create({
    promise: resolve(promise, label),
  }) as PromiseObjectProxy<T>;
}

function _promiseArray<I, T extends EmberArrayLike<I>>(promise: Promise<T>, label?: string): PromiseArray<I, T> {
  return PromiseArray.create({
    promise: resolve(promise, label),
  }) as unknown as PromiseArray<I, T>;
}

// constructor is accessed in some internals but not including it in the copyright for the deprecation
const ALLOWABLE_METHODS = ['constructor', 'then', 'catch', 'finally'];
const ALLOWABLE_PROPS = ['__ec_yieldable__', '__ec_cancel__'];
const PROXIED_ARRAY_PROPS = [
  'length',
  '[]',
  'firstObject',
  'lastObject',
  'meta',
  'content',
  'isPending',
  'isSettled',
  'isRejected',
  'isFulfilled',
  'promise',
  'reason',
];
const PROXIED_OBJECT_PROPS = ['content', 'isPending', 'isSettled', 'isRejected', 'isFulfilled', 'promise', 'reason'];

export function promiseArray<I, T extends EmberArrayLike<I>>(promise: Promise<T>): PromiseArray<I, T> {
  const promiseObjectProxy: PromiseArray<I, T> = _promiseArray(promise);
  if (!DEBUG) {
    return promiseObjectProxy;
  }
  const handler = {
    get(target: object, prop: string, receiver: object): unknown {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }
      if (ALLOWABLE_PROPS.includes(prop)) {
        return receiver[prop];
      }
      if (!ALLOWABLE_METHODS.includes(prop)) {
        deprecate(
          `Accessing ${prop} on this PromiseArray is deprecated. The return type is being changed from PromiseArray to a Promise. The only available methods to access on this promise are .then, .catch and .finally`,
          false,
          {
            id: 'ember-data:deprecate-promise-proxies',
            until: '5.0',
            for: '@ember-data/store',
            since: {
              available: '4.7',
              enabled: '4.7',
            },
          }
        );
      }

      const value: unknown = target[prop];
      if (value && typeof value === 'function' && typeof value.bind === 'function') {
        return value.bind(target);
      }

      if (PROXIED_ARRAY_PROPS.includes(prop)) {
        return value;
      }

      return undefined;
    },
  };

  return new Proxy(promiseObjectProxy, handler);
}

const ProxySymbolString = String(Symbol.for('PROXY_CONTENT'));

export function promiseObject<T>(promise: Promise<T>): PromiseObjectProxy<T> {
  const promiseObjectProxy: PromiseObjectProxy<T> = _promiseObject(promise);
  if (!DEBUG) {
    return promiseObjectProxy;
  }
  const handler = {
    get(target: object, prop: string, receiver: object): unknown {
      if (typeof prop === 'symbol') {
        if (String(prop) === ProxySymbolString) {
          return;
        }
        return Reflect.get(target, prop, receiver);
      }

      if (prop === 'constructor') {
        return target.constructor;
      }

      if (ALLOWABLE_PROPS.includes(prop)) {
        return receiver[prop];
      }

      if (!ALLOWABLE_METHODS.includes(prop)) {
        deprecate(
          `Accessing ${prop} on this PromiseObject is deprecated. The return type is being changed from PromiseObject to a Promise. The only available methods to access on this promise are .then, .catch and .finally`,
          false,
          {
            id: 'ember-data:deprecate-promise-proxies',
            until: '5.0',
            for: '@ember-data/store',
            since: {
              available: '4.7',
              enabled: '4.7',
            },
          }
        );
      } else {
        return (target[prop] as () => unknown).bind(target);
      }

      if (PROXIED_OBJECT_PROPS.includes(prop)) {
        return target[prop];
      }

      const value: unknown = get(target, prop);
      if (value && typeof value === 'function' && typeof value.bind === 'function') {
        return value.bind(receiver);
      }

      return undefined;
    },
  };

  return new Proxy(promiseObjectProxy, handler);
}
