import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { LOG_NOTIFICATIONS } from '@ember-data/private-build-infra/debugging';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { isStableIdentifier } from '../caches/identifier-cache';
import type Store from '../store-service';
import WeakCache from '../utils/weak-cache';

type UnsubscribeToken = object;

const Cache = new WeakCache<StableRecordIdentifier, Map<UnsubscribeToken, NotificationCallback>>(
  DEBUG ? 'subscribers' : ''
);
Cache._generator = () => new Map();
const Tokens = new WeakCache<UnsubscribeToken, StableRecordIdentifier>(DEBUG ? 'identifier' : '');

export type NotificationType = 'attributes' | 'relationships' | 'identity' | 'errors' | 'meta' | 'state';

export interface NotificationCallback {
  (identifier: StableRecordIdentifier, notificationType: 'attributes' | 'relationships', key?: string): void;
  (identifier: StableRecordIdentifier, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
  (identifier: StableRecordIdentifier, notificationType: NotificationType, key?: string): void;
}

export function unsubscribe(token: UnsubscribeToken) {
  let identifier = Tokens.get(token);
  if (!identifier) {
    throw new Error('Passed unknown unsubscribe token to unsubscribe');
  }
  Tokens.delete(token);
  const map = Cache.get(identifier);
  map?.delete(token);
}
/*
  Currently only support a single callback per identifier
*/
export default class NotificationManager {
  constructor(private store: Store) {}

  subscribe(identifier: StableRecordIdentifier, callback: NotificationCallback): UnsubscribeToken {
    assert(`Expected to receive a stable Identifier to subscribe to`, isStableIdentifier(identifier));
    let map = Cache.lookup(identifier);
    let unsubToken = {};
    map.set(unsubToken, callback);
    Tokens.set(unsubToken, identifier);
    return unsubToken;
  }

  unsubscribe(token: UnsubscribeToken) {
    unsubscribe(token);
  }

  // deactivated type signature overloads because pass-through was failing to match any. Bring back if possible.
  // notify(identifier: StableRecordIdentifier, value: 'attributes' | 'relationships', key?: string): boolean;
  // notify(identifier: StableRecordIdentifier, value: 'errors' | 'meta' | 'identity' | 'state'): boolean;
  notify(identifier: StableRecordIdentifier, value: NotificationType, key?: string): boolean {
    assert(
      `Notify does not accept a key argument for the namespace ${value}. Received ${key}.`,
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
      cb(identifier, value, key);
    });
    return true;
  }
}
