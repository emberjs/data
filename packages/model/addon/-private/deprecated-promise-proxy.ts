import { deprecate } from '@ember/debug';

import { resolve } from 'rsvp';

import { PromiseObject } from './promise-proxy-base';

function promiseObject<T>(promise: Promise<T>): PromiseObject<T> {
  return PromiseObject.create({
    promise: resolve(promise),
  }) as PromiseObject<T>;
}

// constructor is accessed in some internals but not including it in the copyright for the deprecation
const ALLOWABLE_METHODS = ['constructor', 'then', 'catch', 'finally'];
const PROXIED_OBJECT_PROPS = ['content', 'isPending', 'isSettled', 'isRejected', 'isFulfilled', 'promise', 'reason'];

export function deprecatedPromiseObject<T>(promise: Promise<T>): PromiseObject<T> {
  const promiseObjectProxy: PromiseObject<T> = promiseObject(promise);
  const handler = {
    get(target: object, prop: string, receiver?: object): unknown {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }
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

      const value: unknown = target[prop];
      if (value && typeof value === 'function' && typeof value.bind === 'function') {
        return value.bind(target);
      }

      if (PROXIED_OBJECT_PROPS.includes(prop)) {
        return value;
      }

      return undefined;
    },
  };

  return new Proxy(promiseObjectProxy, handler);
}
