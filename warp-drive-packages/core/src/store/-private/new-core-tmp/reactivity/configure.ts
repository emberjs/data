import { assert } from '@warp-drive/core/build-config/macros';

import { getOrSetGlobal, peekTransient, setTransient } from '../../../../types/-private.ts';

export const ARRAY_SIGNAL = getOrSetGlobal('#[]', Symbol('#[]'));
export const OBJECT_SIGNAL = getOrSetGlobal('#{}', Symbol('#{}'));

/**
 * Requirements:
 *
 * Signal:
 *
 * - signal: a way of creating a reference that we can dirty when we desire to notify
 *         - @signal: a way of creating an accessor on an object that subscribes to a signal on access
 *                    and notifies the signal on set, or of upgrading a descriptor to be such an accessor
 *         - defineSignal: a way of creating a signal on an object
 *         - notifySignal: a way of notifying the underlying signal that it has been dirtied
 *         - peekSignal: a way of inspecting the signal without notifying it
 *
 *  - gate: a memoized getter function that re-runs when on access if its signal is dirty
 *          conceptually, a gate is a tightly coupled signal and memo
 *         - @gate: a way of creating a gate on an object or upgrading a descriptor with a getter
 *                  to be a gate
 *         - defineGate: a way of creating a gate on an object
 *         - notifySignal: a way of notifying the signal for a gate that it has been dirtied
 *
 * - memo:
 *        - @memo: a way of creating a memoized getter on an object or upgrading a descriptor with a getter
 *                 to be a memo
 *        - defineMemo: a way of creating a memo on an object
 *
 * - signalStore: storage bucket for signals associated to an object
 *        - withSignalStore: a way of pre-creating a signal store on an object
 *
 *
 * @internal
 */

/**
 * An Opaque type that represents a framework specific or TC39 signal.
 *
 * It may be an array of signals or a single signal.
 *
 * @internal
 */
export type SignalRef = unknown;
/**
 * The hooks which MUST be configured in order to use this library,
 * either for framework specfic signals or TC39 signals.
 *
 * Support for multiple frameworks simultaneously can be done via
 * this abstraction by returning multiple signals from the `createSignal`
 * method, and consuming the correct one via the correct framework via
 * the `consumeSignal` and `notifySignal` methods.
 *
 */
export interface SignalHooks<T = SignalRef> {
  createSignal: (obj: object, key: string | symbol) => T;
  consumeSignal: (signal: T) => void;
  notifySignal: (signal: T) => void;
  createMemo: <F>(obj: object, key: string | symbol, fn: () => F) => () => F;
  willSyncFlushWatchers: () => boolean;
  waitFor?: <K>(promise: Promise<K>) => Promise<K>;
}

export interface HooksOptions {
  wellknown: {
    Array: symbol | string;
  };
}

/**
 * The public API for configuring the signal hooks.
 *
 * @internal
 */
export function setupSignals<T>(buildConfig: (options: HooksOptions) => SignalHooks<T>) {
  // We want to assert this but can't because too many package manager
  // and bundler bugs exist that cause this to be called multiple times
  // for what should be a single call.
  // assert(`Cannot override configured signal hooks`, peekTransient('signalHooks') === null);
  const hooks = buildConfig({
    wellknown: {
      Array: ARRAY_SIGNAL,
    },
  });
  setTransient('signalHooks', hooks);
}

/**
 * Internal method for consuming the configured `createSignal` hook
 *
 * @internal
 */
export function createSignal(obj: object, key: string | symbol): SignalRef {
  const signalHooks: SignalHooks | null = peekTransient('signalHooks');
  assert(`Signal hooks not configured`, signalHooks);
  return signalHooks.createSignal(obj, key);
}

/**
 * Internal method for consuming the configured `consumeSignal` hook
 *
 * @internal
 */
export function consumeSignal(signal: SignalRef) {
  const signalHooks: SignalHooks | null = peekTransient('signalHooks');

  assert(`Signal hooks not configured`, signalHooks);
  return signalHooks.consumeSignal(signal);
}

/**
 * Internal method for consuming the configured `notifySignal` hook
 *
 * @internal
 */
export function notifySignal(signal: SignalRef) {
  const signalHooks: SignalHooks | null = peekTransient('signalHooks');
  assert(`Signal hooks not configured`, signalHooks);
  return signalHooks.notifySignal(signal);
}

export function createMemo<T>(object: object, key: string | symbol, fn: () => T): () => T {
  const signalHooks: SignalHooks | null = peekTransient('signalHooks');
  assert(`Signal hooks not configured`, signalHooks);
  return signalHooks.createMemo(object, key, fn);
}

export function willSyncFlushWatchers(): boolean {
  const signalHooks: SignalHooks | null = peekTransient('signalHooks');
  assert(`Signal hooks not configured`, signalHooks);
  return signalHooks.willSyncFlushWatchers();
}

export function waitFor<K>(promise: Promise<K>): Promise<K> {
  const signalHooks: SignalHooks | null = peekTransient('signalHooks');
  assert(`Signal hooks not configured`, signalHooks);
  if (signalHooks.waitFor) {
    return signalHooks.waitFor(promise);
  }
  return promise;
}
