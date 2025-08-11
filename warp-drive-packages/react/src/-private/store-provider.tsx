import { Store } from "@warp-drive/core";
import { assert } from "@warp-drive/core/build-config/macros";
import { createContext, JSX, ReactNode, use, useContext, useMemo } from "react";

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = use(StoreContext);
  assert(
    "No Store provided via context. Please ensure you are using <StoreProvider> to provide a Store instance.",
    store
  );
  return store;
}

export function StoreProvider($props: { Store: Store; children: ReactNode }): JSX.Element {
  const store = useMemo(() => new Store(), [$props.Store]);

  return <StoreContext value={store}>{$props.children}</StoreContext>;
}
