/**
 * Uses: https://github.com/proposal-signals/signal-polyfill
 */
import { Signal } from 'signal-polyfill';

import { type HooksOptions, setupSignals, type SignalHooks } from '@warp-drive/core/configure';

export function buildSignalConfig(_options: HooksOptions): SignalHooks<Signal.State<unknown>> {
  return {
    createSignal: (obj: object, key: string | symbol) => new Signal.State(null, { equals: () => false }),
    consumeSignal: (signal: Signal.State<unknown>) => void signal.get(),
    notifySignal: (signal: Signal.State<unknown>) => signal.set(1),
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      const memo = new Signal.Computed<F>(fn);
      return () => memo.get();
    },
    willSyncFlushWatchers: () => false,
  };
}

setupSignals(buildSignalConfig);
