import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import { getOrSetGlobal } from '../../../../types/-private.ts';
import {
  ARRAY_SIGNAL,
  consumeSignal,
  createMemo,
  createSignal,
  notifySignal,
  OBJECT_SIGNAL,
  type SignalRef,
} from './configure.ts';

export type { SignalRef };
export { ARRAY_SIGNAL, OBJECT_SIGNAL };

const INITIALIZER_PROTO = { isInitializer: true } as const;
interface Initializer {
  value: () => unknown;
}
export function makeInitializer(fn: () => unknown): Initializer {
  // we use a prototype to ensure that the initializer is not enumerable
  // and does not interfere with the signal's value.
  return Object.assign(Object.create(INITIALIZER_PROTO), { value: fn }) as Initializer;
}

function isInitializer(obj: unknown): obj is Initializer {
  return typeof obj === 'object' && obj !== null && Object.getPrototypeOf(obj) === INITIALIZER_PROTO;
}

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
 * @private
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
   * @private
   */
  signal: SignalRef;

  /**
   * The last "value" computed for this signal when
   * a signal is also used for storage.
   *
   * @private
   */
  value: unknown;

  /**
   * Whether ths signal is known to have been dirtied.
   * This is useful *both* when manually managing the
   * `value` cache and when using the signal as a
   * "gate"
   *
   * @private
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
 * @private
 */
export const Signals: '___(unique) Symbol(Signals)' = getOrSetGlobal('Signals', Symbol('Signals'));
export type SignalStore = Map<string | symbol, WarpDriveSignal>;

/**
 * A type util to recast the object as having a signal store.
 *
 * @private
 */
export function upgradeWithSignals<T extends object>(obj: T): asserts obj is T & { [Signals]: SignalStore } {}

/**
 * A util that will create a signal store on the object
 * if it does not already exist and returns the associated
 * signal store.
 *
 * @private
 */
