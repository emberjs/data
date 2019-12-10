import { assert } from '@ember/debug';
import { get } from '@ember/object';
import { reads } from '@ember/object/computed';

import { Promise } from 'rsvp';

import { FULL_LINKS_ON_RELATIONSHIPS } from '@ember-data/canary-features';
import { PromiseArray } from '@ember-data/store/-private';

/**
 @module @ember-data/model
 */

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
  @extends Ember.ArrayProxy
  @private
*/
const PromiseManyArray = PromiseArray.extend({
  links: FULL_LINKS_ON_RELATIONSHIPS ? reads('content.links') : undefined,
  reload(options) {
    assert('You are trying to reload an async manyArray before it has been created', get(this, 'content'));
    this.set('promise', this.get('content').reload(options));
    return this;
  },
  createRecord: proxyToContent('createRecord'),
  on: proxyToContent('on'),
  one: proxyToContent('one'),
  trigger: proxyToContent('trigger'),
  off: proxyToContent('off'),
  has: proxyToContent('has'),
});

export default PromiseManyArray;

export function promiseManyArray(promise, label) {
  return PromiseManyArray.create({
    promise: Promise.resolve(promise, label),
  });
}

function proxyToContent(method) {
  return function() {
    return get(this, 'content')[method](...arguments);
  };
}
