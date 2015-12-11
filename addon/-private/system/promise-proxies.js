import Ember from 'ember';
import { assert } from "ember-data/-private/debug";

var Promise = Ember.RSVP.Promise;
var get = Ember.get;

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
  var promiseArray = DS.PromiseArray.create({
    promise: $.getJSON('/some/remote/data.json')
  });

  promiseArray.get('length'); // 0

  promiseArray.then(function() {
    promiseArray.get('length'); // 100
  });
  ```

  @class PromiseArray
  @namespace DS
  @extends Ember.ArrayProxy
  @uses Ember.PromiseProxyMixin
*/
var PromiseArray = Ember.ArrayProxy.extend(Ember.PromiseProxyMixin);

/**
  A `PromiseObject` is an object that acts like both an `Ember.Object`
  and a promise. When the promise is resolved, then the resulting value
  will be set to the `PromiseObject`'s `content` property. This makes
  it easy to create data bindings with the `PromiseObject` that will
  be updated when the promise resolves.

  For more information see the [Ember.PromiseProxyMixin
  documentation](/api/classes/Ember.PromiseProxyMixin.html).

  Example

  ```javascript
  var promiseObject = DS.PromiseObject.create({
    promise: $.getJSON('/some/remote/data.json')
  });

  promiseObject.get('name'); // null

  promiseObject.then(function() {
    promiseObject.get('name'); // 'Tomster'
  });
  ```

  @class PromiseObject
  @namespace DS
  @extends Ember.ObjectProxy
  @uses Ember.PromiseProxyMixin
*/
var PromiseObject = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin);

var promiseObject = function(promise, label) {
  return PromiseObject.create({
    promise: Promise.resolve(promise, label)
  });
};

var promiseArray = function(promise, label) {
  return PromiseArray.create({
    promise: Promise.resolve(promise, label)
  });
};

/**
  A PromiseManyArray is a PromiseArray that also proxies certain method calls
  to the underlying manyArray.
  Right now we proxy:

    * `reload()`
    * `createRecord()`
    * `on()`
    * `one()`
    * `trigger()`
    * `off()`
    * `has()`

  @class PromiseManyArray
  @namespace DS
  @extends Ember.ArrayProxy
*/

function proxyToContent(method) {
  return function() {
    var content = get(this, 'content');
    return content[method].apply(content, arguments);
  };
}

var PromiseManyArray = PromiseArray.extend({
  reload() {
    //I don't think this should ever happen right now, but worth guarding if we refactor the async relationships
    assert('You are trying to reload an async manyArray before it has been created', get(this, 'content'));
    return PromiseManyArray.create({
      promise: get(this, 'content').reload()
    });
  },

  createRecord: proxyToContent('createRecord'),

  on: proxyToContent('on'),

  one: proxyToContent('one'),

  trigger: proxyToContent('trigger'),

  off: proxyToContent('off'),

  has: proxyToContent('has')
});

var promiseManyArray = function(promise, label) {
  return PromiseManyArray.create({
    promise: Promise.resolve(promise, label)
  });
};


export {
  PromiseArray,
  PromiseObject,
  PromiseManyArray,
  promiseArray,
  promiseObject,
  promiseManyArray
};
