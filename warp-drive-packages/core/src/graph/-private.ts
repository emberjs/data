/**
 * <p align="center">
  <img
    class="project-logo"
    src="https://raw.githubusercontent.com/emberjs/data/4612c9354e4c54d53327ec2cf21955075ce21294/ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData"
    width="240px"
    title="EmberData"
    />
</p>

<p align="center">Provides a performance tuned normalized graph for intelligently managing relationships between resources based on identity</p>

While this Graph is abstract, it currently is a private implementation required as a peer-dependency by the [JSON:API Cache Implementation](https://github.com/emberjs/data/tree/main/packages/json-api).

We intend to make this Graph public API after some additional iteration during the 5.x timeframe, until then all APIs should be considered experimental and unstable, not fit for direct application or 3rd party library usage.

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/graph
```

  @module
*/
import { DEBUG } from '@warp-drive/build-config/env';

import type { Store } from '../index.ts';
import type { CacheCapabilitiesManager } from '../types.ts';
import { getStore } from './-private/-utils.ts';
import { Graph, Graphs } from './-private/graph.ts';

export { isBelongsTo } from './-private/-utils.ts';
export type { CollectionEdge } from './-private/edges/collection.ts';
export type { ResourceEdge } from './-private/edges/resource.ts';
export type { ImplicitEdge } from './-private/edges/implicit.ts';
export type { GraphEdge } from './-private/graph.ts';
export type { UpgradedMeta } from './-private/-edge-definition.ts';
export type { Graph };

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
