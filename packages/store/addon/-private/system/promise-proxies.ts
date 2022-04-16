import type NativeArray from '@ember/array/-private/native-array';
import { deprecate } from '@ember/debug';
import type ComputedProperty from '@ember/object/computed';
import { reads } from '@ember/object/computed';

import { resolve } from 'rsvp';

import { RecordInstance } from '../ts-interfaces/record-instance';
import type { Dict } from '../ts-interfaces/utils';
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

export class PromiseArray<I, T extends EmberArrayLike<I> = NativeArray<I>> extends PromiseArrayProxy<I, T> {
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
export const PromiseObject = PromiseObjectProxy;

export function promiseObject<T extends object>(promise: Promise<T>, label: string) {
  return PromiseObjectProxy.create({
    promise: resolve(promise, label),
  });
}

export function promiseArray<I, T extends EmberArrayLike<I> = NativeArray<I>>(
  promise: Promise<T>,
  label?: string
): PromiseArray<I, T> {
  return PromiseArray.create({
    promise: resolve(promise, label),
  }) as unknown as PromiseArray<I, T>;
}

// constructor is accessed in some internals but not including it in the copyright for the deprecation
const ALLOWABLE_METHODS = ['constructor', 'then', 'catch', 'finally'];

export function deprecatedPromiseObject(promise) {
  const handler = {
    get(target, prop) {
      if (!ALLOWABLE_METHODS.includes(prop)) {
        deprecate(
          `Accessing ${prop} is deprecated.  Only available methods to access on a promise returned from model.save() are .then, .catch and .finally`,
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

      /* global Reflect */
      return Reflect.get(...arguments).bind(target);
    },
  };

  /* global Proxy */
  return new Proxy(promise, handler);
}
