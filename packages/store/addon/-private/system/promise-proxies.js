import ArrayProxy from '@ember/array/proxy';
import { reads } from '@ember/object/computed';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ObjectProxy from '@ember/object/proxy';

import { Promise } from 'rsvp';

/**
  @module @ember-data/store
*/

/**
  A `PromiseArray` is an object that acts like both an `Ember.Array`
  and a promise. When the promise is resolved the resulting value
  will be set to the `PromiseArray`'s `content` property. This makes
  it easy to create data bindings with the `PromiseArray` that will be
  updated when the promise resolves.

  For more information see the [Ember.PromiseProxyMixin
  documentation](/api/classes/Ember.PromiseProxyMixin.html).

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
  @extends Ember.ArrayProxy
  @uses Ember.PromiseProxyMixin
*/
export const PromiseArray = ArrayProxy.extend(PromiseProxyMixin, {
  meta: reads('content.meta'),
});

/**
  A `PromiseObject` is an object that acts like both an `EmberObject`
  and a promise. When the promise is resolved, then the resulting value
  will be set to the `PromiseObject`'s `content` property. This makes
  it easy to create data bindings with the `PromiseObject` that will
  be updated when the promise resolves.

  For more information see the [Ember.PromiseProxyMixin
  documentation](/api/classes/Ember.PromiseProxyMixin.html).

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
  @extends Ember.ObjectProxy
  @uses Ember.PromiseProxyMixin
*/
export let PromiseObject = ObjectProxy.extend(PromiseProxyMixin);

export function promiseObject(promise, label) {
  return PromiseObject.create({
    promise: Promise.resolve(promise, label),
  });
}

export function promiseArray(promise, label) {
  return PromiseArray.create({
    promise: Promise.resolve(promise, label),
  });
}
