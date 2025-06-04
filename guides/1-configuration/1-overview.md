---
title: Overview
---

::: tip EmberData/WarpDrive Packages Have Been [Simplified](https://rfcs.emberjs.com/id/1075-warp-drive-package-unification/)!

Looking for the [Old Package Setup Guide?](./4-old-package-setup/1-overview.md)
:::

# Configuration

***Warp*Drive** is highly configurable. The library is designed as a series of small packages and primitives with clear interface-driven boundaries between each other and brought together
by configuration.

<br>
<img class="dark-only" src="../images/configuration-dark.png" alt="interchangable components talk with each other" width="100%">
<img class="light-only" src="../images/configuration-light.png" alt="interchangable components talk with each other" width="100%">

## Installation {#installation}

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/core@latest @warp-drive/json-api@latest
```

```sh [npm]
npm add -E @warp-drive/core@latest @warp-drive/json-api@latest
```

```sh [yarn]
yarn add -E @warp-drive/core@latest @warp-drive/json-api@latest
```

```sh [bun]
bun add --exact @warp-drive/core@latest @warp-drive/json-api@latest
```

:::

::: info 💡 TIP
*Warp***Drive** uses npm channel tags to simplify installation. Replace `@latest` in any installation command
in this guide with a different channel as desired. Available channels include:
- `@lts` | `@latest` | `@beta` | `@canary`

:::

## Lockstep Versioning

*Warp***Drive** packages follow a lockstep versioning approach: all dependencies and peer-dependencies between the project's own packages are version-locked at the time of publish.

For instance, `@warp-drive/utilities@5.6.0` has a peer-dependency on `@warp-drive/core@5.6.0`. If any other
version were present (even a differing patch version such as `5.6.1`) it would create a conflict.

::: warning ⚠️ Caution
We find this means its best to use exact versions instead of ranges as all WarpDrive packages should be upgraded together at once.
:::

All of the installation commands listed in this guide pin the version for this reason.

## Other Packages

Install `@warp-drive/utilities` for commonly needed request builder, handler and string utils.

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@latest
```

```sh [npm]
npm add -E @warp-drive/utilities@latest
```

```sh [yarn]
yarn add -E @warp-drive/utilities@latest
```

```sh [bun]
bun add --exact @warp-drive/utilities@latest
```

:::

Install `@warp-drive/experiments` for bleeding edge unstable features
we're prototyping like SharedWorker and PersistedCache.

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/experiments@latest
```

```sh [npm]
npm add -E @warp-drive/experiments@latest
```

```sh [yarn]
yarn add -E @warp-drive/experiments@latest
```

```sh [bun]
bun add --exact @warp-drive/experiments@latest
```

:::

<br>

## 🐹 For Ember.js Only

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

Optionally, to use the legacy concepts such as Models, Adapters, or Serializers install the following packages:

::: tip
Also Install These Packages To Use `LegacyMode` Schemas
:::

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@latest @warp-drive/legacy@latest
```

```sh [npm]
npm add -E @warp-drive/utilities@latest @warp-drive/legacy@latest
```

```sh [yarn]
yarn add -E @warp-drive/utilities@latest @warp-drive/legacy@latest
```

```sh [bun]
bun add --exact @warp-drive/utilities@latest @warp-drive/legacy@latest
```

:::
