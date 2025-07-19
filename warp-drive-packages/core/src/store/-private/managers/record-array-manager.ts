import { assert } from '@warp-drive/core/build-config/macros';

import { Context } from '../../../reactive/-private.ts';
import { getOrSetGlobal } from '../../../types/-private.ts';
import type { LocalRelationshipOperation } from '../../../types/graph.ts';
import type { ResourceKey,StableDocumentIdentifier } from '../../../types/identifier.ts';
import type { ImmutableRequestInfo } from '../../../types/request.ts';
import type { CollectionResourceDocument } from '../../../types/spec/json-api-raw.ts';
import { notifyInternalSignal } from '../new-core-tmp/reactivity/internal.ts';
import type { LegacyLiveArray } from '../record-arrays/legacy-live-array.ts';
import { createLegacyLiveArray } from '../record-arrays/legacy-live-array.ts';
import {
  createLegacyQueryArray,
  type LegacyQueryArray,
  type LegacyQueryArrayCreateOptions,
} from '../record-arrays/legacy-query.ts';
import {
  createRequestCollection,
  type ReactiveRequestCollectionCreateArgs,
  type ReactiveResourceArray,
} from '../record-arrays/resource-array.ts';
import type { Store } from '../store-service.ts';
import type { CacheOperation, DocumentCacheOperation, UnsubscribeToken } from './notification-manager.ts';

const FAKE_ARR = getOrSetGlobal('FAKE_ARR', {});
const SLICE_BATCH_SIZE = 4761;
/**
 * This is a clever optimization.
 *
 * clever optimizations rarely stand the test of time, so if you're
 * ever curious or think something better is possible please benchmark
 * and discuss. The benchmark for this at the time of writing is in
 * `scripts/benchmark-push.js`
 *
 * This approach turns out to be 150x faster in Chrome and node than
 * simply using push or concat. It's highly susceptible to the specifics
 * of the batch size, and may require tuning.
 *
 * Clever optimizations should always come with a `why`. This optimization
 * exists for two reasons.
 *
 * 1) array.push(...objects) and Array.prototype.push.apply(arr, objects)
 *   are susceptible to stack overflows. The size of objects at which this
 *   occurs varies by environment, browser, and current stack depth and memory
 *   pressure; however, it occurs in all browsers in fairly pristine conditions
 *   somewhere around 125k to 200k elements. Since WarpDrive regularly encounters
 *   arrays larger than this in size, we cannot use push.
 *
 * 2) `array.concat` or simply setting the array to a new reference is often an
 *   easier approach; however, native Proxy to an array cannot swap it's target array
 *   and attempts at juggling multiple array sources have proven to be victim to a number
 *   of browser implementation bugs. Should these bugs be addressed then we could
 *   simplify to using `concat`, however, do note this is currently 150x faster
 *   than concat, and due to the overloaded signature of concat will likely always
 *   be faster.
 *
 * Sincerely,
 *   - runspired (Chris Thoburn) 08/21/2022
 *
 * @internal
 * @param target the array to push into
 * @param source the items to push into target
 */
export function fastPush<T>(target: T[], source: T[]): void {
  let batch;
  while (source.length > SLICE_BATCH_SIZE) {
    batch = source.splice(0, SLICE_BATCH_SIZE);
    target.push(...batch);
  }
  target.push(...source);
}

interface LegacyQueryInit {
  type: string;
  query: ImmutableRequestInfo | Record<string, unknown>;
}
interface AnonymousRequestCollectionInit {
  source: ResourceKey[];
}
interface RequestCollectionInit {
  source: ResourceKey[];
  requestKey: StableDocumentIdentifier;
}

type CollectionInit = LegacyQueryInit | AnonymousRequestCollectionInit | RequestCollectionInit;

type ChangeSet = Map<ResourceKey, 'add' | 'del'>;

