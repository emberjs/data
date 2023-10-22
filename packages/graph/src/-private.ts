export { graphFor, peekGraph } from './-private/index';
export { isBelongsTo } from './-private/-utils';

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

  @module @ember-data/graph
  @main @ember-data/graph
*/
