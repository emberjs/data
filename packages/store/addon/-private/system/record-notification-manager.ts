import { identifierCacheFor } from '../identifiers/cache';

type CoreStore = import('./core-store').default;
type RecordIdentifier = import('../ts-interfaces/identifier').RecordIdentifier;
type StableRecordIdentifier = import('../ts-interfaces/identifier').StableRecordIdentifier;

type UnsubscribeToken = Object;

const Cache = new WeakMap<StableRecordIdentifier, NotificationCallback>();
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
  Cache.delete(identifier);
}
/*
  Currently only support a single callback per identifier
*/
export default class NotificationManager {
  constructor(private store: CoreStore) {}

  subscribe(identifier: RecordIdentifier, callback: NotificationCallback): UnsubscribeToken {
    let stableIdentifier = identifierCacheFor(this.store).getOrCreateRecordIdentifier(identifier);
    Cache.set(stableIdentifier, callback);
    let unsubToken = {};
    Tokens.set(unsubToken, stableIdentifier);
    return unsubToken;
  }

  notify(identifier: RecordIdentifier, value: 'attributes' | 'relationships' | 'property', key?: string): boolean;
  notify(identifier: RecordIdentifier, value: 'errors' | 'meta' | 'identity' | 'unload' | 'state'): boolean;
  notify(identifier: RecordIdentifier, value: NotificationType, key?: string): boolean {
    let stableIdentifier = identifierCacheFor(this.store).getOrCreateRecordIdentifier(identifier);
    let callback = Cache.get(stableIdentifier);
    if (!callback) {
      return false;
    }
    callback(stableIdentifier, value, key);
    return true;
  }
}
