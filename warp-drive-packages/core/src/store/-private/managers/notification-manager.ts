import { LOG_METRIC_COUNTS, LOG_NOTIFICATIONS } from '@warp-drive/core/build-config/debugging';
import { assert } from '@warp-drive/core/build-config/macros';

import type { RequestKey, ResourceKey } from '../../../types/identifier.ts';
import { log } from '../debug/utils.ts';
import { willSyncFlushWatchers } from '../new-core-tmp/reactivity/configure.ts';
import type { Store } from '../store-service.ts';
import { isRequestKey, isResourceKey } from './cache-key-manager.ts';

export type UnsubscribeToken = object;

export type CacheOperation = 'added' | 'removed' | 'updated' | 'state';
export type DocumentCacheOperation = 'invalidated' | 'added' | 'removed' | 'updated' | 'state';

function isCacheOperationValue(value: NotificationType | DocumentCacheOperation): value is DocumentCacheOperation {
  return (
    value === 'added' || value === 'state' || value === 'updated' || value === 'removed' || value === 'invalidated'
  );
}

export type NotificationType = 'attributes' | 'relationships' | 'identity' | 'errors' | 'meta' | CacheOperation;

export interface NotificationCallback {
  (identifier: ResourceKey, notificationType: 'attributes' | 'relationships', key?: string): void;
  (identifier: ResourceKey, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
  (identifier: ResourceKey, notificationType: CacheOperation): void;
  // (identifier: ResourceKey, notificationType: NotificationType, key?: string): void;
}

export interface ResourceOperationCallback {
  // resource updates
  (identifier: ResourceKey, notificationType: CacheOperation): void;
}

export interface DocumentOperationCallback {
  // document updates
  (identifier: RequestKey, notificationType: DocumentCacheOperation): void;
}

function count(label: string) {
  // @ts-expect-error
  // eslint-disable-next-line
  globalThis.__WarpDriveMetricCountData[label] = (globalThis.__WarpDriveMetricCountData[label] || 0) + 1;
}

function asInternalToken(token: unknown): asserts token is {
  for: RequestKey | ResourceKey | 'resource' | 'document';
} & (NotificationCallback | ResourceOperationCallback | DocumentOperationCallback) {
  assert(`Expected a token with a 'for' property`, token && typeof token === 'function' && 'for' in token);
}

function _unsubscribe(
  token: UnsubscribeToken,
  cache: Map<
    'resource' | 'document' | RequestKey | ResourceKey,
    Array<NotificationCallback | ResourceOperationCallback | DocumentOperationCallback>
  >
) {
  asInternalToken(token);
  const identifier = token.for;
  if (LOG_NOTIFICATIONS) {
    if (!identifier) {
      // eslint-disable-next-line no-console
      console.log('Passed unknown unsubscribe token to unsubscribe', identifier);
    }
  }
  if (identifier) {
    const callbacks = cache.get(identifier);
    if (!callbacks) {
      return;
    }

    const index = callbacks.indexOf(token);
    if (index === -1) {
      assert(`Cannot unsubscribe a token that is not subscribed`, index !== -1);
      return;
    }

    callbacks.splice(index, 1);
  }
}

/**
 * The NotificationManager provides the ability to subscribe to
 * changes to Cache state.
 *
 * This Feature is what allows WarpDrive to create subscriptions that
 * work with any framework or change-notification system.
 *
 * @hideconstructor
 * @public
 */
export default class NotificationManager {
  /** @internal */
  declare private store: Store;
  /** @internal */
  declare private isDestroyed: boolean;
  /** @internal */
  declare private _buffered: Map<RequestKey | ResourceKey, [string, string | null][]>;
  /** @internal */
  declare private _cache: Map<
    RequestKey | ResourceKey | 'resource' | 'document',
    Array<NotificationCallback | ResourceOperationCallback | DocumentOperationCallback>
  >;
  /** @internal */
  declare private _hasFlush: boolean;
  /** @internal */
  declare private _onFlushCB?: () => void;

  constructor(store: Store) {
    this.store = store;
    this.isDestroyed = false;
    this._buffered = new Map();
    this._hasFlush = false;
    this._cache = new Map();
  }