/**
  @class RecordArrayManager
  @internal
*/
export class RecordArrayManager {
  declare store: Store;
  declare isDestroying: boolean;
  declare isDestroyed: boolean;
  /**
   *
   */
  declare _set: Map<ReactiveResourceArray, Set<ResourceKey>>;
  /**
   * LiveArray (peekAll/findAll) array instances
   * keyed by their ResourceType.
   */
  declare _live: Map<string, LegacyLiveArray>;
  /**
   *
   */
  declare _managed: Set<ReactiveResourceArray>;
  /**
   * Buffered changes to apply keyed by the array to
   * which to apply them to.
   */
  declare _pending: Map<ReactiveResourceArray, ChangeSet>;
  /**
   * An inverse map from StableRecordIdentifier to the list
   * of arrays it can be found in, useful for fast updates
   * when state changes to a resource occur.
   */
  declare _identifiers: Map<ResourceKey, Set<ReactiveResourceArray>>;
  /**
   * When we do not yet have a LiveArray, this keeps track of
   * the added/removed identifiers to enable us to more efficiently
   * produce the LiveArray later.
   *
   * It's possible that using a Set and only storing additions instead of
   * additions and deletes would be more efficient.
   */
  declare _staged: Map<string, ChangeSet>;
  declare _subscription: UnsubscribeToken;
  declare _documentSubscription: UnsubscribeToken;
  /**
   * KeyedArrays are arrays associated to a specific RequestKey.
   */
  declare _keyedArrays: Map<string, ReactiveResourceArray>;
  /**
   * The visibility set tracks whether a given identifier should
   * be shown in RecordArrays. It is used to dedupe added/removed
   * and state change events.
   *
   * As a Map, it grows to be very large - there may be ways to
   * reduce its size by instead migrating to it functioning as
   * an exclusion list. Any entry not in the list would be considered
   * visible.
   */
  declare _visibilitySet: Map<ResourceKey, boolean>;

  constructor(options: { store: Store }) {
    this.store = options.store;
    this.isDestroying = false;
    this.isDestroyed = false;
    this._live = new Map();
    this._managed = new Set();
    this._pending = new Map();
    this._staged = new Map();
    this._keyedArrays = new Map();
    this._identifiers = new Map();
    this._set = new Map();
    this._visibilitySet = new Map();

    this._documentSubscription = this.store.notifications.subscribe(
      'document',
      (identifier: StableDocumentIdentifier, type: DocumentCacheOperation) => {
        if (type === 'updated' && this._keyedArrays.has(identifier.lid)) {
          const array = this._keyedArrays.get(identifier.lid)!;
          this.dirtyArray(array, 0, true);
        }
      }
    );

    this._subscribeToResourceChanges();
  }

  private _subscribeToResourceChanges() {
    this._subscription = this.store.notifications.subscribe(
      'resource',
      (identifier: ResourceKey, type: CacheOperation) => {
        const schema = this.store.schema.resource?.(identifier);
        // If we are a polaris mode schema
        // and we are in the `isNew` state, we are kept hidden from
        // record arrays.
        if (schema && (!('legacy' in schema) || !schema.legacy)) {
          if (this.store.cache.isNew(identifier)) {
            return;
          }
        }

        if (type === 'added') {
          this._visibilitySet.set(identifier, true);
          this.identifierAdded(identifier);
        } else if (type === 'removed') {
          this._visibilitySet.set(identifier, false);
          this.identifierRemoved(identifier);
        } else if (type === 'state') {
          this.identifierChanged(identifier);
        }
      }
    );
  }

  _syncArray(array: ReactiveResourceArray): void {
    const pending = this._pending.get(array);
    const isLegacyQuery = isLegacyQueryArray(array);

    if ((isLegacyQuery && !pending) || this.isDestroying || this.isDestroyed) {
      return;
    }

    // first flush any staged changes
    if (pending) {
      sync(array, pending, this._set.get(array)!);
      this._pending.delete(array);
    }

    // then pull new state if required
    if (!isLegacyQuery && !isLegacyLiveArray(array)) {
      const context = array[Context];
      const signal = context.signal;
      const identifier = context.options!.requestKey as StableDocumentIdentifier;

      // we only need to rebuild the array from cache if a full sync is required
      // due to notification that the cache has changed
      if (signal.value === 'cache-sync') {
        const doc = this.store.cache.peek(identifier);
        assert(`Expected to find a document for ${identifier.lid} but found none`, doc);
        const data = !('data' in doc) || !Array.isArray(doc.data) ? [] : doc.data;
        // TODO technically we should destroy here if
        // !('data' in doc) || !Array.isArray(doc.data)
        // is true.
        this.populateManagedArray(array, data, null);
      }
    }
  }

  mutate(mutation: LocalRelationshipOperation): void {
    this.store.cache.mutate(mutation);
  }

  /**
    Get the `RecordArray` for a modelName, which contains all loaded records of
    given modelName.

    @internal
    @param {String} modelName
    @return {RecordArray}
  */
  liveArrayFor(type: string): LegacyLiveArray {
    let array = this._live.get(type);
    const identifiers: ResourceKey[] = [];
    const staged = this._staged.get(type);
    if (staged) {
      staged.forEach((value, key) => {
        if (value === 'add') {
          identifiers.push(key);
        }
      });
      this._staged.delete(type);
    }

    if (!array) {
      array = createLegacyLiveArray({
        store: this.store,
        manager: this,
        source: identifiers,
        type,
      });
      this._live.set(type, array);
      this._set.set(array, new Set(identifiers));
    }

    return array;
  }