export function withSignalStore<T extends object>(obj: T): SignalStore {
  upgradeWithSignals(obj);
  if (!obj[Signals]) {
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
 *
 * @private
 */
export function initializeSignalStore<T extends object>(obj: T): asserts obj is T & { [Signals]: SignalStore } {
  upgradeWithSignals(obj);
  assert(`Signal store already exists on object`, !obj[Signals]);
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
    value: isInitializer(initialValue) ? initialValue.value.call(obj) : initialValue,
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

export function createInternalMemo<T>(
  signals: SignalStore,
  object: object,
  key: string | symbol,
  fn: () => T
): () => T {
  assert(`Expected no signal/memo to exist for key "${String(key)}"`, !peekInternalSignal(signals, key));
  if (DEBUG) {
    return withFrame(signals, object, key, fn);
  } else {
    const memo = createMemo(object, key, fn);
    signals.set(key, memo as unknown as WarpDriveSignal);
    return memo;
  }
}

export function consumeInternalMemo<T>(fn: () => T): T {
  TrackingFrame?.signals.add(fn as unknown as WarpDriveSignal);
  return fn();
}

export function peekInternalSignal(
  signals: SignalStore | undefined,
  key: string | symbol
): WarpDriveSignal | undefined {
  return signals?.get(key);
}

export function consumeInternalSignal(signal: WarpDriveSignal): void {
  TrackingFrame?.signals.add(signal);
  consumeSignal(signal.signal);
}

export function notifyInternalSignal(signal: WarpDriveSignal | undefined): void {
  if (signal) {
    signal.isStale = true;
    notifySignal(signal.signal);
  }
}

interface TrackingFrame {
  object: object;
  key: string | symbol;
  signals: Set<WarpDriveSignal>;
  parent: TrackingFrame | null;
}

let TrackingFrame: TrackingFrame | null = null;

/**
 * This is currently just for signals debugging, but it could be used in production
 * if we wanted to eliminate the need for frameworks to implement createMemo / to
 * allow us to add our own Watcher.
 *
 * @internal
 */
function withFrame<T>(signals: SignalStore, object: object, key: string | symbol, fn: () => T): () => T {
  const frameSignals = new Set<WarpDriveSignal>();
  const frameFn = () => {
    if (frameSignals.size) {
      frameSignals.clear();
    }
    TrackingFrame = {
      object,
      key,
      signals: frameSignals,
      parent: TrackingFrame,
    };
    try {
      return fn();
    } finally {
      TrackingFrame = TrackingFrame.parent;
    }
  };
  const memo = createMemo(object, key, frameFn);
  // @ts-expect-error
  memo.signals = frameSignals;
  signals.set(key, memo as unknown as WarpDriveSignal);

  return memo;
}

function isMemo(obj: unknown): obj is { signals: Set<WarpDriveSignal> } {
  // @ts-expect-error
  return typeof obj === 'function' && obj.signals instanceof Set;
}

if (DEBUG) {
  // @ts-expect-error adding to global API
  globalThis.debugWarpDriveSignals = (obj: object, key?: string | symbol): boolean => {
    upgradeWithSignals(obj);
    const signals = obj[Signals];
    if (!signals) {
      log('The object has no associated signals');
      return false;
    }

    if (key) {
      const signal = signals.get(key);
      if (!signal) {
        log(`No signal found for key "${String(key)}"`);
        return false;
      }
      log(signal);
      if (isMemo(signal)) {
        colorizeLines(printMemo(signal, key));
        return true;
      } else {
        colorizeLines(printSignal(signal, key));
        return true;
      }
    }

    const lines: string[] = [];
    for (const [k, signal] of signals) {
      if (isMemo(signal)) continue;
      printSignal(signal, k, lines);
    }
    for (const [k, signal] of signals) {
      if (isMemo(signal)) {
        printMemo(signal, k, lines);
      }
    }

    log(signals);
    colorizeLines(lines);

    return true;
  };
}

const LightColors = {
  red: 'color: red;',
  green: 'color: green;',
  reset: 'color: inherit;',
};
const DarkColors = {
  red: 'color: red;',
  green: 'color: lightgreen;',
  reset: 'color: inherit;',
};
function isLightMode() {
  if (window?.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return true;
  }
  return false;
}

const RED = {} as unknown as string;
const GREEN = {} as unknown as string;
const RESET = {} as unknown as string;
const EOL = {} as unknown as string;

function colorizeLines(lines: string[]): void {
  const Colors = isLightMode() ? LightColors : DarkColors;
  const colors = [];
  let line = '';

  for (const str of lines) {
    if (str === RED) {
      colors.push(Colors.red);
      line += '%c';
    } else if (str === GREEN) {
      colors.push(Colors.green);
      line += '%c';
    } else if (str === RESET) {
      colors.push(Colors.reset);
      line += '%c';
    } else if (str === EOL) {
      line += '\n';
    } else {
      line += str;
    }
  }

  log(line, ...colors);
}

function log(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(...args);
}

function isDirty(signal: WarpDriveSignal): boolean {
  return signal.isStale;
}

function isDirtyMemo(memo: { signals: Set<WarpDriveSignal> }): boolean {
  // iterate simple signals first to get fastest answer
  for (const signal of memo.signals) {
    if (isMemo(signal)) continue;
    if (isDirty(signal)) {
      return true;
    }
  }
  for (const signal of memo.signals) {
    if (isMemo(signal)) {
      return isDirtyMemo(signal);
    }
  }
  return false;
}

function printSignal(signal: WarpDriveSignal, key: string | symbol, lines: string[] = [], depth = 0): string[] {
  const _dirty = isDirty(signal);
  lines.push(
    `${''.padStart(depth * 2, ' ')}${_dirty ? '❌' : '✅'} `,
    _dirty ? RED : GREEN,
    `${String(key)}`,
    RESET,
    EOL
  );
  return lines;
}

function printMemo(
  memo: { signals: Set<WarpDriveSignal> },
  key: string | symbol,
  lines: string[] = [],
  depth = 0
): string[] {
  const _dirty = isDirtyMemo(memo);
  lines.push(
    `${''.padStart(depth * 2, ' ')}${_dirty ? '❌' : '✅'} `,
    _dirty ? RED : GREEN,
    `<memo> ${String(key)}`,
    RESET,
    `: (consumes ${memo.signals.size} signals)`,
    EOL
  );
  for (const signal of memo.signals) {
    if (isMemo(signal)) continue;
    printSignal(signal, signal.key, lines, depth + 1);
  }
  for (const signal of memo.signals) {
    if (isMemo(signal)) {
      printMemo(signal, signal.key, lines, depth + 1);
    }
  }
  return lines;
}
