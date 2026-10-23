/**
 * The page-global hook the WarpDrive browser DevTools extension attaches to.
 *
 * In `DEBUG` builds every `Store` registers itself here when it is
 * constructed, and `RequestManager` records the requests it issues. The
 * hook never imports or knows about `chrome.*` APIs: it speaks a small
 * versioned `window.postMessage` protocol that the extension's content
 * script relays.
 *
 * Nothing here executes at import time, so builds that never call into it
 * (production, where the callers are `DEBUG`-gated) drop it entirely.
 *
 * @module
 */

import type { Store } from './store/-private/store-service.ts';

/**
 * The `globalThis` key the hook is installed under.
 *
 * @example
 * ```ts
 * const hook = globalThis[DEVTOOLS_HOOK_KEY];
 * ```
 * @public
 */
export const DEVTOOLS_HOOK_KEY: string = '__WARP_DRIVE_DEVTOOLS_GLOBAL_HOOK__';

/**
 * The protocol version spoken by this build of WarpDrive. Bumped on any
 * breaking change to the message shapes in this module.
 *
 * @example
 * ```ts
 * if (message.protocolVersion !== DEVTOOLS_PROTOCOL_VERSION) {
 *   // ask the user to upgrade
 * }
 * ```
 * @public
 */
export const DEVTOOLS_PROTOCOL_VERSION = 1 as const;

/**
 * The `source` value carried by every protocol message, so unrelated
 * `postMessage` traffic on the page can be ignored.
 *
 * @example
 * ```ts
 * if (event.data?.source === DEVTOOLS_MESSAGE_SOURCE) {}
 * ```
 * @public
 */
export const DEVTOOLS_MESSAGE_SOURCE = 'warp-drive-devtools' as const;

/**
 * A feature a registered `Store` supports. Panels disable the views whose
 * capability a connected page does not report.
 *
 * @example
 * ```ts
 * const canTrace = store.capabilities.includes('requests');
 * ```
 * @public
 */
export type DevtoolsCapability = 'requests';

/**
 * What the extension is told about a registered `Store`.
 *
 * @example
 * ```ts
 * const info: DevtoolsStoreInfo = { storeId: 'store-1', name: 'Store 1', protocolVersion: 1, capabilities: ['requests'] };
 * ```
 * @public
 */
export interface DevtoolsStoreInfo {
  storeId: string;
  name: string;
  protocolVersion: typeof DEVTOOLS_PROTOCOL_VERSION;
  capabilities: DevtoolsCapability[];
}

/**
 * A registry entry: the serializable {@link DevtoolsStoreInfo} plus the
 * live `Store` it describes.
 *
 * @example
 * ```ts
 * for (const entry of hook.getRegistry()) {
 *   console.log(entry.storeId, entry.store);
 * }
 * ```
 * @public
 */
export interface DevtoolsRegistryEntry extends DevtoolsStoreInfo {
  store: Store;
}

/**
 * The lifecycle state of a traced request.
 *
 * @example
 * ```ts
 * const done: DevtoolsRequestStatus = 'success';
 * ```
 * @public
 */
export type DevtoolsRequestStatus = 'pending' | 'success' | 'error' | 'cancelled';

/**
 * One observation of a request. A request produces a `pending` event when
 * issued and a second event, with the same `id`, when it settles.
 *
 * @example
 * ```ts
 * hook.subscribe((event) => {
 *   if (event.type === 'request') console.log(event.request.url);
 * });
 * ```
 * @public
 */
export interface DevtoolsRequestEvent {
  id: number;
  storeId: string | null;
  url: string | null;
  method: string | null;
  op: string | null;
  status: DevtoolsRequestStatus;
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  fromCache: boolean;
  responseStatus: number | null;
  cacheKey: string | null;
  error: string | null;
}

/**
 * An in-page event delivered to {@link DevtoolsGlobalHook.subscribe} listeners.
 *
 * @example
 * ```ts
 * const unsubscribe = hook.subscribe((event) => console.log(event.type));
 * ```
 * @public
 */
export type DevtoolsHookEvent =
  | { type: 'store:added'; store: DevtoolsStoreInfo }
  | { type: 'store:removed'; storeId: string }
  | { type: 'request'; request: DevtoolsRequestEvent };

