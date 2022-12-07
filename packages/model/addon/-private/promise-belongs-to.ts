import { assert } from '@ember/debug';
import { computed } from '@ember/object';
import type PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import type ObjectProxy from '@ember/object/proxy';
import { cached } from '@glimmer/tracking';

import type Store from '@ember-data/store';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { Dict } from '@ember-data/types/q/utils';

import { LegacySupport } from './legacy-relationships-support';
import { PromiseObject } from './promise-proxy-base';
import type BelongsToReference from './references/belongs-to';

export interface BelongsToProxyMeta {
  key: string;
  store: Store;
  legacySupport: LegacySupport;
  modelName: string;
}
export interface BelongsToProxyCreateArgs {
  promise: Promise<RecordInstance | null>;
  content?: RecordInstance | null;
  _belongsToState: BelongsToProxyMeta;
}

interface PromiseObjectType<T extends object> extends PromiseProxyMixin<T | null>, ObjectProxy<T> {
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
class PromiseBelongsTo extends Extended<RecordInstance> {
  declare _belongsToState: BelongsToProxyMeta;

  @cached
  get id() {
    const { key, legacySupport } = this._belongsToState;
    const ref = legacySupport.referenceFor('belongsTo', key) as BelongsToReference;

    return ref.id();
  }

  // we don't proxy meta because we would need to proxy it to the relationship state container
  //  however, meta on relationships does not trigger change notifications.
  //  if you need relationship meta, you should do `record.belongsTo(relationshipName).meta()`
  @computed()
  get meta() {
    // eslint-disable-next-line no-constant-condition
    if (1) {
      assert(
        'You attempted to access meta on the promise for the async belongsTo relationship ' +
          `${this.get('_belongsToState').modelName}:${this.get('_belongsToState').key}'.` +
          '\nUse `record.belongsTo(relationshipName).meta()` instead.',
        false
      );
    }
    return;
  }

  async reload(options: Dict<unknown>): Promise<this> {
    assert('You are trying to reload an async belongsTo before it has been created', this.content !== undefined);
    let { key, legacySupport } = this._belongsToState;
    await legacySupport.reloadBelongsTo(key, options);
    return this;
  }
}

export default PromiseBelongsTo;
