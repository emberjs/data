import { DEBUG } from '@glimmer/env';

import type { RecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type Store from './core-store';
import WeakCache from './weak-cache';

type UnsubscribeToken = Object;

const Cache = new WeakCache<StableRecordIdentifier, Map<UnsubscribeToken, NotificationCallback>>(
  DEBUG ? 'subscribers' : ''
);
Cache._generator = () => new Map();
const Tokens = new WeakCache<UnsubscribeToken, StableRecordIdentifier>(DEBUG ? 'identifier' : '');

export type NotificationType =
  | 'attributes'
  | 'relationships'
  | 'identity'
  | 'errors'
  | 'meta'
  | 'unload'
  | 'state'
  | 'property'; // 'property' is an internal EmberData only transition period concept.

export interface NotificationCallback {
  (identifier: RecordIdentifier, notificationType: 'attributes' | 'relationships' | 'property', key?: string): void;
  (identifier: RecordIdentifier, notificationType: 'errors' | 'meta' | 'identity' | 'unload' | 'state'): void;
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

  subscribe(identifier: RecordIdentifier, callback: NotificationCallback): UnsubscribeToken {
    let stableIdentifier = this.store.identifierCache.getOrCreateRecordIdentifier(identifier);
    let map = Cache.lookup(stableIdentifier);
    let unsubToken = {};
    map.set(unsubToken, callback);
    Tokens.set(unsubToken, stableIdentifier);
    return unsubToken;
  }

  unsubscribe(token: UnsubscribeToken) {
    unsubscribe(token);
  }

  notify(identifier: RecordIdentifier, value: 'attributes' | 'relationships' | 'property', key?: string): boolean;
  notify(identifier: RecordIdentifier, value: 'errors' | 'meta' | 'identity' | 'unload' | 'state'): boolean;
  notify(identifier: RecordIdentifier, value: NotificationType, key?: string): boolean {
    let stableIdentifier = this.store.identifierCache.getOrCreateRecordIdentifier(identifier);
    let callbackMap = Cache.get(stableIdentifier);
    if (!callbackMap || !callbackMap.size) {
      return false;
    }
    callbackMap.forEach((cb) => {
      cb(stableIdentifier, value, key);
    });
    return true;
  }
}