/**
 * Messages the page posts to the extension (`from: 'page'`).
 *
 * @example
 * ```ts
 * window.addEventListener('message', (event) => {
 *   const message = event.data as DevtoolsPageMessage;
 *   if (message.source === DEVTOOLS_MESSAGE_SOURCE && message.from === 'page') {}
 * });
 * ```
 * @public
 */
export type DevtoolsPageMessage =
  | { source: typeof DEVTOOLS_MESSAGE_SOURCE; from: 'page'; type: 'ready' }
  | {
      source: typeof DEVTOOLS_MESSAGE_SOURCE;
      from: 'page';
      type: 'hello';
      protocolVersion: typeof DEVTOOLS_PROTOCOL_VERSION;
      stores: DevtoolsStoreInfo[];
      requests: DevtoolsRequestEvent[];
    }
  | { source: typeof DEVTOOLS_MESSAGE_SOURCE; from: 'page'; type: 'store:added'; store: DevtoolsStoreInfo }
  | { source: typeof DEVTOOLS_MESSAGE_SOURCE; from: 'page'; type: 'store:removed'; storeId: string }
  | { source: typeof DEVTOOLS_MESSAGE_SOURCE; from: 'page'; type: 'request'; request: DevtoolsRequestEvent };

/**
 * Messages the extension posts to the page (`from: 'extension'`).
 *
 * @example
 * ```ts
 * const hello: DevtoolsExtensionMessage = { source: DEVTOOLS_MESSAGE_SOURCE, from: 'extension', type: 'hello-request' };
 * window.postMessage(hello, window.location.origin);
 * ```
 * @public
 */
export interface DevtoolsExtensionMessage {
  source: typeof DEVTOOLS_MESSAGE_SOURCE;
  from: 'extension';
  type: 'hello-request';
}

/**
 * The hook object installed on `globalThis`.
 *
 * @example
 * ```ts
 * const hook = installDevtoolsHook();
 * hook.getRegistry().map((entry) => entry.name);
 * ```
 * @public
 */
export interface DevtoolsGlobalHook {
  readonly protocolVersion: typeof DEVTOOLS_PROTOCOL_VERSION;
  /** Register a `Store`, returning its `storeId`. Registering twice returns the same id. */
  registerStore(store: Store, name?: string): string;
  /** Remove a `Store` from the registry. */
  unregisterStore(store: Store): void;
  /** Every registered `Store`, in registration order. */
  getRegistry(): DevtoolsRegistryEntry[];
  /** The `storeId` for a `Store`, or for the `RequestManager` a registered `Store` uses. */
  storeIdFor(requester: object): string | null;
  /** Record a request observation. Keeps only the most recent requests. */
  recordRequest(event: DevtoolsRequestEvent): void;
  /** The most recent request observations, oldest first, one per request id. */
  getRecordedRequests(): DevtoolsRequestEvent[];
  /** Listen for in-page events. Returns an unsubscribe function. */
  subscribe(callback: (event: DevtoolsHookEvent) => void): () => void;
}

const MAX_RECORDED_REQUESTS = 500;

