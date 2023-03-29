/**
 * @module @ember-data/store
 */
import { assert } from '@ember/debug';
import { _backburner } from '@ember/runloop';

import { LOG_NOTIFICATIONS } from '@ember-data/debugging';
import { DEBUG } from '@ember-data/env';
import type { Identifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { isStableIdentifier } from '../caches/identifier-cache';
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

const Cache = new Map<
  StableRecordIdentifier | 'resource' | 'document',
  Map<UnsubscribeToken, NotificationCallback | ResourceOperationCallback | DocumentOperationCallback>
>();
const Tokens = new Map<UnsubscribeToken, StableRecordIdentifier | 'resource' | 'document'>();

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
  (identifier: Identifier, notificationType: CacheOperation): void;
}

// TODO this isn't importable anyway, remove and use a map on the manager?
export function unsubscribe(token: UnsubscribeToken) {
  let identifier = Tokens.get(token);
  if (LOG_NOTIFICATIONS) {
    if (!identifier) {
      // eslint-disable-next-line no-console
      console.log('Passed unknown unsubscribe token to unsubscribe', identifier);
    }
  }
  if (identifier) {
    Tokens.delete(token);
    const map = Cache.get(identifier);
    map?.delete(token);
  }
}

/*
  Currently only support a single callback per identifier
*/

/**
 * The NotificationManager provides the ability to subscribe to
 * changes to Cache state.
 *
 * This Feature is what allows EmberData to create subscriptions that
 * work with any framework or change notification system.
 *
 * @class NotificationManager
 * @public
 */
export default class NotificationManager {
  declare store: Store;
  declare isDestroyed: boolean;
  declare _buffered: Map<StableRecordIdentifier, [string, string | undefined][]>;
  declare _hasFlush: boolean;
  declare _onFlushCB?: () => void;

  constructor(store: Store) {
    this.store = store;
    this.isDestroyed = false;
    this._buffered = new Map();
    this._hasFlush = false;
  }

  /**
   * Subscribe to changes for a given resource identifier
   *
   * ```ts
   * interface NotificationCallback {
   *   (identifier: StableRecordIdentifier, notificationType: 'attributes' | 'relationships', key?: string): void;
   *   (identifier: StableRecordIdentifier, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
   *   (identifier: StableRecordIdentifier, notificationType: NotificationType, key?: string): void;
   * }
   * ```
   *
   * @method subscribe
   * @public
   * @param {StableRecordIdentifier} identifier
   * @param {NotificationCallback} callback
   * @returns {UnsubscribeToken} an opaque token to be used with unsubscribe
   */
  subscribe(
    identifier: StableRecordIdentifier | 'resource' | 'document',
    callback: NotificationCallback | ResourceOperationCallback | DocumentOperationCallback
  ): UnsubscribeToken {
    assert(
      `Expected to receive a stable Identifier to subscribe to`,
      identifier === 'resource' || identifier === 'document' || isStableIdentifier(identifier)
    );
    let map = Cache.get(identifier);

    if (!map) {
      map = new Map();
      Cache.set(identifier, map);
    }

    let unsubToken = DEBUG ? { _tokenRef: tokenId++ } : {};
    map.set(unsubToken, callback);
    Tokens.set(unsubToken, identifier);
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
      unsubscribe(token);
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
  notify(identifier: StableRecordIdentifier, value: NotificationType | CacheOperation, key?: string): boolean {
    assert(
      `Notify does not accept a key argument for the namespace '${value}'. Received key '${key || ''}'.`,
      !key || value === 'attributes' || value === 'relationships'
    );
    if (!isStableIdentifier(identifier)) {
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
      console.log(`Buffering Notify: ${String(identifier)}\t${value}\t${key || ''}`);
    }

    const hasSubscribers = Boolean(Cache.get(identifier)?.size);

    if (isCacheOperationValue(value) || hasSubscribers) {
      let buffer = this._buffered.get(identifier);
      if (!buffer) {
        buffer = [];
        this._buffered.set(identifier, buffer);
      }
      buffer.push([value, key]);

      void this._scheduleNotify();
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
  _flushNotification(identifier: StableRecordIdentifier, value: CacheOperation): boolean;
  _flushNotification(
    identifier: StableRecordIdentifier,
    value: NotificationType | CacheOperation,
    key?: string
  ): boolean {
    if (LOG_NOTIFICATIONS) {
      // eslint-disable-next-line no-console
      console.log(`Notifying: ${String(identifier)}\t${value}\t${key || ''}`);
    }

    // TODO for documents this will need to switch based on Identifier kind
    if (isCacheOperationValue(value)) {
      let callbackMap = Cache.get('resource') as Map<UnsubscribeToken, ResourceOperationCallback>;
      if (callbackMap) {
        callbackMap.forEach((cb: ResourceOperationCallback) => {
          cb(identifier, value);
        });
      }
    }

    let callbackMap = Cache.get(identifier);
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
    Tokens.clear();
    Cache.clear();
  }
}
