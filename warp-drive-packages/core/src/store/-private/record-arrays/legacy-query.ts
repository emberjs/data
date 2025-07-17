import { assert } from '@warp-drive/core/build-config/macros';

import { Context } from '../../../reactive/-private.ts';
import type { ObjectValue } from '../../../types/json/raw.ts';
import type { ImmutableRequestInfo } from '../../../types/request.ts';
import type { Links, Meta, PaginationLinks } from '../../../types/spec/json-api-raw.ts';
import type { RecordArrayManager } from '../managers/record-array-manager.ts';
import { type MinimumManager, save, update } from './-utils.ts';
import type { LegacyLiveArray, LegacyLiveArrayCreateOptions } from './legacy-live-array.ts';
import { createReactiveResourceArray, destroy, type ReactiveResourceArray } from './resource-array.ts';

/**
 * QueryArrays contain the primary records returned when querying
 * for records by `ResourceType`.
 *
 * ### Basic Example
 *
 * For instance, if an application were to have a `'user'` type:
 *
 * ```ts
 * const users = await store.query('user', { name: 'Chris' });
 * ```
 *
 * ---
 *
 * &nbsp;
 *
 * ### QueryArrays are Arrays
 *
 * QueryArrays have all array APIs, and will report `true`
 * for both `queryArray instanceof Array` and `Array.isArray(queryArray)`
 *
 * However, any mutation of the array will throw an error.
 *
 * ---
 *
 * &nbsp;
 *
 * ### Reactive
 *
 * If a record in a QueryArray is deleted and unloaded, it will be
 * automatically removed from the array.
 *
 * ---
 *
 * &nbsp;
 *
 * ### Immutable
 *
 * Records cannot be directly added to or removed from a QueryArray.
 *
 * ---
 *
 * &nbsp;
 *
 * ### Polymorphism
 *
 * QueryArrays are not intended to be polymorphic. If your application has
 * an abstract type "car" with concrete types "ferrari" and "bmw", a query
 * which returns primary data containing both ferraris and bmws will *likely*
 * work, but it is not guaranteed.
 *
 * In contrast, the {@link ReactiveResourceArray} returned when using {@link Store.request}
 * is guaranteed to work with polymorphic responses.
 *
 * ---
 *
 * &nbsp;
 *
 * ### Memory Leaks
 *
 * QueryArrays are meant to be long lived. They can be refreshed using
 * `array.update()`, and destroyed via `array.destroy()`.
 *
 * Unlike most Reactive state in WarpDrive, applications must choose to call
 * `destroy` when the `QueryArray` is no longer needed, else the array instance
 * will be retained until either the application or the store which created it
 * are destroyed. Destroying a QueryArray does not remove its records
 * from the cache, but it does remove the array as well as the overhead it requires
 * from the store for book-keeping.
 *
 * @legacy we recommend againt using QueryArrays. Use {@link Store.request} instead
 */
export interface LegacyQueryArray<T = unknown> extends LegacyLiveArray<T> {
  query: ImmutableRequestInfo | Record<string, unknown> | null;
  destroy(): void;
  links: PaginationLinks | Links | null;
  meta: Meta | null;
}

/**
 * The options for {@link createLegacyQueryArray}
 *
 * See also {@link LegacyLiveArrayCreateOptions} which
 * this extends.
 *
 * @internal
 */
export interface LegacyQueryArrayCreateOptions extends LegacyLiveArrayCreateOptions {
  query: ImmutableRequestInfo | Record<string, unknown> | null;
  isLoaded: boolean;
  links: PaginationLinks | Links | null;
  meta: Meta | null;
}

/**
 * Creates a {@link LegacyQueryArray}
 *
 * Options: {@link LegacyQueryArrayCreateOptions}
 *
 * @internal
 */
export function createLegacyQueryArray<T = unknown>(options: LegacyQueryArrayCreateOptions): LegacyQueryArray<T> {
  return createReactiveResourceArray({
    store: options.store,
    manager: options.manager,
    editable: false,
    source: options.source,
    data: {
      links: options.links,
      meta: options.meta,
    } as ObjectValue,
    features: {
      modelName: options.type,
      update,
      _update: _updateCollection,
      save,
      DEPRECATED_CLASS_NAME: 'LegacyQueryArray',
      isUpdating: false,
      isLoaded: options.isLoaded,
      _updatingPromise: null,
    },
    extensions: null,
    options: null,
    destroy: destroyCollection,
    mutate: null,
  }) as LegacyQueryArray<T>;
}

function _updateCollection(this: LegacyQueryArray): Promise<LegacyQueryArray> {
  const context = this[Context];
  const { query } = this;

  assert(`update cannot be used with this array`, this.modelName);
  assert(`update cannot be used with no query`, query);
  // @ts-expect-error typescript is unable to handle the complexity of
  //   T = unknown, modelName = string
  //   T extends TypedRecordInstance, modelName = TypeFromInstance<T>
  // both being valid options to pass through here.
  const promise = context.store.query<T>(this.modelName, query as Record<string, unknown>, { _recordArray: this });

  return promise;
}

function upgradeManager(obj: MinimumManager): asserts obj is RecordArrayManager {}

function destroyCollection(this: ReactiveResourceArray, clear: boolean): void {
  destroy.call(this, clear ?? false);
  const { manager } = this[Context];
  upgradeManager(manager);
  manager._managed.delete(this);
  manager._pending.delete(this);
}
