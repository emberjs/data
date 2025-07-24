import type { RequestKey, ResourceKey } from '../../../types/identifier';
import type { UnsubscribeToken } from '../managers/notification-manager';
import type { Store } from '../store-service';

const Subscriptions = new WeakMap<RequestKey, ExpensiveSubscription>();

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
class ExpensiveSubscription {
  declare private _request: RequestKey;
  declare private _store: Store;
  declare private _callbacks: Set<() => void>;
  declare private _subscription: UnsubscribeToken;
  declare private _resources: Map<ResourceKey, UnsubscribeToken>;
  declare private _notify: Promise<void> | null;

  constructor(store: Store, request: RequestKey) {
    this._store = store;
    this._request = request;
    this._callbacks = new Set();
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
        for (const callback of this._callbacks) {
          callback();
        }
        this._notify = null;
      });
  };

  addWatcher(callback: () => void) {
    this._callbacks.add(callback);
  }

  removeWatcher(callback: () => void) {
    this._callbacks.delete(callback);
    if (this._callbacks.size === 0) {
      this.destroy();
    }
  }

  destroy() {
    Subscriptions.delete(this._request);
    const { notifications } = this._store;
    if (this._subscription) {
      notifications.unsubscribe(this._subscription);
    }
    for (const token of this._resources.values()) {
      notifications.unsubscribe(token);
    }
    this._callbacks.clear();
    this._resources.clear();
  }
}

/**
 * Creates an {@link ExpensiveSubscription} for the {@link RequestKey}
 * if one does not already exist and adds a watcher to it.
 *
 * Returns a cleanup function. This should be called on-mount by a component
 * that wants to subscribe to a request and cleanup should be called on dismount.
 *
 * ::: warning ⚠️ Avoid Using If Your App Supports Fine-grained Reactivity
 * This mechanism should never be used by frameworks or libraries
 * that support fine-grained reactivity.
 * :::
 *
 * `ExpensiveSubscription` is a mechanism for non-reactive
 * frameworks such as `react` to integrate with WarpDrive, for instance
 * by treating a request as an [external store](https://react.dev/reference/react/useSyncExternalStore)
 *
 * `ExpensiveSubscription` is expensive *because* it doubles the number
 * of notification callbacks required for each resource contained in
 * the request being subscribed to. The more requests in-use, the more
 * this cost adds up.
 */
export function getExpensiveRequestSubscription(
  store: Store,
  requestKey: RequestKey,
  callback: () => void
): () => void {
  let subscription = Subscriptions.get(requestKey);
  if (!subscription) {
    subscription = new ExpensiveSubscription(store, requestKey);
  }
  subscription.addWatcher(callback);
  return () => {
    subscription.removeWatcher(callback);
  };
}
