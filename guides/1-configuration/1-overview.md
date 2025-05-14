---
title: Overview
---

::: tip Boilerplate Sucks 👎🏽
We're re-aligning our packages into a new streamlined installation and setup experience.<br>
Below you'll find the current *boilerplate heavy* setup.

Curious? Read the [RFC](https://rfcs.emberjs.com/id/1075-warp-drive-package-unification/)
:::

# Configuration

***Warp*Drive** is highly configurable. The library is designed as a series of small packages with clear
interface-driven boundaries between each other and brought together by configuration.

Below, we detail the installation for the most common configurations.

<br>
<img class="dark-only" src="../images/configuration-dark.png" alt="interchangable components talk with each other" width="100%">
<img class="light-only" src="../images/configuration-light.png" alt="interchangable components talk with each other" width="100%">

::: warning ⚠️ Caution
WarpDrive packages follow lockstep: dependencies and peer-dependencies between WarpDrive packages are version-locked at the time of publish.

We find this means its best to use exact versions instead of ranges as all WarpDrive packages should be upgraded together at once.

All of the installation commands below pin the version for this reason.
:::

## Installation {#installation}


Install the core packages:

::: info 💡 TIP
WarpDrive uses npm channel tags to simplify installation.
- `@lts` is the latest LTS release
- `@latest` is the latest stable release
- `@beta` is the latest beta release
- `@canary` is the latest canary release

Replace `@latest` in the commands below with the desired channel if needed.
:::

::: code-group

```sh [pnpm]
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

```sh [npm]
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

```sh [yarn]
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

```sh [bun]
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

```sh [pnpm]
pnpm add -E eslint-plugin-warp-drive@latest
```

```sh [npm]
npm add -E eslint-plugin-warp-drive@latest
```

```sh [yarn]
yarn add -E eslint-plugin-warp-drive@latest
```

```sh [bun]
bun add --exact eslint-plugin-warp-drive@latest
```

:::

### 🐹 For Ember.js Only

Install `@warp-drive/ember`

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/ember@latest
```

```sh [npm]
npm add -E @warp-drive/ember@latest
```

```sh [yarn]
yarn add -E @warp-drive/ember@latest
```

```sh [bun]
bun add --exact @warp-drive/ember@latest
```

:::

Optionally, for Ember Inspector support install `@ember-data/debug`

::: code-group

```sh [pnpm]
pnpm add -E @ember-data/debug@latest
```

```sh [npm]
npm add -E @ember-data/debug@latest
```

```sh [yarn]
yarn add-E @ember-data/debug@latest
```

```sh [bun]
bun add --exact @ember-data/debug@latest
```

:::

Optionally, to use the legacy `@ember-data/model` experience (via Model or via SchemaRecord) install the following packages:

::: code-group

```sh [pnpm]
pnpm add -E \
  @ember-data/model@latest \
  @ember-data/legacy-compat@latest;
```

```sh [npm]
npm add -E \
  @ember-data/model@latest \
  @ember-data/legacy-compat@latest;
```

```sh [yarn]
yarn add -E \
  @ember-data/model@latest \
  @ember-data/legacy-compat@latest;
```

```sh [bun]
bun add --exact \
  @ember-data/model@latest \
  @ember-data/legacy-compat@latest;
```

:::


Optionally, to use the legacy **Adapter/Serializer** experience, install the following packages:

::: code-group

```sh [pnpm]
pnpm add -E \
  @ember-data/adapter@latest \
  @ember-data/serializer@latest \
  @ember-data/legacy-compat@latest;
```

```sh [npm]
npm add -E \
  @ember-data/adapter@latest \
  @ember-data/serializer@latest \
  @ember-data/legacy-compat@latest;
```

```sh [yarn]
yarn add -E \
  @ember-data/adapter@latest \
  @ember-data/serializer@latest \
  @ember-data/legacy-compat@latest;
```

```sh [bun]
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

```sh [pnpm]
pnpm add -E @ember-data/rest@latest
```

```sh [npm]
npm add -E @ember-data/rest@latest
```

```sh [yarn]
yarn add -E @ember-data/rest@latest
```

```sh [bun]
bun add --exact @ember-data/rest@latest
```

:::

Install `@ember-data/active-record` for utilities for working with requests that
follow the rails ActiveRecord structure.

::: code-group

```sh [pnpm]
pnpm add -E @ember-data/active-record@latest
```

```sh [npm]
npm add -E @ember-data/active-record@latest
```

```sh [yarn]
yarn add -E @ember-data/active-record@latest
```

```sh [bun]
bun add --exact @ember-data/active-record@latest
```

:::

Install `@warp-drive-experiments` for bleeding edge unstable features
we're prototyping like SharedWorker and PersistedCache.

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive-experiments@latest
```

```sh [npm]
npm add -E @warp-drive-experiments@latest
```

```sh [yarn]
yarn add -E @warp-drive-experiments@latest
```

```sh [bun]
bun add --exact @warp-drive-experiments@latest
```

:::

## What about the `ember-data` package?

The `ember-data` package declares the core and ember.js packages including all legacy packages as its dependencies. It configures and automatically provides a store service configured for the maximal legacy experience, 

This auto-bundled experience sounds useful, however, this approach works poorly with vite, typescript and peer dependency grouping.

If you're curious, the exact list of packages to replicate `ember-data` including all deprecations is:

::: code-group

```sh [pnpm]
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

```sh [npm]
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

```sh [yarn]
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

```sh [bun]
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
