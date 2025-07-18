---
title: Overview
---

::: warning 💡 Looking for the [Legacy Package Guide](./4-legacy-package-setup/1-overview)?
:::

# Configuration

***Warp*Drive** is designed as a series of small packages and primitives with clear interface-driven boundaries between each other and brought together by configuration.

<br>
<img class="dark-only" src="../images/configuration-dark.png" alt="interchangable components talk with each other" width="100%">
<img class="light-only" src="../images/configuration-light.png" alt="interchangable components talk with each other" width="100%">

## Installation {#installation}

Typically you will install `@warp-drive/core`, a cache, and a reactivity system such as [emberjs](#ember).

We recommend using `@warp-drive/json-api` as your cache even if
your API is not [{JSON:API}](https://jsonapi.org).

:::tabs key:install

== latest

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

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/core@lts @warp-drive/json-api@lts
```

```sh [npm]
npm add -E @warp-drive/core@lts @warp-drive/json-api@lts
```

```sh [yarn]
yarn add -E @warp-drive/core@lts @warp-drive/json-api@lts
```

```sh [bun]
bun add --exact @warp-drive/core@lts @warp-drive/json-api@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/core@beta @warp-drive/json-api@beta
```

```sh [npm]
npm add -E @warp-drive/core@beta @warp-drive/json-api@beta
```

```sh [yarn]
yarn add -E @warp-drive/core@beta @warp-drive/json-api@beta
```

```sh [bun]
bun add --exact @warp-drive/core@beta @warp-drive/json-api@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/core@canary @warp-drive/json-api@canary
```

```sh [npm]
npm add -E @warp-drive/core@canary @warp-drive/json-api@canary
```

```sh [yarn]
yarn add -E @warp-drive/core@canary @warp-drive/json-api@canary
```

```sh [bun]
bun add --exact @warp-drive/core@canary @warp-drive/json-api@canary
```

:::

::: tip 💡 *Warp***Drive** simplifies distribution using npm channel tags
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

:::tabs key:install

== latest

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

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@lts
```

```sh [npm]
npm add -E @warp-drive/utilities@lts
```

```sh [yarn]
yarn add -E @warp-drive/utilities@lts
```

```sh [bun]
bun add --exact @warp-drive/utilities@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@beta
```

```sh [npm]
npm add -E @warp-drive/utilities@beta
```

```sh [yarn]
yarn add -E @warp-drive/utilities@beta
```

```sh [bun]
bun add --exact @warp-drive/utilities@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@canary
```

```sh [npm]
npm add -E @warp-drive/utilities@canary
```

```sh [yarn]
yarn add -E @warp-drive/utilities@canary
```

```sh [bun]
bun add --exact @warp-drive/utilities@canary
```

:::

Install `@warp-drive/experiments` for bleeding edge unstable features
we're prototyping like SharedWorker and PersistedCache.

:::tabs key:install

== latest

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

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/experiments@lts
```

```sh [npm]
npm add -E @warp-drive/experiments@lts
```

```sh [yarn]
yarn add -E @warp-drive/experiments@lts
```

```sh [bun]
bun add --exact @warp-drive/experiments@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/experiments@beta
```

```sh [npm]
npm add -E @warp-drive/experiments@beta
```

```sh [yarn]
yarn add -E @warp-drive/experiments@beta
```

```sh [bun]
bun add --exact @warp-drive/experiments@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/experiments@canary
```

```sh [npm]
npm add -E @warp-drive/experiments@canary
```

```sh [yarn]
yarn add -E @warp-drive/experiments@canary
```

```sh [bun]
bun add --exact @warp-drive/experiments@canary
```

:::

<br>


## 🐹 Ember.js {#ember}

Install `@warp-drive/ember`

:::tabs key:install

== latest

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

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/ember@lts
```

```sh [npm]
npm add -E @warp-drive/ember@lts
```

```sh [yarn]
yarn add -E @warp-drive/ember@lts
```

```sh [bun]
bun add --exact @warp-drive/ember@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/ember@beta
```

```sh [npm]
npm add -E @warp-drive/ember@beta
```

```sh [yarn]
yarn add -E @warp-drive/ember@beta
```

```sh [bun]
bun add --exact @warp-drive/ember@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/ember@canary
```

```sh [npm]
npm add -E @warp-drive/ember@canary
```

```sh [yarn]
yarn add -E @warp-drive/ember@canary
```

```sh [bun]
bun add --exact @warp-drive/ember@canary
```

:::

Optionally, for Ember Inspector support install `@ember-data/debug`

:::tabs key:install

== latest

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

== lts

::: code-group

```sh [pnpm]
pnpm add -E @ember-data/debug@lts
```

```sh [npm]
npm add -E @ember-data/debug@lts
```

```sh [yarn]
yarn add-E @ember-data/debug@lts
```

```sh [bun]
bun add --exact @ember-data/debug@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @ember-data/debug@beta
```

```sh [npm]
npm add -E @ember-data/debug@beta
```

```sh [yarn]
yarn add-E @ember-data/debug@beta
```

```sh [bun]
bun add --exact @ember-data/debug@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @ember-data/debug@canary
```

```sh [npm]
npm add -E @ember-data/debug@canary
```

```sh [yarn]
yarn add-E @ember-data/debug@canary
```

```sh [bun]
bun add --exact @ember-data/debug@canary
```

:::

Optionally, to use the legacy concepts such as Models, Adapters, or Serializers install the following packages:

::: tip
Also Install These Packages To Use `LegacyMode` Schemas
:::

:::tabs key:install

== latest

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

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@lts @warp-drive/legacy@lts
```

```sh [npm]
npm add -E @warp-drive/utilities@lts @warp-drive/legacy@lts
```

```sh [yarn]
yarn add -E @warp-drive/utilities@lts @warp-drive/legacy@lts
```

```sh [bun]
bun add --exact @warp-drive/utilities@lts @warp-drive/legacy@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@beta @warp-drive/legacy@beta
```

```sh [npm]
npm add -E @warp-drive/utilities@beta @warp-drive/legacy@beta
```

```sh [yarn]
yarn add -E @warp-drive/utilities@beta @warp-drive/legacy@beta
```

```sh [bun]
bun add --exact @warp-drive/utilities@beta @warp-drive/legacy@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@canary @warp-drive/legacy@canary
```

```sh [npm]
npm add -E @warp-drive/utilities@canary @warp-drive/legacy@canary
```

```sh [yarn]
yarn add -E @warp-drive/utilities@canary @warp-drive/legacy@canary
```

```sh [bun]
bun add --exact @warp-drive/utilities@canary @warp-drive/legacy@canary
```

:::