function createHook(): DevtoolsGlobalHook {
  let sequence = 0;
  let extensionAttached = false;
  const registry = new Map<string, DevtoolsRegistryEntry>();
  const idByStore = new WeakMap<object, string>();
  const idByRequester = new WeakMap<object, string>();
  const requests = new Map<number, DevtoolsRequestEvent>();
  const listeners = new Set<(event: DevtoolsHookEvent) => void>();

  function infoFor(entry: DevtoolsRegistryEntry): DevtoolsStoreInfo {
    return {
      storeId: entry.storeId,
      name: entry.name,
      protocolVersion: entry.protocolVersion,
      capabilities: entry.capabilities,
    };
  }

  function post(message: DevtoolsPageMessage): void {
    const origin = window.location.origin;
    window.postMessage(message, origin === 'null' ? '*' : origin);
  }

  function emit(event: DevtoolsHookEvent): void {
    listeners.forEach((callback) => {
      callback(event);
    });
    if (!extensionAttached) {
      return;
    }
    if (event.type === 'request') {
      post({ source: DEVTOOLS_MESSAGE_SOURCE, from: 'page', type: 'request', request: event.request });
    } else if (event.type === 'store:added') {
      post({ source: DEVTOOLS_MESSAGE_SOURCE, from: 'page', type: 'store:added', store: event.store });
    } else {
      post({ source: DEVTOOLS_MESSAGE_SOURCE, from: 'page', type: 'store:removed', storeId: event.storeId });
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (event.source !== window) {
        return;
      }
      const data = event.data as Partial<DevtoolsExtensionMessage> | null;
      if (!data || data.source !== DEVTOOLS_MESSAGE_SOURCE || data.from !== 'extension') {
        return;
      }
      if (data.type === 'hello-request') {
        extensionAttached = true;
        post({
          source: DEVTOOLS_MESSAGE_SOURCE,
          from: 'page',
          type: 'hello',
          protocolVersion: DEVTOOLS_PROTOCOL_VERSION,
          stores: Array.from(registry.values(), infoFor),
          requests: Array.from(requests.values()),
        });
      }
    });

    // A panel that was already attached when this page (re)loaded sent its
    // `hello-request` before this listener existed. Announce readiness so the
    // extension can ask again.
    post({ source: DEVTOOLS_MESSAGE_SOURCE, from: 'page', type: 'ready' });
  }

  return {
    protocolVersion: DEVTOOLS_PROTOCOL_VERSION,

    registerStore(store: Store, name?: string): string {
      const existing = idByStore.get(store);
      if (existing) {
        const entry = registry.get(existing);
        if (entry && name) {
          entry.name = name;
        }
        return existing;
      }
      sequence += 1;
      const storeId = `store-${String(sequence)}`;
      const entry: DevtoolsRegistryEntry = {
        storeId,
        name: name ?? `Store ${String(sequence)}`,
        protocolVersion: DEVTOOLS_PROTOCOL_VERSION,
        capabilities: ['requests'],
        store,
      };
      registry.set(storeId, entry);
      idByStore.set(store, storeId);
      emit({ type: 'store:added', store: infoFor(entry) });
      return storeId;
    },

    unregisterStore(store: Store): void {
      const storeId = idByStore.get(store);
      if (!storeId) {
        return;
      }
      idByStore.delete(store);
      registry.delete(storeId);
      emit({ type: 'store:removed', storeId });
    },

    getRegistry(): DevtoolsRegistryEntry[] {
      return Array.from(registry.values());
    },

    storeIdFor(requester: object): string | null {
      const known = idByStore.get(requester) ?? idByRequester.get(requester);
      if (known) {
        return known;
      }
      // A Store's `requestManager` is assigned by the subclass after the
      // base constructor (where registration happens) returns, so the
      // RequestManager -> Store link can only be resolved lazily.
      for (const entry of registry.values()) {
        if ((entry.store as { requestManager?: object }).requestManager === requester) {
          idByRequester.set(requester, entry.storeId);
          return entry.storeId;
        }
      }
      return null;
    },

    recordRequest(event: DevtoolsRequestEvent): void {
      requests.delete(event.id);
      requests.set(event.id, event);
      if (requests.size > MAX_RECORDED_REQUESTS) {
        const oldest = requests.keys().next();
        if (!oldest.done) {
          requests.delete(oldest.value);
        }
      }
      emit({ type: 'request', request: event });
    },

    getRecordedRequests(): DevtoolsRequestEvent[] {
      return Array.from(requests.values());
    },

    subscribe(callback: (event: DevtoolsHookEvent) => void): () => void {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}

/**
 * Install the hook on `globalThis` if it is not already there, and return it.
 * Safe to call any number of times.
 *
 * @example
 * ```ts
 * import { installDevtoolsHook } from '@warp-drive/core/devtools-hook';
 *
 * const hook = installDevtoolsHook();
 * ```
 * @public
 */
export function installDevtoolsHook(): DevtoolsGlobalHook {
  const holder = globalThis as unknown as Record<string, DevtoolsGlobalHook | undefined>;
  let hook = holder[DEVTOOLS_HOOK_KEY];
  if (!hook) {
    hook = createHook();
    holder[DEVTOOLS_HOOK_KEY] = hook;
  }
  return hook;
}
