import { identifierCacheFor } from '../identifiers/cache';
import type { RecordIdentifier, StableRecordIdentifier } from '../ts-interfaces/identifier';
import type CoreStore from './core-store';

type UnsubscribeToken = Object;

const Cache = new WeakMap<StableRecordIdentifier, Map<UnsubscribeToken, NotificationCallback>>();
const Tokens = new WeakMap<UnsubscribeToken, StableRecordIdentifier>();

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
  constructor(private store: CoreStore) {}

  subscribe(identifier: RecordIdentifier, callback: NotificationCallback): UnsubscribeToken {
    let stableIdentifier = identifierCacheFor(this.store).getOrCreateRecordIdentifier(identifier);
    let map = Cache.get(stableIdentifier);
    if (map === undefined) {
      map = new Map();
      Cache.set(stableIdentifier, map);
    }
    let unsubToken = {};
    map.set(unsubToken, callback);
    Tokens.set(unsubToken, stableIdentifier);
    return unsubToken;
  }

  notify(identifier: RecordIdentifier, value: 'attributes' | 'relationships' | 'property', key?: string): boolean;
  notify(identifier: RecordIdentifier, value: 'errors' | 'meta' | 'identity' | 'unload' | 'state'): boolean;
  notify(identifier: RecordIdentifier, value: NotificationType, key?: string): boolean {
    let stableIdentifier = identifierCacheFor(this.store).getOrCreateRecordIdentifier(identifier);
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