  /**
   * Subscribe to changes for a given resource identifier, resource addition/removal, or document addition/removal.
   *
   * ```ts
   * export type CacheOperation = 'added' | 'removed' | 'updated' | 'state';
   *
   * export interface NotificationCallback {
   *   (identifier: ResourceKey, notificationType: 'attributes' | 'relationships', key?: string): void;
   *   (identifier: ResourceKey, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
   *   (identifier: ResourceKey, notificationType: NotificationType, key?: string): void;
   * }
   * export interface ResourceOperationCallback {
   *   // resource updates
   *   (identifier: ResourceKey, notificationType: CacheOperation): void;
   * }
   * export interface DocumentOperationCallback {
   *   // document updates
   *   (identifier: RequestKey, notificationType: CacheOperation): void;
   * }
   * ```
   *
   * @public
   * @param {RequestKey | ResourceKey | 'resource' | 'document'} identifier
   * @param {NotificationCallback | ResourceOperationCallback | DocumentOperationCallback} callback
   * @return {UnsubscribeToken} an opaque token to be used with unsubscribe
   */
  subscribe(identifier: ResourceKey, callback: NotificationCallback): UnsubscribeToken;
  subscribe(identifier: 'resource', callback: ResourceOperationCallback): UnsubscribeToken;
  subscribe(identifier: 'document' | RequestKey, callback: DocumentOperationCallback): UnsubscribeToken;
  subscribe(
    identifier: RequestKey | ResourceKey | 'resource' | 'document',
    callback: NotificationCallback | ResourceOperationCallback | DocumentOperationCallback
  ): UnsubscribeToken {
    assert(`Expected not to be destroyed`, !this.isDestroyed);
    assert(
      `Expected to receive a stable Identifier to subscribe to`,
      identifier === 'resource' || identifier === 'document' || isResourceKey(identifier) || isRequestKey(identifier)
    );
    let callbacks = this._cache.get(identifier);
    assert(`expected to receive a valid callback`, typeof callback === 'function');
    assert(`cannot subscribe with the same callback twice`, !callbacks || !callbacks.includes(callback));
    // we use the callback as the cancellation token
    //@ts-expect-error
    callback.for = identifier;

    if (!callbacks) {
      callbacks = [];
      this._cache.set(identifier, callbacks);
    }

    callbacks.push(callback);
    return callback;
  }

  /**
   * remove a previous subscription
   *
   * @public
   */
  unsubscribe(token: UnsubscribeToken): void {
    if (!this.isDestroyed) {
      _unsubscribe(token, this._cache);
    }
  }

  /**
   * Custom Caches and Application Code should not call this method directly.
   *
   * @private
   */
  notify(identifier: ResourceKey, value: 'attributes' | 'relationships', key?: string | null): boolean;
  notify(identifier: ResourceKey, value: 'errors' | 'meta' | 'identity' | 'state', key?: null): boolean;
  notify(identifier: ResourceKey, value: CacheOperation, key?: null): boolean;
  notify(identifier: RequestKey, value: DocumentCacheOperation, key?: null): boolean;
  notify(
    identifier: ResourceKey | RequestKey,
    value: NotificationType | CacheOperation | DocumentCacheOperation,
    key?: string | null
  ): boolean {
    if (this.isDestroyed) {
      return false;
    }
    assert(
      `Notify does not accept a key argument for the namespace '${value}'. Received key '${key || ''}'.`,
      !key || value === 'attributes' || value === 'relationships'
    );
    if (!isResourceKey(identifier) && !isRequestKey(identifier)) {
      if (LOG_NOTIFICATIONS) {
        // eslint-disable-next-line no-console
        console.log(
          `Notifying: Expected to receive a stable Identifier to notify '${value}' '${key || ''}' with, but ${String(
            identifier
          )} is not in the cache`,
          identifier
        );
      }
      return false;
    }

    const _hasSubscribers = hasSubscribers(this._cache, identifier, value);
    if (_hasSubscribers) {
      let buffer = this._buffered.get(identifier);
      if (!buffer) {
        buffer = [];
        this._buffered.set(identifier, buffer);
      }
      buffer.push([value, key || null]);

      if (LOG_METRIC_COUNTS) {
        count(`notify ${'type' in identifier ? identifier.type : '<document>'} ${value} ${key}`);
      }
      if (!this._scheduleNotify()) {
        if (LOG_NOTIFICATIONS) {
          log(
            'notify',
            'buffered',
            `${'type' in identifier ? identifier.type : 'document'}`,
            identifier.lid,
            `${value}`,
            key || ''
          );
        }
      }
    } else {
      if (LOG_NOTIFICATIONS) {
        log(
          'notify',
          'discarded',
          `${'type' in identifier ? identifier.type : 'document'}`,
          identifier.lid,
          `${value}`,
          key || ''
        );
      }
      if (LOG_METRIC_COUNTS) {
        count(`DISCARDED notify ${'type' in identifier ? identifier.type : '<document>'} ${value} ${key}`);
      }
    }

    return _hasSubscribers;
  }

