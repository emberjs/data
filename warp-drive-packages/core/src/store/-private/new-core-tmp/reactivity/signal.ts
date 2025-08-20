import { assert } from '@warp-drive/core/build-config/macros';

import type { Signals, SignalStore, WarpDriveSignal } from './internal.ts';
import {
  consumeInternalSignal,
  createInternalMemo,
  createInternalSignal,
  getOrCreateInternalSignal,
  makeInitializer,
  notifyInternalSignal,
  peekInternalSignal,
  withSignalStore,
} from './internal.ts';

/**
 * Creates a signal for the key/object pairing and subscribes to the signal.
 *
 * Use when you need to ensure a signal exists and is subscribed to.
 *
 * @private
 */
export function entangleSignal<T extends object>(
  signals: SignalStore,
  obj: T,
  key: string | symbol,
  initialValue: unknown
): WarpDriveSignal {
  let internalSignal = peekInternalSignal(signals, key);
  if (!internalSignal) {
    internalSignal = createInternalSignal(signals, obj, key, initialValue);
  }

  consumeInternalSignal(internalSignal);
  return internalSignal;
}

export function entangleInitiallyStaleSignal<T extends object>(
  signals: SignalStore,
  obj: T,
  key: string | symbol,
  initialValue: unknown
): WarpDriveSignal {
  let internalSignal = peekInternalSignal(signals, key);
  if (!internalSignal) {
    internalSignal = createInternalSignal(signals, obj, key, initialValue);
    internalSignal.isStale = true; // mark it as stale
  }

  consumeInternalSignal(internalSignal);
  return internalSignal;
}

export function createSignalDescriptor(key: string | symbol, intialValue: unknown): PropertyDescriptor {
  return {
    enumerable: true,
    configurable: false,
    get(this: { [Signals]: SignalStore }) {
      const signals = withSignalStore(this);
      const internalSignal = entangleSignal(signals, this, key, intialValue);
      internalSignal.isStale = false; // reset stale state
      return internalSignal.value;
    },
    set(this: { [Signals]: SignalStore }, value: unknown) {
      const signals = withSignalStore(this);
      const internalSignal = getOrCreateInternalSignal(signals, this, key, intialValue);

      if (internalSignal.value !== value) {
        internalSignal.value = value;
        notifyInternalSignal(internalSignal);
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
 *
 * @private
 */
export function defineSignal<T extends object>(obj: T, key: string, v?: unknown): void {
  Object.defineProperty(obj, key, createSignalDescriptor(key, v));
}

/**
 * Define a non-enumerable signal property.
 *
 * @private
 */
export function defineNonEnumerableSignal<T extends object>(obj: T, key: string, v?: unknown): void {
  const desc = createSignalDescriptor(key, v);
  desc.enumerable = false;
  Object.defineProperty(obj, key, desc);
}

interface DecoratorPropertyDescriptor extends PropertyDescriptor {
  initializer?: () => unknown;
}

/**
 * Decorator version of creating a signal.
 */
export function signal<T extends object, K extends keyof T & string>(
  target: T,
  key: K,
  descriptor?: DecoratorPropertyDescriptor
): void {
  // Error on `@signal()`, `@signal(...args)``
  assert(
    'You attempted to use @signal(), which is not necessary nor supported. Remove the parentheses and you will be good to go!',
    target !== undefined
  );
  assert(
    `You attempted to use @signal on with ${arguments.length > 1 ? 'arguments' : 'an argument'} ( @signal(${Array.from(
      arguments
    )
      .map((d) => `'${d}'`)
      .join(
        ', '
      )}) ), which is not supported. Dependencies are automatically tracked, so you can just use ${'`@signal`'}`,
    typeof target === 'object' && typeof key === 'string' && typeof descriptor === 'object' && arguments.length === 3
  );

  return createSignalDescriptor(
    key,
    descriptor.initializer ? makeInitializer(descriptor.initializer) : null
  ) as unknown as void;
}

/**
 * Decorator version of creating a memoized getter
 */
export function memoized<T extends object, K extends keyof T & string>(
  target: T,
  key: K,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
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
      memoSignal = createInternalMemo(signals, this, key, getter.bind(this)) as unknown as WarpDriveSignal;
    }
    return (memoSignal as unknown as () => unknown)();
  };

  return descriptor;
}

/**
 * Decorator version of creating a gate.
 *
 * @private
 */
export function gate<T extends object, K extends keyof T & string>(
  _target: T,
  key: K,
  desc: PropertyDescriptor
): PropertyDescriptor {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = desc.get as (this: T) => unknown;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setter = desc.set as (this: T, v: unknown) => void;
  const isLocal = (desc as unknown as { isLocal?: boolean }).isLocal;

  desc.get = function (this: T) {
    const signals = withSignalStore(this);
    let internalSignal = peekInternalSignal(signals, key);
    if (!internalSignal) {
      internalSignal = createInternalSignal(signals, this, key, getter.call(this));
    } else if (internalSignal.isStale) {
      internalSignal.isStale = false;
      internalSignal.value = getter.call(this);
    }

    consumeInternalSignal(internalSignal);
    return internalSignal.value;
  };

  if (setter) {
    desc.set = function (this: T, v: unknown) {
      const signals = withSignalStore(this);
      let internalSignal = peekInternalSignal(signals, key);
      if (!internalSignal) {
        // we can't use `v` as initialValue here because setters don't
        // return the value and the final value may be different
        // than what the setter was called with.
        internalSignal = createInternalSignal(signals, this, key, undefined);
        internalSignal.isStale = true;
      }
      setter.call(this, v);
      // when a gate is set, we do not notify the signal
      // as its update is controlled externally.
      // unless it specifically sets itself to be locally managed
      if (isLocal) {
        internalSignal.isStale = true;
        notifyInternalSignal(internalSignal);
      }
    };
  }
  return desc;
}

export function defineGate<T extends object>(obj: T, key: string, desc: PropertyDescriptor): void {
  const options = Object.assign({ enumerable: true, configurable: false }, gate(obj, key as keyof T & string, desc));
  Object.defineProperty(obj, key, options);
}
