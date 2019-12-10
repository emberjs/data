import { assert } from '@ember/debug';
import { computed } from '@ember/object';

import { PromiseObject } from '@ember-data/store/-private';

/**
 @module @ember-data/model
 */

/**
  A PromiseBelongsTo is a PromiseObject that also proxies certain method calls
  to the underlying belongsTo model.
  Right now we proxy:

    * `reload()`

  @class PromiseBelongsTo
  @extends PromiseObject
  @private
*/
const PromiseBelongsTo = PromiseObject.extend({
  // we don't proxy meta because we would need to proxy it to the relationship state container
  //  however, meta on relationships does not trigger change notifications.
  //  if you need relationship meta, you should do `record.belongsTo(relationshipName).meta()`
  meta: computed(function() {
    assert(
      'You attempted to access meta on the promise for the async belongsTo relationship ' +
        `${this.get('_belongsToState').modelName}:${this.get('_belongsToState').key}'.` +
        '\nUse `record.belongsTo(relationshipName).meta()` instead.',
      false
    );
  }),

  reload(options) {
    assert('You are trying to reload an async belongsTo before it has been created', this.get('content') !== undefined);
    let { key, store, originatingInternalModel } = this._belongsToState;
    return store.reloadBelongsTo(this, originatingInternalModel, key, options).then(() => this);
  },
});

export default PromiseBelongsTo;
