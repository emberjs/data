/**
 * Uses: https://github.com/proposal-signals/signal-polyfill
 */

import { Signal } from 'signal-polyfill';

import { setupSignals } from '@warp-drive/core/configure';
import type { SignalHooks } from '@warp-drive/core/store/-private';

type State = Signal['State'];

export function buildSignalConfig(options: {
  wellknown: {
    Array: symbol | string;
  };
}) {
  return {
    createSignal(obj: object, key: string | symbol): State {
      return new Signal.State(null, { equals: () => false });
    },
    consumeSignal(signal: State) {
      signal.get();
    },
    notifySignal(signal: Signal) {
      signal.set();
    },
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      const memo = Signal.Computed(fn);
      return () => memo.get();
    },

    /**
     * TC39's Signals proposal example-implementation does not have run loop
     */
    willSyncFlushWatchers: () => {
      //@ts-expect-error
      return !!_backburner.currentInstance && _backburner._autorun !== true;
    },
    /**
     * TC39's Signals proposal example-implementation has no test instrumentation for promises
     */
    waitFor: async <K>(promise: Promise<K>): Promise<K> => {
      return promise;
    },
  } satisfies SignalHooks;
}

setupSignals(buildSignalConfig);
