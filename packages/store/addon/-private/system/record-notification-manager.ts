import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import isStableIdentifier from '../identifiers/is-stable-identifier';

type CoreStore = import('./core-store').default;
type StableRecordIdentifier = import('../ts-interfaces/identifier').StableRecordIdentifier;

type UnsubscribeToken = object;
let tokenId = 0;

const Cache = new Map<StableRecordIdentifier, Map<UnsubscribeToken, NotificationCallback>>();
const Tokens = new Map<UnsubscribeToken, StableRecordIdentifier>();

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
  (identifier: StableRecordIdentifier, notificationType: 'attributes' | 'relationships', key?: string): void;
  (identifier: StableRecordIdentifier, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
  (identifier: StableRecordIdentifier, notificationType: NotificationType, key?: string): void;
}

// TODO this isn't importable anyway, remove and use a map on the manager?
export function unsubscribe(token: UnsubscribeToken) {
  let identifier = Tokens.get(token);

  if (identifier) {
    Tokens.delete(token);
    const map = Cache.get(identifier);
    map?.delete(token);
  }
}
/*
  Currently only support a single callback per identifier
*/
export default class NotificationManager {
  declare store: CoreStore;
  constructor(store: CoreStore) {
    this.store = store;
  }

  subscribe(identifier: StableRecordIdentifier, callback: NotificationCallback): UnsubscribeToken {
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

  unsubscribe(token: UnsubscribeToken) {
    unsubscribe(token);
  }

  // deactivated type signature overloads because pass-through was failing to match any. Bring back if possible.
  // notify(identifier: StableRecordIdentifier, value: 'attributes' | 'relationships', key?: string): boolean;
  // notify(identifier: StableRecordIdentifier, value: 'errors' | 'meta' | 'identity' | 'state'): boolean;
  notify(identifier: StableRecordIdentifier, value: NotificationType, key?: string): boolean {
    assert(
      `Notify does not accept a key argument for the namespace '${value}'. Received key '${key}'.`,
      !key || value === 'attributes' || value === 'relationships'
    );
    if (!isStableIdentifier(identifier)) {
      return false;
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

  destroy() {
    Tokens.clear();
    Cache.clear();
  }
}
