/**
 * @module @ember-data/store
 */
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { LOG_NOTIFICATIONS } from '@ember-data/private-build-infra/debugging';
import type { Identifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { isStableIdentifier } from '../caches/identifier-cache';
import type Store from '../store-service';

type UnsubscribeToken = object;
let tokenId = 0;

const Cache = new Map<StableRecordIdentifier | 'resource' | 'document', Map<UnsubscribeToken, NotificationCallback | ResourceOperationCallback | DocumentOperationCallback>>();
const Tokens = new Map<UnsubscribeToken, StableRecordIdentifier>();

export type NotificationType = 'attributes' | 'relationships' | 'identity' | 'errors' | 'meta' | 'state';

export interface NotificationCallback {
  (identifier: StableRecordIdentifier, notificationType: 'attributes' | 'relationships', key?: string): void;
  (identifier: StableRecordIdentifier, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
  (identifier: StableRecordIdentifier, notificationType: NotificationType, key?: string): void;
}

export interface ResourceOperationCallback {
  // resource updates
  (identifier: StableRecordIdentifier, notificationType: 'added' | 'removed'): void;
}

export interface DocumentOperationCallback {
  // document updates
  (identifier: Identifier, notificationType: 'updated' |'added' | 'removed'): void;
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
  constructor(store: Store) {
    this.store = store;
    this.isDestroyed = false;
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
  subscribe(identifier: StableRecordIdentifier | 'resource' | 'document', callback: NotificationCallback | ResourceOperationCallback | DocumentOperationCallback): UnsubscribeToken {
    assert(`Expected to receive a stable Identifier to subscribe to`, isStableIdentifier(identifier));
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
   * @method notify
   * @param identifier
   * @param value
   * @param key
   * @return {Boolean} whether a notification was delivered to any subscribers
   * @private
   */
  notify(identifier: StableRecordIdentifier, value: 'attributes' | 'relationships', key?: string): boolean;
  notify(identifier: StableRecordIdentifier, value: 'errors' | 'meta' | 'identity' | 'state'): boolean;
  notify(identifier: StableRecordIdentifier, value: 'added' | 'removed'): boolean;
  notify(identifier: StableRecordIdentifier, value: NotificationType | 'added' | 'removed', key?: string): boolean {
    assert(
      `Notify does not accept a key argument for the namespace '${value}'. Received key '${key}'.`,
      !key || value === 'attributes' || value === 'relationships'
    );
    if (!isStableIdentifier(identifier)) {
      if (LOG_NOTIFICATIONS) {
        // eslint-disable-next-line no-console
        console.log(
          `Notifying: Expected to receive a stable Identifier to notify '${value}' '${key}' with, but ${String(
            identifier
          )} is not in the cache`,
          identifier
        );
      }
      return false;
    }

    if (LOG_NOTIFICATIONS) {
      // eslint-disable-next-line no-console
      console.log(`Notifying: ${String(identifier)}\t${value}\t${key}`);
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