  /** @internal */
  _onNextFlush(cb: () => void): void {
    this._onFlushCB = cb;
  }

  private _scheduleNotify(): boolean {
    const asyncFlush = this.store._enableAsyncFlush;

    if (this._hasFlush) {
      if (asyncFlush !== false && !willSyncFlushWatchers()) {
        return false;
      }
    }

    if (asyncFlush && !willSyncFlushWatchers()) {
      this._hasFlush = true;
      return false;
    }

    this._flush();
    return true;
  }

  /** @internal */
  _flush(): void {
    const buffered = this._buffered;
    if (buffered.size) {
      this._buffered = new Map();
      for (const [identifier, states] of buffered) {
        for (let i = 0; i < states.length; i++) {
          // @ts-expect-error
          _flushNotification(this._cache, identifier, states[i][0], states[i][1]);
        }
      }
    }

    this._hasFlush = false;
    this._onFlushCB?.();
    this._onFlushCB = undefined;
  }

  /** @internal */
  destroy(): void {
    this.isDestroyed = true;
    this._cache.clear();
  }
}

function _flushNotification(
  cache: NotificationManager['_cache'],
  identifier: ResourceKey,
  value: 'attributes' | 'relationships',
  key: string | null
): boolean;
function _flushNotification(
  cache: NotificationManager['_cache'],
  identifier: ResourceKey,
  value: 'errors' | 'meta' | 'identity' | 'state',
  key: null
): boolean;
function _flushNotification(
  cache: NotificationManager['_cache'],
  identifier: ResourceKey | RequestKey,
  value: CacheOperation,
  key: null
): boolean;
function _flushNotification(
  cache: NotificationManager['_cache'],
  identifier: ResourceKey | RequestKey,
  value: NotificationType | CacheOperation,
  key: string | null
): boolean {
  if (LOG_NOTIFICATIONS) {
    log('notify', '', `${'type' in identifier ? identifier.type : 'document'}`, identifier.lid, `${value}`, key || '');
  }

  // TODO for documents this will need to switch based on Identifier kind
  if (isCacheOperationValue(value)) {
    const callbackMap = cache.get(isRequestKey(identifier) ? 'document' : 'resource') as Array<
      ResourceOperationCallback | DocumentOperationCallback
    >;

    if (callbackMap) {
      callbackMap.forEach((cb: ResourceOperationCallback | DocumentOperationCallback) => {
        (cb as ResourceOperationCallback)(identifier as ResourceKey, value);
      });
    }
  }

  const callbacks = cache.get(identifier);
  if (!callbacks || !callbacks.length) {
    return false;
  }
  callbacks.forEach((cb) => {
    // @ts-expect-error overload doesn't narrow within body
    cb(identifier, value, key);
  });
  return true;
}

function hasSubscribers(
  cache: NotificationManager['_cache'],
  identifier: RequestKey | ResourceKey,
  value: NotificationType | CacheOperation | DocumentCacheOperation
): boolean {
  const hasSubscriber = Boolean(cache.get(identifier)?.length);

  if (hasSubscriber || !isCacheOperationValue(value)) {
    return hasSubscriber;
  }

  const callbackMap = cache.get(isRequestKey(identifier) ? 'document' : 'resource') as Array<
    ResourceOperationCallback | DocumentOperationCallback
  >;
  return Boolean(callbackMap?.length);
}
