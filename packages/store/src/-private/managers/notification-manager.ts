/**
 * @module @ember-data/store
 */

import { LOG_METRIC_COUNTS, LOG_NOTIFICATIONS } from '@warp-drive/build-config/debugging';
import { assert } from '@warp-drive/build-config/macros';
import type { StableDocumentIdentifier, StableRecordIdentifier } from '@warp-drive/core-types/identifier';

import { isDocumentIdentifier, isStableIdentifier } from '../caches/identifier-cache';
import { log } from '../debug/utils';
import { willSyncFlushWatchers } from '../new-core-tmp/reactivity/configure';
import type { Store } from '../store-service';

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
  (identifier: StableRecordIdentifier, notificationType: 'attributes' | 'relationships', key?: string): void;
  (identifier: StableRecordIdentifier, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
  (identifier: StableRecordIdentifier, notificationType: CacheOperation): void;
  // (identifier: StableRecordIdentifier, notificationType: NotificationType, key?: string): void;
}

export interface ResourceOperationCallback {
  // resource updates
  (identifier: StableRecordIdentifier, notificationType: CacheOperation): void;
}

export interface DocumentOperationCallback {
  // document updates
  (identifier: StableDocumentIdentifier, notificationType: DocumentCacheOperation): void;
}

function count(label: string) {
  // @ts-expect-error
  // eslint-disable-next-line
  globalThis.__WarpDriveMetricCountData[label] = (globalThis.__WarpDriveMetricCountData[label] || 0) + 1;
}

function asInternalToken(token: unknown): asserts token is {
  for: StableDocumentIdentifier | StableRecordIdentifier | 'resource' | 'document';
} & (NotificationCallback | ResourceOperationCallback | DocumentOperationCallback) {
  assert(`Expected a token with a 'for' property`, token && typeof token === 'function' && 'for' in token);
}

