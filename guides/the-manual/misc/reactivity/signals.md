# Signals

:::tabs

== Ember (classic compat)

```ts:line-numbers [Ember]
import { tagForProperty } from '@ember/-internals/metal';
import { _backburner } from '@ember/runloop';
import { consumeTag, createCache, dirtyTag, getValue, track, updateTag } from '@glimmer/validator';

import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/core/build-config/deprecations';
import { type HooksOptions, setupSignals, type SignalHooks } from '@warp-drive/core/configure';

type Tag = ReturnType<typeof tagForProperty>;
const emberDirtyTag = dirtyTag as unknown as (tag: Tag) => void;

export function buildSignalConfig(options: HooksOptions): SignalHooks {
  const ARRAY_SIGNAL = options.wellknown.Array;

  return {
    createSignal(obj: object, key: string | symbol): Tag | [Tag, Tag, Tag] {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (key === ARRAY_SIGNAL) { 
          return [tagForProperty(obj, key), tagForProperty(obj, 'length'), tagForProperty(obj, '[]')] as const;
        }
      }
      return tagForProperty(obj, key);
    },
    consumeSignal(signal: Tag | [Tag, Tag, Tag]) {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (Array.isArray(signal)) {
          consumeTag(signal[0]);
          consumeTag(signal[1]);
          consumeTag(signal[2]);
          return;
        }
      }

      consumeTag(signal);
    },
    notifySignal(signal: Tag | [Tag, Tag, Tag]) {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (Array.isArray(signal)) {
          emberDirtyTag(signal[0]);
          emberDirtyTag(signal[1]);
          emberDirtyTag(signal[2]);
          return;
        }
      }
      emberDirtyTag(signal);
    },
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      if (DEPRECATE_COMPUTED_CHAINS) {
        const propertyTag = tagForProperty(object, key);
        const memo = createCache(fn);
        let ret: F | undefined;
        const wrappedFn = () => {
          ret = getValue(memo);
        };
        return () => {
          const tag = track(wrappedFn);
          updateTag(propertyTag, tag);
          consumeTag(tag);
          return ret!;
        };
      } else {
        const memo = createCache(fn);
        return () => getValue(memo);
      }
    },
    willSyncFlushWatchers: () => {
      return !!_backburner.currentInstance && _backburner._autorun !== true;
    },
  } satisfies SignalHooks;
}

setupSignals(buildSignalConfig);
```

== Ember (octane)

```ts:line-numbers [Ember]
import { tagForProperty } from '@ember/-internals/metal';
import { _backburner } from '@ember/runloop';
import { consumeTag, createCache, dirtyTag, getValue } from '@glimmer/validator';

import { type HooksOptions, setupSignals, type SignalHooks } from '@warp-drive/core/configure';

type Tag = ReturnType<typeof tagForProperty>;
const emberDirtyTag = dirtyTag as unknown as (tag: Tag) => void;

export function buildSignalConfig(options: HooksOptions): SignalHooks {

  return {
    createSignal(obj: object, key: string | symbol): Tag | [Tag, Tag, Tag] {
      return tagForProperty(obj, key);
    },
    consumeSignal(signal: Tag | [Tag, Tag, Tag]) {
      consumeTag(signal);
    },
    notifySignal(signal: Tag | [Tag, Tag, Tag]) {
      emberDirtyTag(signal);
    },
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      const memo = createCache(fn);
      return () => getValue(memo);
    },
    willSyncFlushWatchers: () => {
      return !!_backburner.currentInstance && _backburner._autorun !== true;
    }
  } satisfies SignalHooks;
}

setupSignals(buildSignalConfig);
```

== React

```ts:line-numbers [React]
import { use } from 'react';
import { Signal } from 'signal-polyfill';

import { type HooksOptions, setupSignals, type SignalHooks } from '@warp-drive/core/configure';

import { WatcherContext } from './-private/reactive-context';

function tryConsumeContext(signal: Signal.State<unknown> | Signal.Computed<unknown>): void {
  const logError = console.error;
  try {
    console.error = () => {};
    // ensure signals are watched by our closest watcher
    const watcher = use(WatcherContext);
    console.error = logError;
    watcher?.watcher.watch(signal);
  } catch {
    console.error = logError;
    // if we are not in a React context, we will Error
    // so we just ignore it.
  }
}

export function buildSignalConfig(options: HooksOptions): SignalHooks {
  return {
    createSignal: (obj: object, key: string | symbol) =>
      new Signal.State(null, { equals: () => false }),

    notifySignal: (signal: Signal.State<unknown>) => {
      signal.set(signal.get());
    },

    consumeSignal: (signal: Signal.State<unknown>) => {
      tryConsumeContext(signal);
      void signal.get();
    },

    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      const memo = new Signal.Computed<F>(fn);
      return () => {
        tryConsumeContext(memo);

        return memo.get();
      };
    },

    willSyncFlushWatchers: () => false,
  } as SignalHooks;
}

setupSignals(buildSignalConfig);
```

== Vue

```vue:line-numbers [Vue]
import { computed, type Ref, ref } from 'vue';

import { type HooksOptions, setupSignals, type SignalHooks } from '@warp-drive/core/configure';

type Signal = Ref<1 | 0>;

export function buildSignalConfig(options: HooksOptions): SignalHooks {
  return {
    createSignal(_obj: object, _key: string | symbol): Signal {
      return ref(1);
    },
    consumeSignal(signal: Signal): void {
      signal.value;
    },
    notifySignal(signal: Signal) {
      signal.value ^= 1;
    },
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      const memo = computed(fn);
      return () => memo.value;
    },
    willSyncFlushWatchers: () => false,
  } as SignalHooks;
}

setupSignals(buildSignalConfig);
```

== Svelte

```svelte:line-numbers [Svelte]
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
```

== TC39 Signals

```ts:line-numbers [TC39]
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
```

:::
