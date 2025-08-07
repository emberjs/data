import { Signal } from "signal-polyfill";
import { createContext, type JSX, type ReactNode, useSyncExternalStore, type Context } from "react";

export function useWatcher(): { watcher: Signal.subtle.Watcher } | null {
  let pending = false;
  let destroyed = false;
  let notifyReact: (() => void) | null = null;

  // the extra wrapper returned here ensures that the context value for the watcher
  // changes causing a re-render when the watcher is updated.
  let snapshot: { watcher: Signal.subtle.Watcher } | null = null;

  const clearWatcher = () => {
    watcher.unwatch(...Signal.subtle.introspectSources(watcher));
  };

  const watcher = new Signal.subtle.Watcher(() => {
    if (!pending && !destroyed) {
      pending = true;
      queueMicrotask(() => {
        pending = false;
        if (destroyed) {
          snapshot = null;
          clearWatcher();
          return;
        }

        // any time signals have changed, we notify React that our store has updated
        snapshot = { watcher };
        if (notifyReact) notifyReact();

        // tell the Watcher to start watching for changes again
        // by signaling that notifications have been flushed.
        watcher.watch();
      });
    } else if (destroyed) {
      // if we are destroyed, we clear the watcher signals
      // so that it does not continue to watch for changes.
      clearWatcher();
    }
  });

  // The watcher won't begin watching until we call `watcher.watch()`
  watcher.watch();
  snapshot = { watcher };

  return useSyncExternalStore(
    (notifyChanged: () => void) => {
      destroyed = false;
      notifyReact = notifyChanged;

      // The watcher won't begin watching until we call `watcher.watch()`
      watcher.watch();

      return () => {
        destroyed = true;
        notifyReact = null;
      };
    },
    () => snapshot
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
