/**
 * {@include ./install.md}
 * @module
 */

import { use } from 'react';
import { Signal } from 'signal-polyfill';

import { LOG_REACT_SIGNAL_INTEGRATION } from '@warp-drive/core/build-config/debugging';
import { DEBUG, TESTING } from '@warp-drive/core/build-config/env';
import { type HooksOptions, setupSignals, type SignalHooks } from '@warp-drive/core/configure';

import { WatcherContext } from './-private/reactive-context';

function tryConsumeContext(signal: Signal.State<unknown> | Signal.Computed<unknown>): void {
  // eslint-disable-next-line no-console
  const logError = console.error;
  try {
    // eslint-disable-next-line no-console
    console.error = () => {};
    // ensure signals are watched by our closest watcher
    const watcher = use(WatcherContext);
    // eslint-disable-next-line no-console
    console.error = logError;
    watcher?.watcher.watch(signal);
    if (LOG_REACT_SIGNAL_INTEGRATION) {
      // eslint-disable-next-line no-console
      console.log(`[WarpDrive] Consumed Context Signal`, signal, watcher);
    }
  } catch {
    // eslint-disable-next-line no-console
    console.error = logError;
    // if we are not in a React context, we will Error
    // so we just ignore it.
    if (LOG_REACT_SIGNAL_INTEGRATION) {
      // eslint-disable-next-line no-console
      console.log(`[WarpDrive] No Context Available To Consume Signal`, signal);
    }
  }
}

let pending: Promise<unknown>[];
export async function settled(): Promise<void> {
  if (TESTING) {
    // in testing mode we provide a test waiter integration
    if (!pending || !pending.length) return;
    const current = pending ?? [];
    pending = [];
    await Promise.allSettled(current);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    return settled();
  }
}

export function buildSignalConfig(options: HooksOptions): SignalHooks {
  return {
    createSignal: (obj: object, key: string | symbol) =>
      new Signal.State(DEBUG ? { obj, key } : null, { equals: () => false }),

    notifySignal: (signal: Signal.State<unknown>) => {
      if (LOG_REACT_SIGNAL_INTEGRATION) {
        if (Signal.subtle.hasSinks(signal)) {
          // eslint-disable-next-line no-console
          console.log(`[WarpDrive] Notifying Signal`, signal);
        } else {
          // eslint-disable-next-line no-console
          console.log(`[WarpDrive] Notified Signal That Has No Watcher`, signal);
        }
      }
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

    waitFor: (promise) => {
      if (TESTING) {
        pending = pending || [];
        const newPromise = promise.finally(() => {
          pending = pending.filter((p) => p !== newPromise);
        });
        pending.push(newPromise);
        return newPromise;
      }
      return promise;
    },

    willSyncFlushWatchers: () => false,
  } as SignalHooks;
}

setupSignals(buildSignalConfig);
