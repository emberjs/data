import { assert } from '@ember/debug';
import { computed } from '@ember/object';
import type PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import type ObjectProxy from '@ember/object/proxy';

import type Store from '@ember-data/store';
import type { OpaqueRecordInstance } from '@ember-data/store/-types/q/record-instance';
import { cached } from '@ember-data/tracking';
import type { TypeFromInstanceOrString } from '@warp-drive/core-types/record';

import type { LegacySupport } from './legacy-relationships-support';
import { PromiseObject } from './promise-proxy-base';

export interface BelongsToProxyMeta<T = unknown> {
  key: string;
  store: Store;
  legacySupport: LegacySupport;
  modelName: TypeFromInstanceOrString<T>;
}
export interface BelongsToProxyCreateArgs<T = unknown> {
  promise: Promise<T | null>;
  content?: T | null;
  _belongsToState: BelongsToProxyMeta<T>;
}

interface PromiseObjectType<T> extends PromiseProxyMixin<T | null>, ObjectProxy<T> {
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new <PT>(...args: unknown[]): PromiseObjectType<PT>;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare class PromiseObjectType<T> {}

const Extended: PromiseObjectType<OpaqueRecordInstance> =
  PromiseObject as unknown as PromiseObjectType<OpaqueRecordInstance>;

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
class PromiseBelongsTo<T = unknown> extends Extended<T> {
  declare _belongsToState: BelongsToProxyMeta<T>;

  @cached
  get id(): string | null {
    const { key, legacySupport } = this._belongsToState;
    const ref = legacySupport.referenceFor('belongsTo', key);

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
          `${this._belongsToState.modelName}:${this._belongsToState.key}'.` +
          '\nUse `record.belongsTo(relationshipName).meta()` instead.',
        false
      );
    }
    return;
  }

  async reload(options: Record<string, unknown>): Promise<this> {
    assert('You are trying to reload an async belongsTo before it has been created', this.content !== undefined);
    const { key, legacySupport } = this._belongsToState;
    await legacySupport.reloadBelongsTo(key, options);
    return this;
  }
}

export { PromiseBelongsTo };
