import { assert } from '@ember/debug';
import { computed } from '@ember/object';
import type PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import type ObjectProxy from '@ember/object/proxy';

import { PromiseObject } from '@ember-data/store/-private';

type RecordInstance = import('@ember-data/store/-private/ts-interfaces/record-instance').RecordInstance;
type InternalModel<T> = import('@ember-data/store/-private').InternalModel<T>;
type CoreStore<T> = import('@ember-data/store/-private/system/core-store').default<T>;
type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;

export interface BelongsToProxyMeta<T extends RecordInstance> {
  key: string;
  store: CoreStore<T>;
  originatingInternalModel: InternalModel<T>;
  modelName: string;
}
export interface BelongsToProxyCreateArgs<T extends RecordInstance> {
  promise: Promise<T | null>;
  content?: T | null;
  _belongsToState: BelongsToProxyMeta<T>;
}

interface PromiseObjectType<T extends object> extends PromiseProxyMixin<T>, ObjectProxy<T> {
  new <T extends object>(...args: unknown[]): PromiseObjectType<T>;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare class PromiseObjectType<T extends object> {}

const Extended: PromiseObjectType<RecordInstance> = PromiseObject as unknown as PromiseObjectType<RecordInstance>;

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
class PromiseBelongsTo<T extends RecordInstance> extends Extended<T> {
  declare _belongsToState: BelongsToProxyMeta<T>;
  // we don't proxy meta because we would need to proxy it to the relationship state container
  //  however, meta on relationships does not trigger change notifications.
  //  if you need relationship meta, you should do `record.belongsTo(relationshipName).meta()`
  @computed()
  get meta(): void {
    return assert(
      'You attempted to access meta on the promise for the async belongsTo relationship ' +
        `${this.get('_belongsToState').modelName}:${this.get('_belongsToState').key}'.` +
        '\nUse `record.belongsTo(relationshipName).meta()` instead.',
      false
    );
  }

  async reload(options: Dict<unknown>): Promise<this> {
    assert('You are trying to reload an async belongsTo before it has been created', this.content !== undefined);
    let { key, store, originatingInternalModel } = this._belongsToState;
    await store.reloadBelongsTo(this, originatingInternalModel, key, options);
    return this;
  }
}

export default PromiseBelongsTo;