  getCollection(config: LegacyQueryInit): LegacyQueryArray;
  getCollection(config: AnonymousRequestCollectionInit): ReactiveResourceArray;
  getCollection(config: RequestCollectionInit): ReactiveResourceArray;
  getCollection(config: CollectionInit): ReactiveResourceArray {
    if ('requestKey' in config && this._keyedArrays.has(config.requestKey.lid)) {
      return this._keyedArrays.get(config.requestKey.lid)!;
    }

    let array: ReactiveResourceArray | null = null;
    if ('requestKey' in config) {
      const options: ReactiveRequestCollectionCreateArgs = {
        store: this.store,
        manager: this,
        source: config.source,
        options: {
          requestKey: config.requestKey,
        },
      };
      array = createRequestCollection(options);
      this._keyedArrays.set(config.requestKey.lid, array);
      this._set.set(array, new Set(config.source));
      associate(this._identifiers, array, config.source);
    } else if ('query' in config) {
      const options: LegacyQueryArrayCreateOptions = {
        store: this.store,
        manager: this,
        source: [],
        type: config.type,
        query: config.query,
        isLoaded: false,
        links: null,
        meta: null,
      };
      array = createLegacyQueryArray(options);
      this._set.set(array, new Set());
    } else {
      const options: ReactiveRequestCollectionCreateArgs = {
        store: this.store,
        manager: this,
        source: config.source,
        options: null,
      };
      array = createRequestCollection(options);
      this._set.set(array, new Set(config.source));
      associate(this._identifiers, array, config.source);
    }

    this._managed.add(array);
    return array;
  }

  dirtyArray(array: ReactiveResourceArray, delta: number, shouldSyncFromCache: boolean): void {
    if (array === FAKE_ARR) {
      return;
    }
    const signal = array[Context].signal;
    if (!signal.isStale || delta > 0) {
      notifyInternalSignal(signal);

      // when the cache has updated for our array, we need to
      // do a full rebuild of the array
      signal.value = shouldSyncFromCache ? 'cache-sync' : 'patch';
    }
  }

  _getPendingFor(
    identifier: ResourceKey,
    includeManaged: boolean,
    isRemove?: boolean
  ): Map<ReactiveResourceArray, ChangeSet> | void {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }

    const liveArray = this._live.get(identifier.type);
    const allPending = this._pending;
    const pending: Map<ReactiveResourceArray, ChangeSet> = new Map();

    if (includeManaged) {
      const managed = this._identifiers.get(identifier);
      if (managed) {
        managed.forEach((arr) => {
          let changes = allPending.get(arr);
          if (!changes) {
            changes = new Map();
            allPending.set(arr, changes);
          }
          pending.set(arr, changes);
        });
      }
    }

    // during unloadAll we can ignore removes since we've already
    // cleared the array.
    if (liveArray && liveArray[Context].source.length === 0 && isRemove) {
      const pendingLive = allPending.get(liveArray);
      if (!pendingLive || pendingLive.size === 0) {
        return pending;
      }
    }

    if (!liveArray) {
      // start building a changeset for when we eventually
      // do have a live array
      let changes = this._staged.get(identifier.type);
      if (!changes) {
        changes = new Map();
        this._staged.set(identifier.type, changes);
      }
      pending.set(FAKE_ARR as ReactiveResourceArray, changes);
    } else {
      let changes = allPending.get(liveArray);
      if (!changes) {
        changes = new Map();
        allPending.set(liveArray, changes);
      }
      pending.set(liveArray, changes);
    }

