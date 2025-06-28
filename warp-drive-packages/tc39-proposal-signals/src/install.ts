/**
 * Uses: https://github.com/proposal-signals/signal-polyfill
 */
import { Signal } from 'signal-polyfill';

import { setupSignals, type SignalHooks, type HooksOptions } from '@warp-drive/core/configure';

export function buildSignalConfig(options: HooksOptions) {
  return {
    createSignal: (obj: object, key: string | symbol) => new Signal.State(null, { equals: () => false }),
    consumeSignal: (signal: Signal.State) => void signal.get(),
    notifySignal: (signal: Signal.State) => void signal.set(),
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      const memo = Signal.Computed(fn);
      return () => memo.get();
    },
    willSyncFlushWatchers: () => false,
  } satisfies SignalHooks;
}

setupSignals(buildSignalConfig);
