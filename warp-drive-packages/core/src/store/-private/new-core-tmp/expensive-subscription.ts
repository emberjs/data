import type { ResourceKey, StableDocumentIdentifier } from '../../../types/identifier';
import type { Store } from '../store-service';

/**
 * `ExpensiveSubscription` is a mechanism for non-reactive
 * frameworks such as `react` to integrate with WarpDrive.
 *
 * This mechanism should never be used by frameworks or libraries
 * that support fine-grained reactivity.
 *
 * ExpensiveSubscription is expensive *because* it doubles the number
 * of notification callbacks required for each resource contained in
 * the request being subscribed to. The more requests in-use, the more
 * this cost adds up.
 */
export class ExpensiveSubscription {
  declare private _request: StableDocumentIdentifier;
  declare private _store: Store;
  declare private _callback: () => void;
  declare private _subscription: unknown;
  declare private _resources: Map<ResourceKey, unknown>;
  declare private _notify: Promise<void> | null;

  constructor(store: Store, request: StableDocumentIdentifier, callback: () => void) {
    this._store = store;
    this._request = request;
    this._callback = callback;
    this._resources = new Map();

    this._subscription = store.notifications.subscribe(request, this._notifyRequestChange);
    this._updateResourceCallbacks();
  }

  private _updateResourceCallbacks() {
    const request = this._request;
    const store = this._store;
    const { notifications } = store;
    const req = store.cache.peek(request);
    const resources = this._resources;
    const isInitialSubscription = resources.size === 0;

    if (req && 'data' in req) {
      if (Array.isArray(req.data)) {
        for (const resourceKey of req.data) {
          if (isInitialSubscription || !resources.has(resourceKey)) {
            resources.set(resourceKey, notifications.subscribe(resourceKey, this._scheduleNotify));
          }
        }
      } else if (req.data) {
        if (isInitialSubscription || !resources.has(req.data)) {
          resources.set(req.data, notifications.subscribe(req.data, this._scheduleNotify));
        }
      }
    }
    if (req && 'included' in req && Array.isArray(req.included)) {
      for (const resourceKey of req.included) {
        if (isInitialSubscription || !resources.has(resourceKey)) {
          resources.set(resourceKey, notifications.subscribe(resourceKey, this._scheduleNotify));
        }
      }
    }
  }

  private _notifyRequestChange = () => {
    this._updateResourceCallbacks();
    this._scheduleNotify();
  };
  private _scheduleNotify = () => {
    this._notify =
      this._notify ||
      Promise.resolve().then(() => {
        this._callback();
        this._notify = null;
      });
  };
}
