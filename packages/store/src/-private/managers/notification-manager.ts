/**
 * @module @ember-data/store
 */
import { assert } from '@ember/debug';
// eslint-disable-next-line no-restricted-imports
import { _backburner } from '@ember/runloop';

import { LOG_NOTIFICATIONS } from '@warp-drive/build-config/debugging';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableDocumentIdentifier, StableRecordIdentifier } from '@warp-drive/core-types/identifier';

import { isDocumentIdentifier, isStableIdentifier } from '../caches/identifier-cache';
import type Store from '../store-service';

export type UnsubscribeToken = object;
let tokenId = 0;

const CacheOperations = new Set(['added', 'removed', 'state', 'updated']);
export type CacheOperation = 'added' | 'removed' | 'updated' | 'state';

function isCacheOperationValue(value: NotificationType | CacheOperation): value is CacheOperation {
  return CacheOperations.has(value);
}

function runLoopIsFlushing(): boolean {
  //@ts-expect-error
  return !!_backburner.currentInstance && _backburner._autorun !== true;
}

export type NotificationType = 'attributes' | 'relationships' | 'identity' | 'errors' | 'meta' | 'state';

export interface NotificationCallback {
  (identifier: StableRecordIdentifier, notificationType: 'attributes' | 'relationships', key?: string): void;
  (identifier: StableRecordIdentifier, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
  (identifier: StableRecordIdentifier, notificationType: NotificationType, key?: string): void;
}

export interface ResourceOperationCallback {
  // resource updates
  (identifier: StableRecordIdentifier, notificationType: CacheOperation): void;
}

export interface DocumentOperationCallback {
  // document updates
  (identifier: StableDocumentIdentifier, notificationType: CacheOperation): void;
}

function _unsubscribe(
  tokens: Map<UnsubscribeToken, StableDocumentIdentifier | StableRecordIdentifier | 'resource' | 'document'>,
  token: UnsubscribeToken,
  cache: Map<
    'resource' | 'document' | StableDocumentIdentifier | StableRecordIdentifier,
    Map<UnsubscribeToken, NotificationCallback | ResourceOperationCallback | DocumentOperationCallback>
  >
) {
  const identifier = tokens.get(token);
  if (LOG_NOTIFICATIONS) {
    if (!identifier) {
      // eslint-disable-next-line no-console
      console.log('Passed unknown unsubscribe token to unsubscribe', identifier);
    }
  }
  if (identifier) {
    tokens.delete(token);
    const map = cache.get(identifier);
    map?.delete(token);
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
    Map<UnsubscribeToken, NotificationCallback | ResourceOperationCallback | DocumentOperationCallback>
  >;
  declare _tokens: Map<UnsubscribeToken, StableDocumentIdentifier | StableRecordIdentifier | 'resource' | 'document'>;
  declare _hasFlush: boolean;
  declare _onFlushCB?: () => void;

  constructor(store: Store) {
    this.store = store;
    this.isDestroyed = false;
    this._buffered = new Map();
    this._hasFlush = false;
    this._cache = new Map();
    this._tokens = new Map();
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
  subscribe(identifier: StableDocumentIdentifier, callback: DocumentOperationCallback): UnsubscribeToken;
  subscribe(identifier: 'document', callback: DocumentOperationCallback): UnsubscribeToken;
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
    let map = this._cache.get(identifier);

    if (!map) {
      map = new Map();
      this._cache.set(identifier, map);
    }

    const unsubToken = DEBUG ? { _tokenRef: tokenId++ } : {};
    map.set(unsubToken, callback);
    this._tokens.set(unsubToken, identifier);
    return unsubToken;
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
      _unsubscribe(this._tokens, token, this._cache);
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
  notify(identifier: StableRecordIdentifier | StableDocumentIdentifier, value: CacheOperation): boolean;
  notify(
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    value: NotificationType | CacheOperation,
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

    if (LOG_NOTIFICATIONS) {
      // eslint-disable-next-line no-console
      console.log(`Buffering Notify: ${String(identifier.lid)}\t${value}\t${key || ''}`);
    }

    const hasSubscribers = Boolean(this._cache.get(identifier)?.size);

    if (isCacheOperationValue(value) || hasSubscribers) {
      let buffer = this._buffered.get(identifier);
      if (!buffer) {
        buffer = [];
        this._buffered.set(identifier, buffer);
      }
      buffer.push([value, key]);

      this._scheduleNotify();
    }

    return hasSubscribers;
  }

  _onNextFlush(cb: () => void) {
    this._onFlushCB = cb;
  }

  _scheduleNotify() {
    const asyncFlush = this.store._enableAsyncFlush;

    if (this._hasFlush) {
      if (asyncFlush !== false && !runLoopIsFlushing()) {
        return;
      }
    }

    if (asyncFlush && !runLoopIsFlushing()) {
      this._hasFlush = true;
      return;
    }

    this._flush();
  }

  _flush() {
    if (this._buffered.size) {
      this._buffered.forEach((states, identifier) => {
        states.forEach((args) => {
          // @ts-expect-error
          this._flushNotification(identifier, args[0], args[1]);
        });
      });
      this._buffered = new Map();
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
      // eslint-disable-next-line no-console
      console.log(`Notifying: ${String(identifier)}\t${value}\t${key || ''}`);
    }

    // TODO for documents this will need to switch based on Identifier kind
    if (isCacheOperationValue(value)) {
      const callbackMap = this._cache.get(isDocumentIdentifier(identifier) ? 'document' : 'resource') as Map<
        UnsubscribeToken,
        ResourceOperationCallback | DocumentOperationCallback
      >;

      if (callbackMap) {
        callbackMap.forEach((cb: ResourceOperationCallback | DocumentOperationCallback) => {
          cb(identifier as StableRecordIdentifier, value);
        });
      }
    }

    const callbackMap = this._cache.get(identifier);
    if (!callbackMap || !callbackMap.size) {
      return false;
    }
    callbackMap.forEach((cb) => {
      // @ts-expect-error overload doesn't narrow within body
      cb(identifier, value, key);
    });
    return true;
  }

  destroy() {
    this.isDestroyed = true;
    this._tokens.clear();
    this._cache.clear();
  }
}
