import { assert } from '@warp-drive/core/build-config/macros';

import { Context } from '../../../reactive/-private.ts';
import type { ResourceKey } from '../../../types/identifier.ts';
import type { TypeFromInstanceOrString } from '../../../types/record.ts';
import type { Store } from '../store-service.ts';
import type { LegacyArray, MinimumManager } from './-utils.ts';
import { save, update } from './-utils.ts';
import type { ReactiveResourceArray } from './resource-array.ts';
import { createReactiveResourceArray } from './resource-array.ts';

/**
 * LiveArrays contain all the known records for a given `ResourceType`.
 *
 * ### Basic Example
 *
 * For instance, if an application were to have a `'user'` type:
 *
 * ```ts
 * const usersLiveArray = store.peekAll('user');
 * ```
 *
 * ---
 *
 * &nbsp;
 *
 * ### LiveArrays are Arrays
 *
 * LiveArrays have all array APIs, and will report `true`
 * for both `liveArray instanceof Array` and `Array.isArray(liveArray)`
 *
 * ---
 *
 * &nbsp;
 *
 * ### Reactive
 *
 * The array is "live" as it will reactively update any time new
 * users are added to the store's cache.
 *
 * There is only one LiveArray instance per ResourceType, and it
 * can be accessed either via {@link Store.peekAll} or {@link Store.findAll}
 *
 * ```ts
 * const users = await store.findAll('user');
 * const peekedUsers = store.peekAll('user');
 * peekedUsers === users; // true
 * ```
 *
 * ---
 *
 * &nbsp;
 *
 * ### New Records
 *
 * Records in the `"new"` state (created locally on the client
 * but not yet saved) appear in LiveArrays if they are in LegacyMode.
 *
 * PolarisMode records in the `"new"` state do not appear in LiveArrays.
 *
 * ---
 *
 * &nbsp;
 *
 * ### Polymorphism
 *
 * LiveArrays are not polymorphic. If your application has an abstract
 * type "car" with concrete types "ferrari" and "bmw", then "ferrari"
 * and "bmw" will have populated LiveArrays, but the LiveArray for "car"
 * would be empty.
 *
 * @legacy we recommend againt using LiveArrays. Use {@link Store.request} instead
 */
export interface LegacyLiveArray<T = unknown> extends LegacyArray<T> {
  isLoaded: boolean;

  /** @internal */
  DEPRECATED_CLASS_NAME: string;

  modelName: TypeFromInstanceOrString<T>;
}

/**
 * The options for {@link createLegacyLiveArray}
 *
 * @internal
 */
export interface LegacyLiveArrayCreateOptions {
  store: Store;
  manager: MinimumManager;
  source: ResourceKey[];
  type: string;
}

/**
 * Creates a {@link LegacyLiveArray}
 *
 * @internal
 */
export function createLegacyLiveArray(options: LegacyLiveArrayCreateOptions): LegacyLiveArray {
  return createReactiveResourceArray({
    store: options.store,
    manager: options.manager,
    editable: false,
    source: options.source,
    data: null,
    features: {
      modelName: options.type,
      update,
      _update: _updateLiveArray,
      save,
      DEPRECATED_CLASS_NAME: 'LiveArray',
      isUpdating: false,
      isLoaded: true,
      _updatingPromise: null,
    },
    extensions: null,
    options: null,
    destroy: null,
    mutate: null,
  }) as LegacyLiveArray;
}

function upgradeThis(obj: unknown): asserts obj is LegacyLiveArray {}

function _updateLiveArray(this: ReactiveResourceArray): Promise<ReactiveResourceArray> {
  upgradeThis(this);
  const context = this[Context];
  assert(`_update cannot be used with this array`, this.modelName);
  // @ts-expect-error typescript is unable to handle the complexity of
  //   T = unknown, modelName = string
  //   T extends TypedRecordInstance, modelName = TypeFromInstance<T>
  // both being valid options to pass through here.
  return context.store.findAll<T>(this.modelName, { reload: true });
}
