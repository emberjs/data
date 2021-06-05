import ArrayProxy from '@ember/array/proxy';
import { reads } from '@ember/object/computed';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ObjectProxy from '@ember/object/proxy';

import { resolve } from 'rsvp';

type NativeArray<T> = import('@ember/array/-private/native-array').default<T>;

type ComputedProperty<T> = import('@ember/object/computed').default<T>;
type Dict<T> = import('../ts-interfaces/utils').Dict<T>;

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

export interface PromiseArray<I, T extends EmberArrayLike<I> = NativeArray<I>> extends PromiseLike<T> {}
export class PromiseArray<I, T extends EmberArrayLike<I> = NativeArray<I>> extends ArrayProxy.extend(
  PromiseProxyMixin
) {
  declare content: T;
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
export interface PromiseObject<T extends object> extends PromiseLike<T> {}
export class PromiseObject<T extends object> extends ObjectProxy.extend(PromiseProxyMixin) {
  declare content: T | undefined;
  declare promise: Promise<T>;
}

export function promiseObject<T extends object>(promise: Promise<T>, label?: string): PromiseObject<T> {
  return PromiseObject.create({
    promise: resolve(promise, label),
  }) as unknown as PromiseObject<T>;
}

export function promiseArray<I, T extends EmberArrayLike<I> = NativeArray<I>>(
  promise: Promise<T>,
  label?: string
): PromiseArray<I, T> {
  return PromiseArray.create({
    promise: resolve(promise, label),
  }) as unknown as PromiseArray<I, T>;
}
