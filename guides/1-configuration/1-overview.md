---
title: Overview
---

# Configuration

***Warp*Drive** is highly configurable. The library is designed as a series of small packages with clear
interface-driven boundaries between each other and brought together by configuration.

Below, we detail the installation for the most common configurations.

<br>
<img class="dark-only" src="../images/configuration-dark.png" alt="interchangable components talk with each other" width="100%">
<img class="light-only" src="../images/configuration-light.png" alt="interchangable components talk with each other" width="100%">


## Installation {#installation}

::: tip Boilerplate Sucks 👎🏽
We're re-aligning our packages into a new streamlined installation and setup experience.<br>
Below you'll find the current *boilerplate heavy* setup.

Curious? Read the [RFC](https://rfcs.emberjs.com/id/1075-warp-drive-package-unification/)
:::

Install the core packages:

::: code-group

```cli [pnpm]
pnpm add -E \
  @warp-drive/core-types@latest \
  @warp-drive/build-config@latest \
  @warp-drive/schema-record@latest \
  @ember-data/store@latest \
  @ember-data/request@latest \
  @ember-data/request-utils@latest \
  @ember-data/graph@latest \
  @ember-data/json-api@latest;
```

```cli [npm]
npm add -E \
  @warp-drive/core-types@latest \
  @warp-drive/build-config@latest \
  @warp-drive/schema-record@latest \
  @ember-data/store@latest \
  @ember-data/request@latest \
  @ember-data/request-utils@latest \
  @ember-data/graph@latest \
  @ember-data/json-api@latest;
```

```cli [yarn]
yarn add -E \
  @warp-drive/core-types@latest \
  @warp-drive/build-config@latest \
  @warp-drive/schema-record@latest \
  @ember-data/store@latest \
  @ember-data/request@latest \
  @ember-data/request-utils@latest \
  @ember-data/graph@latest \
  @ember-data/json-api@latest;
```

```cli [bun]
bun add --exact \
  @warp-drive/core-types@latest \
  @warp-drive/build-config@latest \
  @warp-drive/schema-record@latest \
  @ember-data/store@latest \
  @ember-data/request@latest \
  @ember-data/request-utils@latest \
  @ember-data/graph@latest \
  @ember-data/json-api@latest;
```

:::

Optionally, install the ESLint plugin `eslint-plugin-warp-drive`

::: code-group

```cli [pnpm]
pnpm add -E eslint-plugin-warp-drive@latest
```

```cli [npm]
npm add -E eslint-plugin-warp-drive@latest
```

```cli [yarn]
yarn add -E eslint-plugin-warp-drive@latest
```

```cli [bun]
bun add --exact eslint-plugin-warp-drive@latest
```

:::

### 🐹 For Ember.js Only

Install `@warp-drive/ember`

::: code-group

```cli [pnpm]
pnpm add -E @warp-drive/ember@latest
```

```cli [npm]
npm add -E @warp-drive/ember@latest
```

```cli [yarn]
yarn add -E @warp-drive/ember@latest
```

```cli [bun]
bun add --exact @warp-drive/ember@latest
```

:::

Optionally, for Ember Inspector support install `@ember-data/debug`

::: code-group

```cli [pnpm]
pnpm add -E @ember-data/debug@latest
```

```cli [npm]
npm add -E @ember-data/debug@latest
```

```cli [yarn]
yarn add-E @ember-data/debug@latest
```

```cli [bun]
bun add --exact @ember-data/debug@latest
```

:::

Optionally, to use the legacy `@ember-data/model` experience (via Model or via SchemaRecord) install the following packages:

::: code-group

```cli [pnpm]
pnpm add -E \
  @ember-data/model@latest \
  @ember-data/legacy-compat@latest;
```

```cli [npm]
npm add -E \
  @ember-data/model@latest \
  @ember-data/legacy-compat@latest;
```

```cli [yarn]
yarn add -E \
  @ember-data/model@latest \
  @ember-data/legacy-compat@latest;
```

```cli [bun]
bun add --exact \
  @ember-data/model@latest \
  @ember-data/legacy-compat@latest;
```

:::


Optionally, to use the legacy **Adapter/Serializer** experience, install the following packages:

::: code-group

```cli [pnpm]
pnpm add -E \
  @ember-data/adapter@latest \
  @ember-data/serializer@latest \
  @ember-data/legacy-compat@latest;
```

```cli [npm]
npm add -E \
  @ember-data/adapter@latest \
  @ember-data/serializer@latest \
  @ember-data/legacy-compat@latest;
```

```cli [yarn]
yarn add -E \
  @ember-data/adapter@latest \
  @ember-data/serializer@latest \
  @ember-data/legacy-compat@latest;
```

```cli [bun]
bun add --exact \
  @ember-data/adapter@latest \
  @ember-data/serializer@latest \
  @ember-data/legacy-compat@latest;
```

:::

### Other Packages

Install `@ember-data/rest` for utilities for working with requests that
follow common REST API patterns.

::: code-group

```cli [pnpm]
pnpm add -E @ember-data/rest@latest
```

```cli [npm]
npm add -E @ember-data/rest@latest
```

```cli [yarn]
yarn add -E @ember-data/rest@latest
```

```cli [bun]
bun add --exact @ember-data/rest@latest
```

:::

Install `@ember-data/active-record` for utilities for working with requests that
follow the rails ActiveRecord structure.

::: code-group

```cli [pnpm]
pnpm add -E @ember-data/active-record@latest
```

```cli [npm]
npm add -E @ember-data/active-record@latest
```

```cli [yarn]
yarn add -E @ember-data/active-record@latest
```

```cli [bun]
bun add --exact @ember-data/active-record@latest
```

:::

Install `@warp-drive-experiments` for bleeding edge unstable features
we're prototyping like SharedWorker and PersistedCache.

::: code-group

```cli [pnpm]
pnpm add -E @warp-drive-experiments@latest
```

```cli [npm]
npm add -E @warp-drive-experiments@latest
```

```cli [yarn]
yarn add -E @warp-drive-experiments@latest
```

```cli [bun]
bun add --exact @warp-drive-experiments@latest
```

:::

## What about the `ember-data` package?

The `ember-data` package declares the core and ember.js packages including all legacy packages as its dependencies. It configures and automatically provides a store service configured for the maximal legacy experience, 

This auto-bundled experience sounds useful, however, this approach works poorly with vite, typescript and peer dependency grouping.

If you're curious, the exact list of packages to replicate `ember-data` including all deprecations is:

::: code-group

```cli [pnpm]
pnpm add -E \
  @warp-drive/core-types@latest \
  @warp-drive/build-config@latest \
  @ember-data/store@latest \
  @ember-data/request@latest \
  @ember-data/request-utils@latest \
  @ember-data/graph@latest \
  @ember-data/json-api@latest \
  @ember-data/adapter \
  @ember-data/debug \
  @ember-data/legacy-compat \
  @ember-data/model \
  @ember-data/serializer \
  @embroider/macros \
  @ember-data/tracking \
  @warp-drive/ember;
```

```cli [npm]
npm add -E \
  @warp-drive/core-types@latest \
  @warp-drive/build-config@latest \
  @ember-data/store@latest \
  @ember-data/request@latest \
  @ember-data/request-utils@latest \
  @ember-data/graph@latest \
  @ember-data/json-api@latest \
  @ember-data/adapter \
  @ember-data/debug \
  @ember-data/legacy-compat \
  @ember-data/model \
  @ember-data/serializer \
  @embroider/macros \
  @ember-data/tracking \
  @warp-drive/ember;
```

```cli [yarn]
yarn add -E \
  @warp-drive/core-types@latest \
  @warp-drive/build-config@latest \
  @ember-data/store@latest \
  @ember-data/request@latest \
  @ember-data/request-utils@latest \
  @ember-data/graph@latest \
  @ember-data/json-api@latest \
  @ember-data/adapter \
  @ember-data/debug \
  @ember-data/legacy-compat \
  @ember-data/model \
  @ember-data/serializer \
  @embroider/macros \
  @ember-data/tracking \
  @warp-drive/ember;
```

```cli [bun]
bun add --exact \
  @warp-drive/core-types@latest \
  @warp-drive/build-config@latest \
  @ember-data/store@latest \
  @ember-data/request@latest \
  @ember-data/request-utils@latest \
  @ember-data/graph@latest \
  @ember-data/json-api@latest \
  @ember-data/adapter \
  @ember-data/debug \
  @ember-data/legacy-compat \
  @ember-data/model \
  @ember-data/serializer \
  @embroider/macros \
  @ember-data/tracking \
  @warp-drive/ember;
```

:::
