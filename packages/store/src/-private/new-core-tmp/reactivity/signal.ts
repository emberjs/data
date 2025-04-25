import { assert } from '@warp-drive/build-config/macros';

import { compat, createMemo, getMemoValue } from './configure';
import type { Signals, SignalStore, WarpDriveSignal } from './internal';
import {
  consumeInternalSignal,
  createInternalSignal,
  getOrCreateInternalSignal,
  notifyInternalSignal,
  peekInternalSignal,
  withSignalStore,
} from './internal';

/**
 * Creates a signal for the key/object pairing and subscribes to the signal.
 *
 * Use when you need to ensure a signal exists and is subscribed to.
 */
export function entangleSignal<T extends object>(
  signals: SignalStore,
  obj: T,
  key: string | symbol,
  initialValue: unknown
): WarpDriveSignal {
  let signal = peekInternalSignal(signals, key);
  if (!signal) {
    signal = createInternalSignal(signals, obj, key, initialValue);
  }

  consumeInternalSignal(signal);
  return signal;
}

function createSignalDescriptor(key: string | symbol, intialValue: unknown) {
  return {
    enumerable: true,
    configurable: false,
    get(this: { [Signals]: SignalStore }) {
      const signals = withSignalStore(this);
      return entangleSignal(signals, this, key, intialValue).value;
    },
    set(this: { [Signals]: SignalStore }, value: unknown) {
      const signals = withSignalStore(this);
      const signal = getOrCreateInternalSignal(signals, this, key, intialValue);

      if (signal.value !== value) {
        signal.value = value;
        notifyInternalSignal(signal);
      }
    },
  };
}

/**
 * define an enumerable signal property.
 *
 * Akin to Object.defineProperty.
 *
 * The signal will be lazily created when accessed and scoped to the
 * instance of the object.
 */
export function defineSignal<T extends object>(obj: T, key: string, v?: unknown) {
  Object.defineProperty(obj, key, createSignalDescriptor(key, v));
}

/**
 * Define a non-enumerable signal property.
 */
export function defineNonEnumerableSignal<T extends object>(obj: T, key: string, v?: unknown) {
  const desc = createSignalDescriptor(key, v);
  desc.enumerable = false;
  Object.defineProperty(obj, key, desc);
}

export function memoized<T extends object, K extends keyof T & string>(
  target: T,
  key: K,
  descriptor: PropertyDescriptor
) {
  // Error on `@memoized()`, `@memoized(...args)`, and `@memoized propName = value;`
  assert(
    'You attempted to use @memoized(), which is not necessary nor supported. Remove the parentheses and you will be good to go!',
    target !== undefined
  );
  assert(
    `You attempted to use @memoized on with ${arguments.length > 1 ? 'arguments' : 'an argument'} ( @memoized(${Array.from(
      arguments
    )
      .map((d) => `'${d}'`)
      .join(
        ', '
      )}), which is not supported. Dependencies are automatically tracked, so you can just use ${'`@memoized`'}`,
    typeof target === 'object' && typeof key === 'string' && typeof descriptor === 'object' && arguments.length === 3
  );
  assert(
    `The @memoized decorator must be applied to getters. '${key}' is not a getter.`,
    typeof descriptor.get === 'function'
  );

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = descriptor.get;
  descriptor.get = function () {
    const signals = withSignalStore(this);

    let memoSignal = signals.get(key);
    if (!memoSignal) {
      memoSignal = createMemo(getter.bind(this)) as WarpDriveSignal;
      signals.set(key, memoSignal);
    }
    return getMemoValue(memoSignal);
  };

  return compat(descriptor);
}

export function gate<T extends object, K extends keyof T & string>(_target: T, key: K, desc: PropertyDescriptor) {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = desc.get as (this: T) => unknown;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setter = desc.set as (this: T, v: unknown) => void;

  desc.get = function (this: T) {
    const signals = withSignalStore(this);
    let signal = peekInternalSignal(signals, key);
    if (!signal) {
      signal = createInternalSignal(signals, this, key, getter.call(this));
    } else if (signal.isStale) {
      signal.isStale = false;
      signal.value = getter.call(this);
    }

    consumeInternalSignal(signal);
    return signal.value;
  };
  desc.set = function (this: T, v: unknown) {
    const signals = withSignalStore(this);
    let signal = peekInternalSignal(signals, key);
    if (!signal) {
      // we can't use `v` as initialValue here because setters don't
      // return the value and the final value may be different
      // than what the setter was called with.
      signal = createInternalSignal(signals, this, key, undefined);
      signal.isStale = true;
    }
    setter.call(this, v);
    // when a gate is set, we do not notify the signal
    // as its update is controlled externally.
  };

  return compat(desc);
}

export function defineGate<T extends object>(obj: T, key: string, desc: PropertyDescriptor) {
  const options = Object.assign({ enumerable: true, configurable: false }, gate(obj, key as keyof T & string, desc));
  Object.defineProperty(obj, key, options);
}
