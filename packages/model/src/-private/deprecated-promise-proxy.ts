import { deprecate } from '@ember/debug';
import { get } from '@ember/object';
import { DEBUG } from '@glimmer/env';

import { resolve } from 'rsvp';

import { PromiseObject } from './promise-proxy-base';

function promiseObject<T>(promise: Promise<T>): PromiseObject<T> {
  return PromiseObject.create({
    promise: resolve(promise),
  }) as PromiseObject<T>;
}

// constructor is accessed in some internals but not including it in the copyright for the deprecation
const ALLOWABLE_METHODS = ['constructor', 'then', 'catch', 'finally'];
const ALLOWABLE_PROPS = ['__ec_yieldable__', '__ec_cancel__'];
const PROXIED_OBJECT_PROPS = ['content', 'isPending', 'isSettled', 'isRejected', 'isFulfilled', 'promise', 'reason'];

const ProxySymbolString = String(Symbol.for('PROXY_CONTENT'));

export function deprecatedPromiseObject<T>(promise: Promise<T>): PromiseObject<T> {
  const promiseObjectProxy: PromiseObject<T> = promiseObject(promise);
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
        return target[prop];
      }

      if (!ALLOWABLE_METHODS.includes(prop)) {
        deprecate(
          `Accessing ${prop} is deprecated. The return type is being changed from PromiseObjectProxy to a Promise. The only available methods to access on this promise are .then, .catch and .finally`,
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
