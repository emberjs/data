import { deprecate } from '@ember/debug';
import { get } from '@ember/object';

import { DEBUG } from '@warp-drive/build-config/env';

import type IdentifierArray from '../record-arrays/identifier-array';
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

function _promiseObject<T>(promise: Promise<T>): Promise<T> {
  return PromiseObjectProxy.create({ promise }) as Promise<T>;
}

function _promiseArray<T>(promise: Promise<IdentifierArray<T>>): Promise<IdentifierArray<T>> {
  // @ts-expect-error this bucket of lies allows us to avoid typing the promise proxy which would
  // require us to override a lot of Ember's types.
  return PromiseArrayProxy.create({ promise }) as unknown as Promise<IdentifierArray<T>>;
}

// constructor is accessed in some internals but not including it in the copyright for the deprecation
const ALLOWABLE_METHODS = ['constructor', 'then', 'catch', 'finally'];
const ALLOWABLE_PROPS = ['__ec_yieldable__', '__ec_cancel__'] as const;
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

function isAllowedProp(prop: string): prop is (typeof ALLOWABLE_PROPS)[number] {
  return ALLOWABLE_PROPS.includes(prop as (typeof ALLOWABLE_PROPS)[number]);
}

type SensitiveArray<T> = {
  __ec_yieldable__: unknown;
  __ec_cancel__: unknown;
} & Promise<IdentifierArray<T>>;

type SensitiveObject<T> = {
  __ec_yieldable__: unknown;
  __ec_cancel__: unknown;
} & Promise<T>;

export function promiseArray<T>(promise: Promise<IdentifierArray<T>>): Promise<IdentifierArray<T>> {
  const promiseObjectProxy = _promiseArray(promise);
  if (!DEBUG) {
    return promiseObjectProxy;
  }
  const handler = {
    get(target: SensitiveArray<T>, prop: string, receiver: object): unknown {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }
      if (isAllowedProp(prop)) {
        return target[prop];
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

      // @ts-expect-error difficult to coerce target to the classic ember proxy
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

export function promiseObject<T>(promise: Promise<T>): Promise<T> {
  const promiseObjectProxy = _promiseObject(promise);
  if (!DEBUG) {
    return promiseObjectProxy;
  }
  const handler = {
    get(target: SensitiveObject<T>, prop: string, receiver: object): unknown {
      if (typeof prop === 'symbol') {
        if (String(prop) === ProxySymbolString) {
          return;
        }
        return Reflect.get(target, prop, receiver);
      }

      if (prop === 'constructor') {
        return target.constructor;
      }

      if (isAllowedProp(prop)) {
        return target[prop];
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
        // @ts-expect-error difficult to coerce target to the classic ember proxy
        return (target[prop] as () => unknown).bind(target);
      }

      if (PROXIED_OBJECT_PROPS.includes(prop)) {
        // @ts-expect-error difficult to coerce target to the classic ember proxy
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
