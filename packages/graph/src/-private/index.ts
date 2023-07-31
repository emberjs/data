import { DEBUG } from '@ember-data/env';
import type Store from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/types/q/cache-store-wrapper';

import { getStore } from './-utils';
import { Graph, Graphs } from './graph';

function isStore(maybeStore: unknown): maybeStore is Store {
  return (maybeStore as Store)._instanceCache !== undefined;
}

function getWrapper(store: CacheCapabilitiesManager | Store): CacheCapabilitiesManager {
  return isStore(store) ? store._instanceCache._storeWrapper : store;
}

export function peekGraph(store: CacheCapabilitiesManager | Store): Graph | undefined {
  return Graphs.get(getWrapper(store));
}
export type peekGraph = typeof peekGraph;

export function graphFor(store: CacheCapabilitiesManager | Store): Graph {
  const wrapper = getWrapper(store);
  let graph = Graphs.get(wrapper);

  if (!graph) {
    graph = new Graph(wrapper);
    Graphs.set(wrapper, graph);
    getStore(wrapper)._graph = graph;

    if (DEBUG) {
      if (getStore(wrapper).isDestroying) {
        throw new Error(`Memory Leak Detected During Teardown`);
      }
    }
  }
  return graph;
}
