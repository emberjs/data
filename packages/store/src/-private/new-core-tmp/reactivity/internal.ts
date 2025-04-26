import { assert } from '@warp-drive/build-config/macros';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';

import { consumeSignal, createSignal, notifySignal } from './configure';

/**
 * An Opaque type that represents a framework specific or TC39 signal.
 *
 * It may be an array of signals or a single signal.
 *
 * @internal
 */
export type SignalRef = unknown;
/**
 * A WarpDriveSignal is a wrapper around a framework specific or TC39 signal
 * that enables us to store and manage the signal in a universal way.
 *
 * WarpDrive uses signals to manage three separate concepts:
 *
 * - as a `storage` for a value local to the object that we want to be reactive
 *   (see `@local` schema field for an example)
 * - as a `gate` for a memoized getter that we want to act as a reactive property
 *   but whose value is computed/pulled from a non-reactive source elsewhere
 *   and whose latest value is stored in the signal
 *   (see `field` schema field for an example)
 * - as a `gate` with a manually managed value updated on pull when `isStale` is true
 *
 *
 * It offers
 *
 * - a non-reactive way to access/update the current value
 * - a non-reactive way to mark the signal as dirtied
 * - a non-reactive way to store content for why the signal was dirtied
 * - access to the underlying Signal(s) in-use
 *
 * For debugging:
 * - the "key" or "name" of the signal
 * - the "object identity" or "context" to which the signal is attached
 *
 * @internal
 */
export interface WarpDriveSignal {
  /**
   * The "key" or "name" of the signal.
   * This is usually (but not always) the name of a property
   * on the object to which the signal is attached.
   *
   * This is used for debugging purposes.
   * It is not used for any other purpose.
   *
   * @internal
   */
  key: string | symbol;

  /**
   * The "object identity" or "context" to which the
   * signal is attached.
   *
   * This is used for debugging purposes.
   * It is not used for any other purpose.
   *
   * @internal
   */
  context: object;

  /**
   * The underlying signal(s) in-use.
   *
   * Generally, this is a single signal.
   *
   * In some cases multiple signals need to be condensed,
   * such as to support legacy Ember Array APIs or to
   * support reactive-objects shared between the code of
   * multiple frameworks.
   *
   * In such cases, this value may be an array.
   *
   * e.g. (pseudo-code for Ember):
   *
   * setupSignals({
   *   createSignal: (obj, key, initialValue) => {
   *     if (isArraySignal(key)) {
   *       return [
   *         tagForProperty(obj, key),
   *         tagForProperty(obj, '[]'),
   *         tagForProperty(obj, 'length'),
   *       ];
   *     }
   *     return tagForProperty(obj, key);
   *   },
   *
   *   consumeSignal: (signal) => {
   *     if (Array.isArray(signal)) {
   *       signal.forEach((s) => consumeTag(s));
   *     } else {
   *       consumeTag(signal);
   *     }
   *   },
   *
   *   dirtySignal: (signal) => {
   *     if (Array.isArray(signal)) {
   *       signal.forEach((s) => dirtyTag(s));
   *     } else {
   *       dirtyTag(signal);
   *     }
   *   },
   * });
   *
   * @internal
   */
  signal: SignalRef;

  /**
   * The last "value" computed for this signal when
   * a signal is also used for storage.
   *
   * @internal
   */
  value: unknown;

  /**
   * Whether ths signal is known to have been dirtied.
   * This is useful *both* when manually managing the
   * `value` cache and when using the signal as a
   * "gate"
   *
   * @internal
   */
  isStale: boolean;
}

/**
 * We attach signals to their context object via
 * a Map attached to the object via this symbol.
 *
 * This allows us to store multiple signals
 * on the same object with smaller memory
 * overhead and no WeakMap lookups.
 *
 * Performance sensitive objects should
 * pre-warm their shape by assigning this
 * during initialization.
 *
 * ```ts
 * initializeSignalStore(obj);
 * ```
 *
 * @internal
 */
export const Signals = getOrSetGlobal('Signals', Symbol('Signals'));
export const ARRAY_SIGNAL = getOrSetGlobal('#[]', Symbol('#[]'));
export const OBJECT_SIGNAL = getOrSetGlobal('#{}', Symbol('#{}'));
export type SignalStore = Map<string | symbol, WarpDriveSignal>;

/**
 * A type util to recast the object as having a signal store.
 *
 * @internal
 */
export function upgradeWithSignals<T extends object>(obj: T): asserts obj is T & { [Signals]: SignalStore } {}

/**
 * A util that will create a signal store on the object
 * if it does not already exist and returns the associated
 * signal store.
 *
 * @internal
 */
export function withSignalStore<T extends object>(obj: T) {
  upgradeWithSignals(obj);
  if (obj[Signals] === undefined) {
    initializeSignalStore(obj);
  }
  return obj[Signals];
}

/**
 * A util that will create a signal store on the object
 * if it does not already exist.
 *
 * Useful for pre-warming the shape of an object to ensure
 * a key-transition to add it is not required later.
 */
export function initializeSignalStore<T extends object>(obj: T): asserts obj is T & { [Signals]: SignalStore } {
  upgradeWithSignals(obj);
  assert(`Signal store already exists on object`, obj[Signals] === undefined);
  obj[Signals] = new Map();
}

export function createInternalSignal(
  signals: SignalStore,
  obj: object,
  key: string | symbol,
  initialValue: unknown
): WarpDriveSignal {
  const warpDriveSignal = {
    key,
    context: obj,
    signal: createSignal(obj, key),
    value: initialValue,
    isStale: false,
  };

  signals.set(key, warpDriveSignal);

  return warpDriveSignal;
}

export function getOrCreateInternalSignal(
  signals: SignalStore,
  obj: object,
  key: string | symbol,
  initialValue: unknown
): WarpDriveSignal {
  let signal = peekInternalSignal(signals, key);
  if (!signal) {
    signal = createInternalSignal(signals, obj, key, initialValue);
  }
  return signal;
}

export function peekInternalSignal(
  signals: SignalStore | undefined,
  key: string | symbol
): WarpDriveSignal | undefined {
  return signals?.get(key);
}

export function expectInternalSignal(signals: SignalStore | undefined, key: string | symbol): WarpDriveSignal {
  const signal = peekInternalSignal(signals, key);
  assert(`Expected signal for ${String(key)}`, signal);
  return signal;
}

export function consumeInternalSignal(signal: WarpDriveSignal) {
  consumeSignal(signal.signal);
}

export function notifyInternalSignal(signal: WarpDriveSignal) {
  signal.isStale = true;
  notifySignal(signal.signal);
}

// export function notifyInternalSignalByName(obj: object, key: string | symbol) {
//   const signals = withSignalStore(obj);
//   const signal = getOrCreateInternalSignal(signals, obj, key, undefined);
//   if (signal) {
//     notifyInternalSignal(signal);
//   }
//   return signal;
// }
