import { createSubscriber } from 'svelte/reactivity';

import { type HooksOptions, setupSignals, type SignalHooks } from '@warp-drive/core/configure';

type Signal = {
  value: number;
};

export function buildSignalConfig(options: HooksOptions): SignalHooks<Signal> {
  return {
    createSignal(obj: object, key: string | symbol): Signal {
      let value = 1;
      let update: () => void | null;

      const subscribe = createSubscriber((updateFn) => {
        update = updateFn;
      });

      const signal = {
        get value() {
          subscribe();
          return value;
        },
        set value(new_value) {
          value = new_value;
          // Update will not exist if this hasn't been run inside an effect yet
          update?.();
        },
      };

      return signal;
    },
    consumeSignal: (signal: Signal) => void signal.value,
    notifySignal: (signal: Signal) => void signal.value++,
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      const m = $derived.by(fn);
      return () => m;
    },
    willSyncFlushWatchers: () => false,
  };
}

setupSignals(buildSignalConfig);
