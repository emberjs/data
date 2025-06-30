import { assert } from '@warp-drive/build-config/macros';

import type { SignalStore, WarpDriveSignal } from '../../../store/-private/new-core-tmp/reactivity/internal';
import {
  consumeInternalSignal,
  getOrCreateInternalSignal,
} from '../../../store/-private/new-core-tmp/reactivity/internal';
import type { ExtensionDef } from '../schema';

export type ProxiedMethod = (...args: unknown[]) => unknown;
export function expectNever(value: never): void {}

export function isExtensionProp(
  extensions: Map<string | symbol, ExtensionDef> | null,
  prop: string | number | symbol
): prop is string | symbol {
  return Boolean(extensions && typeof prop !== 'number' && extensions.has(prop));
}

export function performObjectExtensionGet(
  receiver: object,
  extensions: Map<string | symbol, ExtensionDef>,
  signals: SignalStore,
  prop: string | symbol
): unknown {
  const desc = extensions.get(prop)!;
  switch (desc.kind) {
    case 'method': {
      return desc.fn;
    }
    case 'readonly-value': {
      return desc.value;
    }
    case 'mutable-value': {
      const signal = getOrCreateInternalSignal(signals, receiver, prop, desc.value);
      // we don't consume this signal, since its not a true local.
      return signal.value;
    }
    case 'readonly-field':
    case 'mutable-field': {
      return desc.get.call(receiver);
    }
    case 'writeonly-field': {
      assert(`Cannot get extended field ${String(prop)} as its definition has only a setter`);
      return undefined;
    }
    default: {
      expectNever(desc);
      assert(`Unhandled extension kind ${(desc as { kind: string }).kind}`);
      return undefined;
    }
  }
}

export function performExtensionSet(
  receiver: object,
  extensions: Map<string | symbol, ExtensionDef>,
  signals: SignalStore,
  prop: string | symbol,
  value: unknown
): boolean {
  const desc = extensions.get(prop)!;
  switch (desc.kind) {
    case 'method':
    case 'readonly-value':
    case 'readonly-field':
      assert(`Cannot set extension field ${String(prop)} as it is a ${desc.kind}`);
      return false;
    case 'mutable-value': {
      const signal = getOrCreateInternalSignal(signals, receiver, prop, desc.value);
      if (signal.value !== value) {
        // we don't notify this signal, since its not a true local.
        signal.value = value;
      }
      return true;
    }
    case 'writeonly-field':
    case 'mutable-field': {
      desc.set.call(receiver, value);
      return true;
    }
    default: {
      expectNever(desc);
      assert(`Unhandled extension kind ${(desc as { kind: string }).kind}`);
      return false;
    }
  }
}

export function performArrayExtensionGet(
  receiver: object,
  extensions: Map<string | symbol, ExtensionDef>,
  signals: SignalStore,
  prop: string | symbol,
  _SIGNAL: WarpDriveSignal,
  boundFns: Map<string | symbol | number, ProxiedMethod>,
  transaction: (v: boolean) => void
): unknown {
  const desc = extensions.get(prop)!;
  switch (desc.kind) {
    case 'method': {
      let fn = boundFns.get(prop);

      if (fn === undefined) {
        fn = function () {
          consumeInternalSignal(_SIGNAL);
          transaction(true);
          const result = Reflect.apply(desc.fn, receiver, arguments) as unknown;
          transaction(false);
          return result;
        };

        boundFns.set(prop, fn);
      }

      return fn;
    }
    case 'mutable-field':
    case 'readonly-field': {
      return desc.get.call(receiver);
    }
    case 'readonly-value': {
      return desc.value;
    }
    case 'mutable-value': {
      const signal = getOrCreateInternalSignal(signals, receiver, prop, desc.value);
      // we don't consume this signal, since its not a true local.
      return signal.value;
    }
    case 'writeonly-field': {
      assert(`Cannot get extended field ${String(prop)} as its definition has only a setter`);
      return undefined;
    }
    default: {
      expectNever(desc);
      assert(`Unhandled extension kind ${(desc as { kind: string }).kind}`);
      return undefined;
    }
  }
}
