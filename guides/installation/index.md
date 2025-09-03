---
title: Installation
categoryOrder: 0
order: 0
---

::: warning 💡 Looking for the [Legacy Package Guide](./4-legacy-package-setup/1-overview)?
:::

# Installation

::: tip 💡 *Warp***Drive** simplifies distribution using npm channel tags
- `@lts` | `@latest` | `@beta` | `@canary`
:::

To use ***Warp*Drive**, you will install `@warp-drive/core`, a cache[^1], and a reactivity system such as [emberjs](#ember), [TC39 Signals](#tc39-signals) or even [react](#react).

[^1]: We recommend using `@warp-drive/json-api` as your cache even if your API is not [{json:api}](https://jsonapi.org).

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

Complete your installation by installing and configuring the reactive framework of your choosing.

### Available Frameworks

- [ember](#ember)
- [react](#react)
- [svelte](#svelte) (🚧 Coming Soon)
- [vue](#vue) (🚧 Coming Soon)
- [TC39 Signals](#tc39-signals)

Don't see your framework listed yet? Reactive frameworks can typically be implemented in 15-30 lines of JS (before you add docs and types of course ;)). We're happy to add support for any framework that supports fine-grained signals based reactivity.

## Lockstep Versioning

::: warning ⚠️ Caution
We find this means its best to use exact versions instead of ranges as all WarpDrive packages should be upgraded together at once.
:::

*Warp***Drive** packages follow a lockstep versioning approach: all dependencies and peer-dependencies between the project's own packages are version-locked at the time of publish.

For instance, `@warp-drive/utilities@5.6.0` has a peer-dependency on `@warp-drive/core@5.6.0`. If any other
version were present (even a differing patch version such as `5.6.1`) it would create a conflict. All of the installation commands listed in this guide pin the version for this reason.


## Other Packages

*Warp***Drive** offers additional packages for features that don't quite meet the bar for being included
in core, or have been deprecated and removed from the core experience.

- `@warp-drive/utilities` provides commonly needed request builder, handler and string utils.
- `@warp-drive/experiments` provides bleeding edge unstable features we're prototyping like SharedWorker and PersistedCache
- `@warp-drive/legacy` provides extended life-support for features that have been removed from core.

:::tabs key:install

== latest

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@latest
pnpm add -E @warp-drive/legacy@latest
pnpm add -E @warp-drive/experiments@latest
```

```sh [npm]
npm add -E @warp-drive/utilities@latest
npm add -E @warp-drive/legacy@latest
npm add -E @warp-drive/experiments@latest
```

```sh [yarn]
yarn add -E @warp-drive/utilities@latest
yarn add -E @warp-drive/legacy@latest
yarn add -E @warp-drive/experiments@latest
```

```sh [bun]
bun add --exact @warp-drive/utilities@latest
bun add --exact @warp-drive/legacy@latest
bun add --exact @warp-drive/experiments@latest
```

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@lts
pnpm add -E @warp-drive/legacy@lts
pnpm add -E @warp-drive/experiments@lts
```

```sh [npm]
npm add -E @warp-drive/utilities@lts
npm add -E @warp-drive/legacy@lts
npm add -E @warp-drive/experiments@lts
```

```sh [yarn]
yarn add -E @warp-drive/utilities@lts
yarn add -E @warp-drive/legacy@lts
yarn add -E @warp-drive/experiments@lts
```

```sh [bun]
bun add --exact @warp-drive/utilities@lts
bun add --exact @warp-drive/legacy@lts
bun add --exact @warp-drive/experiments@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@beta
pnpm add -E @warp-drive/legacy@beta
pnpm add -E @warp-drive/experiments@beta
```

```sh [npm]
npm add -E @warp-drive/utilities@beta
npm add -E @warp-drive/legacy@beta
npm add -E @warp-drive/experiments@beta
```

```sh [yarn]
yarn add -E @warp-drive/utilities@beta
yarn add -E @warp-drive/legacy@beta
yarn add -E @warp-drive/experiments@beta
```

```sh [bun]
bun add --exact @warp-drive/utilities@beta
bun add --exact @warp-drive/legacy@beta
bun add --exact @warp-drive/experiments@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/utilities@canary
pnpm add -E @warp-drive/legacy@canary
pnpm add -E @warp-drive/experiments@canary
```

```sh [npm]
npm add -E @warp-drive/utilities@canary
npm add -E @warp-drive/legacy@canary
npm add -E @warp-drive/experiments@canary
```

```sh [yarn]
yarn add -E @warp-drive/utilities@canary
yarn add -E @warp-drive/legacy@canary
yarn add -E @warp-drive/experiments@canary
```

```sh [bun]
bun add --exact @warp-drive/utilities@canary
bun add --exact @warp-drive/legacy@canary
bun add --exact @warp-drive/experiments@canary
```

:::

## 🐹 Ember.js {#ember}

Install `@warp-drive/ember` and (optionally) install support for the 
EmberInspector data pane by installing `@ember-data/debug`.

:::tabs key:install

== latest

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/ember@latest
pnpm add -E @ember-data/debug@latest
```

```sh [npm]
npm add -E @warp-drive/ember@latest
npm add -E @ember-data/debug@latest
```

```sh [yarn]
yarn add -E @warp-drive/ember@latest
yarn add -E @ember-data/debug@latest
```

```sh [bun]
bun add --exact @warp-drive/ember@latest
bun add --exact @ember-data/debug@latest
```

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/ember@lts
pnpm add -E @ember-data/debug@lts
```

```sh [npm]
npm add -E @warp-drive/ember@lts
npm add -E @ember-data/debug@lts
```

```sh [yarn]
yarn add -E @warp-drive/ember@lts
yarn add -E @ember-data/debug@lts
```

```sh [bun]
bun add --exact @warp-drive/ember@lts
bun add --exact @ember-data/debug@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/ember@beta
pnpm add -E @ember-data/debug@beta
```

```sh [npm]
npm add -E @warp-drive/ember@beta
npm add -E @ember-data/debug@beta
```

```sh [yarn]
yarn add -E @warp-drive/ember@beta
yarn add -E @ember-data/debug@beta
```

```sh [bun]
bun add --exact @warp-drive/ember@beta
bun add --exact @ember-data/debug@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/ember@canary
pnpm add -E @ember-data/debug@canary
```

```sh [npm]
npm add -E @warp-drive/ember@canary
npm add -E @ember-data/debug@canary
```

```sh [yarn]
yarn add -E @warp-drive/ember@canary
yarn add -E @ember-data/debug@canary
```

```sh [bun]
bun add --exact @warp-drive/ember@canary
bun add --exact @ember-data/debug@canary
```

:::

Configure your app to use Ember's signals implementation by adding the following
import to the top of your application and test setup.

::: code-group

```ts [app/app.ts]
import '@warp-drive/ember/install';
```

```ts [tests/test-helper.ts]
import '@warp-drive/ember/install';
```

:::

Addons that make use of *Warp***Drive** should only do the above installation in their tests (including test apps)
but not in any published library code.


## React

:::tabs key:install

== latest

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/react@latest
```

```sh [npm]
npm add -E @warp-drive/react@latest
```

```sh [yarn]
yarn add -E @warp-drive/react@latest
```

```sh [bun]
bun add --exact @warp-drive/react@latest
```

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/react@lts
```

```sh [npm]
npm add -E @warp-drive/react@lts
```

```sh [yarn]
yarn add -E @warp-drive/react@lts
```

```sh [bun]
bun add --exact @warp-drive/react@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/react@beta
```

```sh [npm]
npm add -E @warp-drive/react@beta
```

```sh [yarn]
yarn add -E @warp-drive/react@beta
```

```sh [bun]
bun add --exact @warp-drive/react@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/react@canary
```

```sh [npm]
npm add -E @warp-drive/react@canary
```

```sh [yarn]
yarn add -E @warp-drive/react@canary
```

```sh [bun]
bun add --exact @warp-drive/react@canary
```

:::

Even though React does not natively understand signals, *Warp***Drive** provides a solution that
enables React to understand when reactive data used by a component has changed enabling it
to properly rerender. We'll cover this more in the [@warp-drive/react documentation](/api/@warp-drive/react)

Configure your app to use our React compatible signals implementation by adding the following
import to the top of your application. If you have tests which do not invoke your app, your
test setup should also have this import.

::: code-group

```ts [src/app.ts]
import '@warp-drive/react/install';
```

```ts [src/setupTests.ts]
import '@warp-drive/react/install';
```

:::

Only apps need to do the installation above, libraries providing React components that make use of *Warp***Drive**
should only do the above installation in their tests but not in any published library code.


## Svelte (🚧 Coming Soon) {#svelte}

:::tabs key:install

== latest

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/svelte@latest
```

```sh [npm]
npm add -E @warp-drive/svelte@latest
```

```sh [yarn]
yarn add -E @warp-drive/svelte@latest
```

```sh [bun]
bun add --exact @warp-drive/svelte@latest
```

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/svelte@lts
```

```sh [npm]
npm add -E @warp-drive/svelte@lts
```

```sh [yarn]
yarn add -E @warp-drive/svelte@lts
```

```sh [bun]
bun add --exact @warp-drive/svelte@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/svelte@beta
```

```sh [npm]
npm add -E @warp-drive/svelte@beta
```

```sh [yarn]
yarn add -E @warp-drive/svelte@beta
```

```sh [bun]
bun add --exact @warp-drive/svelte@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/svelte@canary
```

```sh [npm]
npm add -E @warp-drive/svelte@canary
```

```sh [yarn]
yarn add -E @warp-drive/svelte@canary
```

```sh [bun]
bun add --exact @warp-drive/svelte@canary
```

:::

Configure your app to use Svelte's signals (Runes) for reactivity by adding the following
import to the top of your application. If you have tests which do not invoke your app, your
test setup should also have this import.

::: code-group

```ts [src/app.ts]
import '@warp-drive/svelte/install';
```

```ts [src/setupTests.ts]
import '@warp-drive/svelte/install';
```

:::

Only apps need to do the installation above, libraries providing Svelte components that make use of *Warp***Drive**
should only do the above installation in their tests but not in any published library code.



## Vue (🚧 Coming Soon) {#vue}

:::tabs key:install

== latest

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/vue@latest
```

```sh [npm]
npm add -E @warp-drive/vue@latest
```

```sh [yarn]
yarn add -E @warp-drive/vue@latest
```

```sh [bun]
bun add --exact @warp-drive/vue@latest
```

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/vue@lts
```

```sh [npm]
npm add -E @warp-drive/vue@lts
```

```sh [yarn]
yarn add -E @warp-drive/vue@lts
```

```sh [bun]
bun add --exact @warp-drive/vue@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/vue@beta
```

```sh [npm]
npm add -E @warp-drive/vue@beta
```

```sh [yarn]
yarn add -E @warp-drive/vue@beta
```

```sh [bun]
bun add --exact @warp-drive/vue@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/vue@canary
```

```sh [npm]
npm add -E @warp-drive/vue@canary
```

```sh [yarn]
yarn add -E @warp-drive/vue@canary
```

```sh [bun]
bun add --exact @warp-drive/vue@canary
```

:::

Configure your app to use Vue's signals for reactivity by adding the following
import to the top of your application. If you have tests which do not invoke your app, your
test setup should also have this import.

::: code-group

```ts [src/app.ts]
import '@warp-drive/vue/install';
```

```ts [src/setupTests.ts]
import '@warp-drive/vue/install';
```

:::

Only apps need to do the installation above, libraries providing Vue components that make use of *Warp***Drive**
should only do the above installation in their tests but not in any published library code.


## TC39-signals {#tc39-signals}

:::tabs key:install

== latest

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/tc39-proposal-signals@latest
```

```sh [npm]
npm add -E @warp-drive/tc39-proposal-signals@latest
```

```sh [yarn]
yarn add -E @warp-drive/tc39-proposal-signals@latest
```

```sh [bun]
bun add --exact @warp-drive/tc39-proposal-signals@latest
```

== lts

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/tc39-proposal-signals@lts
```

```sh [npm]
npm add -E @warp-drive/tc39-proposal-signals@lts
```

```sh [yarn]
yarn add -E @warp-drive/tc39-proposal-signals@lts
```

```sh [bun]
bun add --exact @warp-drive/tc39-proposal-signals@lts
```

== beta

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/tc39-proposal-signals@beta
```

```sh [npm]
npm add -E @warp-drive/tc39-proposal-signals@beta
```

```sh [yarn]
yarn add -E @warp-drive/tc39-proposal-signals@beta
```

```sh [bun]
bun add --exact @warp-drive/tc39-proposal-signals@beta
```

== canary

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/tc39-proposal-signals@canary
```

```sh [npm]
npm add -E @warp-drive/tc39-proposal-signals@canary
```

```sh [yarn]
yarn add -E @warp-drive/tc39-proposal-signals@canary
```

```sh [bun]
bun add --exact @warp-drive/tc39-proposal-signals@canary
```

:::

Configure your app to use TC39 Signals for reactivity by adding the following
import to the top of your application. If you have tests which do not invoke your app, your
test setup should also have this import.

::: code-group

```ts [src/app.ts]
import '@warp-drive/tc39-proposal-signals/install';
```

```ts [src/setupTests.ts]
import '@warp-drive/tc39-proposal-signals/install';
```

:::

Only apps need to do the installation above, libraries providing code that makes use of *Warp***Drive**
should only do the above installation in their tests but not in any published library code.
