import { Signal } from "signal-polyfill";
import { createContext, type JSX, type ReactNode, useSyncExternalStore, type Context } from "react";

export function useWatcher(): Signal.subtle.Watcher {
  let pending = false;
  let destroyed = false;
  let notifyReact: (() => void) | null = null;

  const clearWatcher = () => {
    watcher.unwatch(...Signal.subtle.introspectSources(watcher));
  };

  const watcher = new Signal.subtle.Watcher(() => {
    if (!pending && !destroyed) {
      pending = true;
      queueMicrotask(() => {
        pending = false;
        if (destroyed) return;

        // any time signals have changed, we notify React that our store has updated
        if (notifyReact) notifyReact();

        // we eliminate the list of watched signals since it will repopulate during
        // the next render cycle.
        clearWatcher();

        // tell the Watcher to start watching for changes again
        // by signaling that notifications have been flushed.
        watcher.watch();
      });
    }
  });

  return useSyncExternalStore(
    (notifyChanged: () => void) => {
      destroyed = false;
      notifyReact = notifyChanged;
      return () => {
        clearWatcher();
        destroyed = true;
        notifyReact = null;
      };
    },
    () => watcher
  );
}

export const WatcherContext: Context<Signal.subtle.Watcher | null> = createContext<Signal.subtle.Watcher | null>(null);

export function ReactiveContext({ children }: { children: ReactNode }): JSX.Element {
  const watcher = useWatcher();
  /**
   * Unlike other frameworks, React does not have a built-in way to provide
   * a context value other than by rendering an extra component.
   *
   */
  return <WatcherContext value={watcher}>{children}</WatcherContext>;
}
