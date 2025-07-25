import { computed } from '@ember/object';
import type PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import type ObjectProxy from '@ember/object/proxy';

import type { Store } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import { memoized } from '@warp-drive/core/store/-private';
import type { OpaqueRecordInstance, TypeFromInstanceOrString } from '@warp-drive/core/types/record';

import type { LegacySupport } from './legacy-relationships-support.ts';
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

export const LegacyPromiseProxy: unique symbol = Symbol.for('LegacyPromiseProxy');

interface PromiseObjectType<T> extends PromiseProxyMixin<T | null>, ObjectProxy<T> {
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new <PT>(...args: unknown[]): PromiseObjectType<PT>;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-extraneous-class
declare class PromiseObjectType<T> {}

const Extended: PromiseObjectType<OpaqueRecordInstance> =
  PromiseObject as unknown as PromiseObjectType<OpaqueRecordInstance>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PromiseBelongsTo<T> {
  [LegacyPromiseProxy]: true;
}

/**
  A PromiseBelongsTo is a PromiseObject that also proxies certain method calls
  to the underlying belongsTo model.
  Right now we proxy:
    * `reload()`
  @class PromiseBelongsTo
  @private
*/
class PromiseBelongsTo<T = unknown> extends Extended<T> {
  declare _belongsToState: BelongsToProxyMeta<T>;

  @memoized
  get id(): string | null {
    const { key, legacySupport } = this._belongsToState;
    const ref = legacySupport.referenceFor('belongsTo', key);

    return ref.id();
  }

  // we don't proxy meta because we would need to proxy it to the relationship state container
  //  however, meta on relationships does not trigger change notifications.
  //  if you need relationship meta, you should do `record.belongsTo(relationshipName).meta()`
  @computed()
  get meta(): void {
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
PromiseBelongsTo.prototype[LegacyPromiseProxy] = true as const;

export { PromiseBelongsTo };
