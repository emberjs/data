import ObjectProxy from '@ember/object/proxy';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ArrayProxy from './record-arrays/array-proxy';
import { computed, setProperties, notifyPropertyChange } from '@ember/object';
import { Promise } from 'rsvp';
import { assert } from '@ember/debug';

const ARRAY_OBSERVER_MAPPING = {
  willChange: '_contentArrayWillChange',
  didChange: '_contentArrayDidChange',
};
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
  let promiseArray = DS.PromiseArray.create({
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
export class PromiseArray extends ArrayProxy {
  constructor(options) {
    super(options);
    this.reason = null;
    this.isRejected = false;
    this.isFulfilled = false;
    this._content = options.content || null;
  }
  get meta() {
    return this.content ? this.content.meta : null;
  }

  get content() {
    return this._content;
  }

  set content(content) {
    if (this._content) {
      this._content.removeArrayObserver(this, ARRAY_OBSERVER_MAPPING);
    }
    this._content = content;
    if (this._content) {
      this._content.addArrayObserver(this, ARRAY_OBSERVER_MAPPING);
    }
  }

  willDestroy() {
    if (this._content) {
      this._content.removeArrayObserver(this, ARRAY_OBSERVER_MAPPING);
    }
    super.willDestroy(...arguments);
  }

  _contentArrayWillChange() {}

  _contentArrayDidChange(proxy, idx, removedCnt, addedCnt) {
    this.arrayContentWillChange(idx, removedCnt, addedCnt);
    this.arrayContentDidChange(idx, removedCnt, addedCnt);
  }

  get isPending() {
    return !this.isSettled;
  }

  get isSettled() {
    return this.isRejected || this.isFulfilled;
  }

  get promise() {
    return this._promise;
  }
  set promise(promise) {
    this._promise = tap(this, promise);
  }

  then() {
    return this.promise.then(...arguments);
  }
  catch() {
    return this.promise.catch(...arguments);
  }
  finally() {
    return this.promise.finally(...arguments);
  }
}

function tap(proxy, promise) {
  setProperties(proxy, {
    isFulfilled: false,
    isRejected: false,
  });
  notifyPropertyChange(proxy, 'isSettled');
  notifyPropertyChange(proxy, 'isPending');

  return promise.then(
    value => {
      if (!proxy.isDestroyed && !proxy.isDestroying) {
        setProperties(proxy, {
          content: value,
          isFulfilled: true,
        });
        notifyPropertyChange(proxy, 'isSettled');
        notifyPropertyChange(proxy, 'isPending');
      }
      return value;
    },
    reason => {
      if (!proxy.isDestroyed && !proxy.isDestroying) {
        setProperties(proxy, {
          reason,
          isRejected: true,
        });
        notifyPropertyChange(proxy, 'isSettled');
        notifyPropertyChange(proxy, 'isPending');
      }
      throw reason;
    },
    'Ember: PromiseProxy'
  );
}

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
  let promiseObject = DS.PromiseObject.create({
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

export const PromiseBelongsTo = PromiseObject.extend({
  // we don't proxy meta because we would need to proxy it to the relationship state container
  //  however, meta on relationships does not trigger change notifications.
  //  if you need relationship meta, you should do `record.belongsTo(relationshipName).meta()`
  meta: computed(function() {
    assert(
      'You attempted to access meta on the promise for the async belongsTo relationship ' +
        `${this.get('_belongsToState').internalModel.modelName}:${
          this.get('_belongsToState').key
        }'.` +
        '\nUse `record.belongsTo(relationshipName).meta()` instead.',
      false
    );
  }),

  reload(options) {
    assert(
      'You are trying to reload an async belongsTo before it has been created',
      this.get('content') !== undefined
    );
    let { key, store, originatingInternalModel } = this._belongsToState;

    return store.reloadBelongsTo(this, originatingInternalModel, key, options).then(() => this);
  },
});

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
export class PromiseManyArray extends PromiseArray {
  reload(options) {
    assert('You are trying to reload an async manyArray before it has been created', this.content);
    this.promise = this.content.reload(options);
    this.notifyPropertyChange('promise');
    return this;
  }

  createRecord() {
    return this.content.createRecord(...arguments);
  }

  on() {
    return this.content.on(...arguments);
  }

  one() {
    return this.content.one(...arguments);
  }

  trigger() {
    return this.content.trigger(...arguments);
  }

  off() {
    return this.content.off(...arguments);
  }

  has() {
    return this.content.has(...arguments);
  }
}

export function promiseManyArray(promise, label) {
  return PromiseManyArray.create({
    promise: Promise.resolve(promise, label),
  });
}