    return pending;
  }

  populateManagedArray(
    array: ReactiveResourceArray,
    identifiers: ResourceKey[],
    payload: CollectionResourceDocument | null
  ): void {
    this._pending.delete(array);
    const source = array[Context].source;
    assert(
      `The new state of the collection should not be using the same array reference as the original state.`,
      source !== identifiers
    );
    const old = source.slice();
    source.length = 0;
    fastPush(source, identifiers);
    this._set.set(array, new Set(identifiers));

    if (isLegacyQueryArray(array)) {
      notifyInternalSignal(array[Context].signal);
      array.meta = payload?.meta || null;
      array.links = payload?.links || null;
      array.isLoaded = true;
    }

    disassociate(this._identifiers, array, old);
    associate(this._identifiers, array, identifiers);
  }

  identifierAdded(identifier: ResourceKey): void {
    const changeSets = this._getPendingFor(identifier, false);
    if (changeSets) {
      changeSets.forEach((changes, array) => {
        const existing = changes.get(identifier);
        if (existing === 'del') {
          changes.delete(identifier);
        } else {
          changes.set(identifier, 'add');

          this.dirtyArray(array, changes.size, false);
        }
      });
    }
  }

  identifierRemoved(identifier: ResourceKey): void {
    const changeSets = this._getPendingFor(identifier, true, true);
    if (changeSets) {
      changeSets.forEach((changes, array) => {
        const existing = changes.get(identifier);
        if (existing === 'add') {
          changes.delete(identifier);
        } else {
          changes.set(identifier, 'del');

          this.dirtyArray(array, changes.size, false);
        }
      });
    }
  }

  identifierChanged(identifier: ResourceKey): void {
    const newState = this.store._instanceCache.recordIsLoaded(identifier, true);

    // if the change matches the most recent direct added/removed
    // state, then we can ignore it
    if (this._visibilitySet.get(identifier) === newState) {
      return;
    }

    if (newState) {
      this.identifierAdded(identifier);
    } else {
      this.identifierRemoved(identifier);
    }
  }

  pause(): void {
    this.store.notifications.unsubscribe(this._subscription);
  }
  resume(): void {
    this._subscribeToResourceChanges();
  }

  clear(isClear = true): void {
    for (const array of this._live.values()) {
      array.destroy(isClear);
    }
    for (const array of this._managed.values()) {
      array.destroy(isClear);
    }
    this._managed.clear();
    this._identifiers.clear();
    this._pending.clear();
    for (const set of this._set.values()) {
      set.clear();
    }
    this._visibilitySet.clear();
  }

  destroy(): void {
    this.isDestroying = true;
    this.clear(false);
    this._live.clear();
    this.store.notifications.unsubscribe(this._subscription);
    this.store.notifications.unsubscribe(this._documentSubscription);
    this.isDestroyed = true;
  }
}

function associate(
  ArraysCache: Map<ResourceKey, Set<ReactiveResourceArray>>,
  array: ReactiveResourceArray,
  identifiers: ResourceKey[]
) {
  for (let i = 0; i < identifiers.length; i++) {
    const identifier = identifiers[i];
    let cache = ArraysCache.get(identifier);
    if (!cache) {
      cache = new Set();
      ArraysCache.set(identifier, cache);
    }
    cache.add(array);
  }
}

function disassociate(
  ArraysCache: Map<ResourceKey, Set<ReactiveResourceArray>>,
  array: ReactiveResourceArray,
  identifiers: ResourceKey[]
) {
  for (let i = 0; i < identifiers.length; i++) {
    disassociateIdentifier(ArraysCache, array, identifiers[i]);
  }
}

export function disassociateIdentifier(
  ArraysCache: Map<ResourceKey, Set<ReactiveResourceArray>>,
  array: ReactiveResourceArray,
  identifier: ResourceKey
): void {
  const cache = ArraysCache.get(identifier);
  if (cache) {
    cache.delete(array);
  }
}

function sync(array: ReactiveResourceArray, changes: Map<ResourceKey, 'add' | 'del'>, arraySet: Set<ResourceKey>) {
  const state = array[Context].source;
  const adds: ResourceKey[] = [];
  const removes: ResourceKey[] = [];
  changes.forEach((value, key) => {
    if (value === 'add') {
      // likely we want to keep a Set along-side
      if (arraySet.has(key)) {
        return;
      }
      adds.push(key);
      arraySet.add(key);
    } else {
      if (arraySet.has(key)) {
        removes.push(key);
        arraySet.delete(key);
      }
    }
  });
  if (removes.length) {
    if (removes.length === state.length) {
      state.length = 0;
      // changing the reference breaks the Proxy
      // state = array[SOURCE] = [];
    } else {
      removes.forEach((i) => {
        const index = state.indexOf(i);
        if (index !== -1) {
          state.splice(index, 1);
          arraySet.delete(i);
        }
      });
    }
  }

  if (adds.length) {
    fastPush(state, adds);
    // changing the reference breaks the Proxy
    // else we could do this
    /*
    if (state.length === 0) {
      array[SOURCE] = adds;
    } else {
      array[SOURCE] = state.concat(adds);
    }
    */
  }
}

function isLegacyQueryArray(array: ReactiveResourceArray): array is LegacyQueryArray {
  const context = array[Context];
  return context.features !== null && context.features.DEPRECATED_CLASS_NAME === 'LegacyQueryArray';
}

function isLegacyLiveArray(array: ReactiveResourceArray): array is LegacyLiveArray {
  const context = array[Context];
  return context.features !== null && context.features.DEPRECATED_CLASS_NAME === 'LiveArray';
}
