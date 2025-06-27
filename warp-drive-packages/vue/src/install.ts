import { computed, type Ref, ref } from 'vue';

import { type HooksOptions, setupSignals, type SignalHooks } from '@warp-drive/core/configure';

type Signal = Ref<1 | 0>;

export function buildSignalConfig(_options: HooksOptions) {
  return {
    createSignal(_obj: object, _key: string | symbol): Signal {
      return ref(1);
    },
    consumeSignal(signal: Signal): void {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      signal.value;
    },
    notifySignal(signal: Signal) {
      signal.value ^= 1;
    },
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      const memo = computed(fn);
      return () => memo.value;
    },
    willSyncFlushWatchers: () => {
      return false;
    },
  } satisfies SignalHooks<Signal>;
}

setupSignals(buildSignalConfig);