function _unsubscribe(
  token: UnsubscribeToken,
  cache: Map<
    'resource' | 'document' | StableDocumentIdentifier | StableRecordIdentifier,
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
 * This Feature is what allows EmberData to create subscriptions that
 * work with any framework or change-notification system.
 *
 * @class NotificationManager
 * @public
 */
export default class NotificationManager {
  declare store: Store;
  declare isDestroyed: boolean;
  declare _buffered: Map<StableDocumentIdentifier | StableRecordIdentifier, [string, string | undefined][]>;
  declare _cache: Map<
    StableDocumentIdentifier | StableRecordIdentifier | 'resource' | 'document',
    Array<NotificationCallback | ResourceOperationCallback | DocumentOperationCallback>
  >;
  declare _hasFlush: boolean;
  declare _onFlushCB?: () => void;

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
   *   (identifier: StableRecordIdentifier, notificationType: 'attributes' | 'relationships', key?: string): void;
   *   (identifier: StableRecordIdentifier, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
   *   (identifier: StableRecordIdentifier, notificationType: NotificationType, key?: string): void;
   * }
   * export interface ResourceOperationCallback {
   *   // resource updates
   *   (identifier: StableRecordIdentifier, notificationType: CacheOperation): void;
   * }
   * export interface DocumentOperationCallback {
   *   // document updates
   *   (identifier: StableDocumentIdentifier, notificationType: CacheOperation): void;
   * }
   * ```
   *
   * @method subscribe
   * @public
   * @param {StableDocumentIdentifier | StableRecordIdentifier | 'resource' | 'document'} identifier
   * @param {NotificationCallback | ResourceOperationCallback | DocumentOperationCallback} callback
   * @return {UnsubscribeToken} an opaque token to be used with unsubscribe
   */
  subscribe(identifier: StableRecordIdentifier, callback: NotificationCallback): UnsubscribeToken;
  subscribe(identifier: 'resource', callback: ResourceOperationCallback): UnsubscribeToken;
  subscribe(identifier: 'document' | StableDocumentIdentifier, callback: DocumentOperationCallback): UnsubscribeToken;
  subscribe(
    identifier: StableDocumentIdentifier | StableRecordIdentifier | 'resource' | 'document',
    callback: NotificationCallback | ResourceOperationCallback | DocumentOperationCallback
  ): UnsubscribeToken {
    assert(
      `Expected to receive a stable Identifier to subscribe to`,
      identifier === 'resource' ||
        identifier === 'document' ||
        isStableIdentifier(identifier) ||
        isDocumentIdentifier(identifier)
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
   * @method unsubscribe
   * @public
   * @param {UnsubscribeToken} token
   */
  unsubscribe(token: UnsubscribeToken) {
    if (!this.isDestroyed) {
      _unsubscribe(token, this._cache);
    }
  }

  /**
   * Custom Caches and Application Code should not call this method directly.
   *
   * @method notify
   * @param identifier
   * @param value
   * @param key
   * @return {Boolean} whether a notification was delivered to any subscribers
   * @private
   */
  notify(identifier: StableRecordIdentifier, value: 'attributes' | 'relationships', key?: string): boolean;
  notify(identifier: StableRecordIdentifier, value: 'errors' | 'meta' | 'identity' | 'state'): boolean;
  notify(identifier: StableRecordIdentifier, value: CacheOperation): boolean;
  notify(identifier: StableDocumentIdentifier, value: DocumentCacheOperation): boolean;
  notify(
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    value: NotificationType | CacheOperation | DocumentCacheOperation,
    key?: string
  ): boolean {
    assert(
      `Notify does not accept a key argument for the namespace '${value}'. Received key '${key || ''}'.`,
      !key || value === 'attributes' || value === 'relationships'
    );
    if (!isStableIdentifier(identifier) && !isDocumentIdentifier(identifier)) {
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

    const hasSubscribers = Boolean(this._cache.get(identifier)?.length);

    if (isCacheOperationValue(value) || hasSubscribers) {
      let buffer = this._buffered.get(identifier);
      if (!buffer) {
        buffer = [];
        this._buffered.set(identifier, buffer);
      }
      buffer.push([value, key]);

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

    return hasSubscribers;
  }

  _onNextFlush(cb: () => void) {
    this._onFlushCB = cb;
  }

  _scheduleNotify(): boolean {
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

  _flush() {
    const buffered = this._buffered;
    if (buffered.size) {
      this._buffered = new Map();
      buffered.forEach((states, identifier) => {
        states.forEach((args) => {
          // @ts-expect-error
          this._flushNotification(identifier, args[0], args[1]);
        });
      });
    }

    this._hasFlush = false;
    this._onFlushCB?.();
    this._onFlushCB = undefined;
  }

  _flushNotification(identifier: StableRecordIdentifier, value: 'attributes' | 'relationships', key?: string): boolean;
  _flushNotification(identifier: StableRecordIdentifier, value: 'errors' | 'meta' | 'identity' | 'state'): boolean;
  _flushNotification(identifier: StableRecordIdentifier | StableDocumentIdentifier, value: CacheOperation): boolean;
  _flushNotification(
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    value: NotificationType | CacheOperation,
    key?: string
  ): boolean {
    if (LOG_NOTIFICATIONS) {
      log(
        'notify',
        '',
        `${'type' in identifier ? identifier.type : 'document'}`,
        identifier.lid,
        `${value}`,
        key || ''
      );
    }

    // TODO for documents this will need to switch based on Identifier kind
    if (isCacheOperationValue(value)) {
      const callbackMap = this._cache.get(isDocumentIdentifier(identifier) ? 'document' : 'resource') as Array<
        ResourceOperationCallback | DocumentOperationCallback
      >;

      if (callbackMap) {
        callbackMap.forEach((cb: ResourceOperationCallback | DocumentOperationCallback) => {
          cb(identifier as StableRecordIdentifier, value);
        });
      }
    }

    const callbacks = this._cache.get(identifier);
    if (!callbacks || !callbacks.length) {
      return false;
    }
    callbacks.forEach((cb) => {
      // @ts-expect-error overload doesn't narrow within body
      cb(identifier, value, key);
    });
    return true;
  }

  destroy() {
    this.isDestroyed = true;
    this._cache.clear();
  }
}
