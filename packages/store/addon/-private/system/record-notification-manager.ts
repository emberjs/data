import { identifierCacheFor } from '../identifiers/cache';

type CoreStore = import('./core-store').default;
type RecordIdentifier = import('../ts-interfaces/identifier').RecordIdentifier;
type StableRecordIdentifier = import('../ts-interfaces/identifier').StableRecordIdentifier;

type UnsubscribeToken = Object;

const Cache = new WeakMap<StableRecordIdentifier, NotificationCallback>();
const Tokens = new WeakMap<UnsubscribeToken, StableRecordIdentifier>();

interface NotificationCallback {
  (
    identifier: StableRecordIdentifier,
    notificationType: 'attributes' | 'relationships' | 'identity' | 'errors' | 'meta' | 'unload' | 'property' | 'state'
  ): void;
}

export function unsubscribe(token: UnsubscribeToken) {
  let identifier = Tokens.get(token);
  if (!identifier) {
    throw new Error('Passed unknown unsubscribe token to unsubscribe');
  }
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
    let unsubToken = new Object();
    Tokens.set(unsubToken, stableIdentifier);
    return identifier;
  }

  notify(
    identifier: RecordIdentifier,
    value: 'attributes' | 'relationships' | 'errors' | 'meta' | 'identity' | 'unload' | 'property' | 'state'
  ): boolean {
    let stableIdentifier = identifierCacheFor(this.store).getOrCreateRecordIdentifier(identifier);
    let callback = Cache.get(stableIdentifier);
    if (!callback) {
      return false;
    }
    callback(stableIdentifier, value);
    return true;
  }
}
