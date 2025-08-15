import { assert } from '@warp-drive/core/build-config/macros';

import { getOrSetGlobal, peekTransient, setTransient } from '../../../../types/-private.ts';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type NotificationManager from '../../managers/notification-manager.ts';

export const ARRAY_SIGNAL: '___(unique) Symbol(#[])' = getOrSetGlobal('#[]', Symbol('#[]'));
export const OBJECT_SIGNAL: '___(unique) Symbol(#{})' = getOrSetGlobal('#{}', Symbol('#{}'));

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
 * @private
 */
export type SignalRef = unknown;
/**
 * The hooks which MUST be configured in order to use reactive arrays,
 * resources and documents with framework specfic signals or TC39 signals.
 *
 * Support for multiple frameworks simultaneously can be done via
 * this abstraction by returning multiple signals from the `createSignal`
 * method, and consuming the correct one via the correct framework via
 * the `consumeSignal` and `notifySignal` methods.
 *
 * Unlike many signals implementations, WarpDrive does not wrap values as
 * signals directly, but instead uses signals to alert the reactive layer
 * to changes in the underlying cache. E.g. a signal is associated to a value,
 * but does not serve as the cache for that value directly. We refer to this as
 * a "gate", the pattern has also been called "side-signals".
 *
 * A no-op implementation is allowed, though it may lead to performance issues
 * in locations that use createMemo as no memoization would be done. This is
 * typically desirable only when integrating with a framework that does its own
 * memoization and does not integrate with any signals-like primitive. For these
 * scenarios you may also be interested in integrating with the {@link NotificationManager}
 * more directly.
 *
 * @public
 */
export interface SignalHooks<T = SignalRef> {
  /**
   * Create a signal for the given key associated to the given object.
   *
   * This method does *not* need to cache the signal, it will only be
   * called once for a given object and key. However, if your framework
   * will look for a signal cache on the object in a given location or may
   * have created its own signal on the object for some reason it may be
   * useful to ensure such cache is properly updated.
   */
  createSignal: (obj: object, key: string | symbol) => T;
  /**
   * Consume (mark as acccessed) a signal previously created via createSignal.
   */
  consumeSignal: (signal: T) => void;
  /**
   * Alert a signal previously created via createSignal that its associated value has changed.
   */
  notifySignal: (signal: T) => void;
  /**
   * Take the given function and wrap it in signals-based memoization. Analagous
   * to a Computed in the TC39 spec.
   *
   * Should return a function which when run provides the latest value of the original
   * function.
   */
  createMemo: <F>(obj: object, key: string | symbol, fn: () => F) => () => F;

  /**
   * If the signals implementation allows synchronous flushing of watchers, and
   * has scheduled such a flush (e.g. watchers will run before the current calling
   * context yields) this should return "true".
   *
   * This is generally something that should return false for anything but the few
   * frameworks that extensively handle their own reactivity => render scheduling.
   *
   * For an example, see EmberJS's backburner scheduler which functioned as a microtask
   * polyfill.
   */
  willSyncFlushWatchers: () => boolean;

  /**
   * An optional method that allows wrapping key promises within WarpDrive
   * for things like test-waiters.
   */
  waitFor?: <K>(promise: Promise<K>) => Promise<K>;
}

/**
 * Contains information a {@link SignalHooks} implementation may want
 * to use, such as the specialized key used for the signal
 * representing an array's contents / length.
 *
 * ```ts
 * interface HooksOptions {
 *   wellknown: {
 *     Array: symbol | string;
 *   }
 * }
 * ```
 *
 * @public
 */
export interface HooksOptions {
  /**
   * A list of specialized symbols/strings
   * used by WarpDrive to encapsulate key
   * reactivity concerns.
   */
  wellknown: {
    /**
     * The key used when the signal provides reactivity for the
     * `length` or "contents" of an array.
     *
     * Arrays only use a single signal for all accesses, regardless
     * of index, property or method: this one.
     */
    Array: symbol | string;
  };
}

/**
 * Configures the signals implementation to use. Supports multiple
 * implementations simultaneously.
 *
 * See {@link HooksOptions} for the options passed to the provided function
 * when called.
 *
 * See {@link SignalHooks} for the implementation the callback function should
 * return.
 *
 * @public
 * @param buildConfig - a function that takes options and returns a configuration object
 */
export function setupSignals<T>(buildConfig: (options: HooksOptions) => SignalHooks<T>): void {
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
 * @private
 */
export function createSignal(obj: object, key: string | symbol): SignalRef {
  const signalHooks: SignalHooks | null = peekTransient('signalHooks');
  assert(`Signal hooks not configured`, signalHooks);
  return signalHooks.createSignal(obj, key);
}

/**
 * Internal method for consuming the configured `consumeSignal` hook
 *
 * @private
 */
export function consumeSignal(signal: SignalRef): void {
  const signalHooks: SignalHooks | null = peekTransient('signalHooks');

  assert(`Signal hooks not configured`, signalHooks);
  return signalHooks.consumeSignal(signal);
}

/**
 * Internal method for consuming the configured `notifySignal` hook
 *
 * @private
 */
export function notifySignal(signal: SignalRef): void {
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

  if (signalHooks?.waitFor) {
    return signalHooks.waitFor(promise);
  }
  return promise;
}
