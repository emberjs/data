/**
 * Unlike reactive frameworks, React does not have the ability to support
 * fine-grained reactivity. However, we can approximate it to "good enough"
 * granularity by keeping track of signals used within a specific context.
 *
 * React also does not have a built-in way to memoize functions the way that
 * reactive frameworks do, but by building overtop of other Signal libraries
 * we can provide this.
 *
 * Due to the above limitations, @warp-drive/react/install is built
 * overtop @warp-drive/tc39-proposal-signals/install.
 *
 * The TC39 Watcher especially is valuable here, as it allows us to subscribe to changes
 * to the dependency graph of a memo and not just a signal.
 */

import { use } from 'react';
import { Signal } from 'signal-polyfill';

import { LOG_REACT_SIGNAL_INTEGRATION } from '@warp-drive/core/build-config/debugging';
import { type HooksOptions, setupSignals, type SignalHooks } from '@warp-drive/core/configure';
import { buildSignalConfig as _buildSignalConfig } from '@warp-drive/tc39-proposal-signals/install';

import { WatcherContext } from './-private/reactive-context';

function tryConsumeContext(signal: Signal.State<unknown> | Signal.Computed<unknown>): void {
  try {
    // ensure signals are watched by our closest watcher
    const watcher = use(WatcherContext);
    watcher?.watcher.watch(signal);
    if (LOG_REACT_SIGNAL_INTEGRATION) {
      // eslint-disable-next-line no-console
      console.log(`[WarpDrive] Consumed Context Signal`, signal, watcher);
    }
  } catch {
    // if we are not in a React context, we will Error
    // so we just ignore it.
    if (LOG_REACT_SIGNAL_INTEGRATION) {
      // eslint-disable-next-line no-console
      console.log(`[WarpDrive] No Context Available To Consume Signal`, signal);
    }
  }
}

export function buildSignalConfig(options: HooksOptions): SignalHooks<Signal.State<unknown>> {
  const config = _buildSignalConfig(options);
  const newConfig = Object.assign({}, config);

  newConfig.notifySignal = (signal: Signal.State<unknown>) => {
    if (LOG_REACT_SIGNAL_INTEGRATION) {
      // eslint-disable-next-line no-console
      console.log(`[WarpDrive] Notifying Signal`, signal);
    }
    config.notifySignal(signal);
  };

  newConfig.consumeSignal = (signal: Signal.State<unknown>) => {
    tryConsumeContext(signal);
    config.consumeSignal(signal);
  };

  newConfig.createMemo = <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
    const memo = new Signal.Computed<F>(fn);
    return () => {
      tryConsumeContext(memo);

      return memo.get();
    };
  };

  return newConfig;
}

setupSignals(buildSignalConfig);
