import { Signal } from "signal-polyfill";
import { createContext, type JSX, type ReactNode, useSyncExternalStore, type Context, useMemo } from "react";
import { LOG_REACT_SIGNAL_INTEGRATION } from "@warp-drive/core/build-config/debugging";

function _createWatcher() {
  if (LOG_REACT_SIGNAL_INTEGRATION) {
    console.log(`[WarpDrive] Creating a Watcher`);
  }
  const state = {
    pending: false,
    destroyed: false,
    notifyReact: null as (() => void) | null,
    watcher: null as unknown as Signal.subtle.Watcher,

    // the extra wrapper returned here ensures that the context value for the watcher
    // changes causing a re-render when the watcher is updated.
    snapshot: null as { watcher: Signal.subtle.Watcher } | null,
  };

  const clearWatcher = () => {
    state.watcher.unwatch(...Signal.subtle.introspectSources(state.watcher));
  };

  state.watcher = new Signal.subtle.Watcher(() => {
    if (!state.pending && !state.destroyed) {
      state.pending = true;
      queueMicrotask(() => {
        state.pending = false;
        if (state.destroyed) {
          if (LOG_REACT_SIGNAL_INTEGRATION) {
            console.log(`[WarpDrive] Detected Watcher Destroyed During Notify Flush, clearing signals`);
          }
          state.snapshot = null;
          clearWatcher();
          return;
        }

        if (LOG_REACT_SIGNAL_INTEGRATION) {
          console.log(`[WarpDrive] Notifying React That The WatcherContext Has Updated`);
        }

        // any time signals have changed, we notify React that our store has updated
        state.snapshot = { watcher: state.watcher };
        if (state.notifyReact) state.notifyReact();

        // tell the Watcher to start watching for changes again
        // by signaling that notifications have been flushed.
        state.watcher.watch();
      });
    } else if (state.destroyed) {
      if (LOG_REACT_SIGNAL_INTEGRATION) {
        console.log(`[WarpDrive] Detected Watcher Destroyed During Notify, clearing signals`);
      }
      // if we are destroyed, we clear the watcher signals
      // so that it does not continue to watch for changes.
      state.snapshot = null;
      clearWatcher();
    }
  });

  // The watcher won't begin watching until we call `watcher.watch()`
  state.watcher.watch();
  state.snapshot = { watcher: state.watcher };

  return state;
}

export function useWatcher(): { watcher: Signal.subtle.Watcher } | null {
  const state = useMemo(_createWatcher, []);

  return useSyncExternalStore(
    (notifyChanged: () => void) => {
      if (LOG_REACT_SIGNAL_INTEGRATION) {
        console.log(`[WarpDrive] Subscribing to Watcher`);
      }
      state.destroyed = false;
      state.notifyReact = notifyChanged;

      // The watcher won't begin watching until we call `watcher.watch()`
      state.watcher.watch();

      return () => {
        if (LOG_REACT_SIGNAL_INTEGRATION) {
          console.log(`[WarpDrive] Deactivating Watcher Subscription`);
        }
        state.destroyed = true;
        state.notifyReact = null;
      };
    },
    () => state.snapshot
  );
}

export const WatcherContext: Context<{ watcher: Signal.subtle.Watcher } | null> = createContext<{
  watcher: Signal.subtle.Watcher;
} | null>(null);

export function ReactiveContext({ children }: { children: ReactNode }): JSX.Element {
  const watcher = useWatcher();
  /**
   * Unlike other frameworks, React does not have a built-in way to provide
   * a context value other than by rendering an extra component.
   *
   */
  return <WatcherContext value={watcher}>{children}</WatcherContext>;
}
