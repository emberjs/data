import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL, type SignalRef } from './internal';

type MemoRef = unknown;
/**
 * The hooks which MUST be configured in order to use this library,
 * either for framework specfic signals or TC39 signals.
 *
 * Support for multiple frameworks simultaneously can be done via
 * this abstraction by returning multiple signals from the `createSignal`
 * method, and consuming the correct one via the correct framework via
 * the `consumeSignal` and `notifySignal` methods.
 */
export interface SignalHooks<T = SignalRef, M = MemoRef> {
  createSignal: (obj: object, key: string | symbol) => T;
  consumeSignal: (signal: T) => void;
  notifySignal: (signal: T) => void;
  compat?: (desc: PropertyDescriptor) => PropertyDescriptor;
  createMemo: (fn: () => unknown) => M;
  getMemoValue: (memo: M) => unknown;
}

let signalHooks: SignalHooks | null = null;

/**
 * The public API for configuring the signal hooks.
 *
 * @internal
 */
export function setupSignals<T>(hooks: SignalHooks<T>) {
  assert(`Cannot override configured signal hooks`, signalHooks === null);
  signalHooks = hooks as SignalHooks;
}

/**
 * Internal method for consuming the configured `createSignal` hook
 *
 * @internal
 */
export function createSignal(obj: object, key: string | symbol): SignalRef {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.createSignal(obj, key);
}

/**
 * Internal method for consuming the configured `consumeSignal` hook
 *
 * @internal
 */
export function consumeSignal(signal: SignalRef) {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.consumeSignal(signal);
}

/**
 * Internal method for consuming the configured `notifySignal` hook
 *
 * @internal
 */
export function notifySignal(signal: SignalRef) {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.notifySignal(signal);
}

export function isArraySignal(key: string | symbol): boolean {
  return key === ARRAY_SIGNAL;
}

export function compat(target: object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;
export function compat(desc: PropertyDescriptor): PropertyDescriptor;
export function compat(
  target: object | PropertyDescriptor,
  key?: string | symbol,
  desc?: PropertyDescriptor
): PropertyDescriptor {
  assert(`Signal hooks not configured`, signalHooks !== null);
  const actualDesc = arguments.length === 3 ? desc! : (target as PropertyDescriptor);
  if (!signalHooks.compat) {
    return actualDesc;
  }
  return signalHooks.compat(actualDesc);
}

export function createMemo<T>(fn: () => T): unknown {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.createMemo(fn);
}

export function getMemoValue(memo: unknown): unknown {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.getMemoValue(memo);
}
