<p align="center">
  <img
    class="project-logo"
    src="./ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData"
    width="240px"
    title="EmberData"
    />
  <img
    class="project-logo"
    src="./ember-data-logo-dark.svg#gh-dark-mode-only"
    alt="EmberData"
    width="240px"
    title="EmberData"
    />
</p>

<p align="center">The lightweight reactive data library for JavaScript applications</p>

[![Build Status](https://github.com/emberjs/data/workflows/Main/badge.svg)](https://github.com/emberjs/data/actions?workflow=Main)
[![Discord Community Server](https://img.shields.io/discord/480462759797063690.svg?logo=discord)](https://discord.gg/zT3asNS)

---

Wrangle your application's data management with scalable patterns for developer productivity.

- ⚡️ Committed to Best-In-Class Performance
- 🌲 Focused on being as svelte as possible
- 🚀 SSR Ready
- 🔜 Typescript Support
- 🐹 Built with ♥️ by [Ember](https://emberjs.com)
- ⚛️ Supports any API: `GraphQL` `JSON:API` `REST` `tRPC` ...bespoke or a mix

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/ember-data/canary?label=%40canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/ember-data/beta?label=%40beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/latest?label=%40latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/ember-data/lts?label=%40lts&color=0096FF)
- ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/ember-data/lts-4-12?label=%40lts-4-12&color=bbbbbb)

### 📖 On This Page

- [Overview](#overview)
  - [Architecture](#-architecture)
  - [Basic Installation](#basic-installation)
  - [Advanced Installation](#advanced-installation)
- [Configuration](#configuration)
  - [Deprecation Stripping](#deprecation-stripping)
  - [randomUUID polyfill](#randomuuid-polyfill)
  - [Removing inspector support in production](#removing-inspector-support-in-production)
  - [Debugging](#debugging)
- [Ember Compatibility](#compatibility)
- [The Big List of Versions](#the-big-list-of-versions)
- [Contributing](#contributing)

# Overview

*Ember***Data** is a lightweight reactive data library for JavaScript applications that provides composable primitives for ordering query/mutation/peek flows, managing network and cache, and reducing data for presentation.

- [API Documentation](https://api.emberjs.com/ember-data/release)
- [Community & Help](https://emberjs.com/community)
- [Contributing Guide](./CONTRIBUTING.md)
- [Usage Guide](https://guides.emberjs.com/release/models/)
- [RFCs](https://github.com/emberjs/rfcs/labels/T-ember-data)
- [Team](https://emberjs.com/team)
- [Blog](https://emberjs.com/blog)

## 🪜 Architecture

*Ember***Data** is both _resource_ centric and _document_ centric in its approach to caching, requesting and presenting data. Your application's configuration and usage drives which is important and when.

The `Store` is a **coordinator**. When using a `Store` you configure what cache to use, how cache data should be presented to the UI, and where it should look for requested data when it is not available in the cache.

This coordination is handled opaquely to the nature of the requests issued and the format of the data being handled. This approach gives applications broad flexibility to configure *Ember***Data** to best suit their needs. This makes *Ember***Data** a powerful solution for applications regardless of their size and complexity.

*Ember***Data** is designed to scale, with a religious focus on performance and asset-size to keep its footprint small but speedy while still being able to handle large complex APIs in huge data-driven applications with no additional code and no added application complexity. Its goal is to prevent applications from writing code to manage data that is difficult to maintain or reason about.

*Ember***Data**'s power comes not from specific features, data formats, or adherence to specific API specs such as `JSON:API` `trpc` or `GraphQL`, but from solid conventions around requesting and mutating data developed over decades of experience scaling developer productivity.

## Basic Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add ember-data
```

`ember-data` is installed by default for new applications generated with `ember-cli`. You can check what version is installed by looking in the `devDependencies` hash of your project's [package.json](https://docs.npmjs.com/cli/v8/configuring-npm/package-json) file.

If you have generated a new `Ember` application using `ember-cli` but do
not wish to use `ember-data`, remove `ember-data` from your project's `package.json` file and run your package manager's install command to update your lockfile.

## Advanced Installation

*Ember***Data** is organized into primitives that compose together via public APIs.

- [@ember-data/store](./packages/store) is the core and handles coordination
- [@ember-data/tracking](./packages/tracking) is required when using the core and provides tracking primitives for change notification of Tracked properties
- [@ember-data/json-api](./packages/json-api) is a resource cache for JSON:API structured data. It integrates with the store via the hook `createCache`
- [@ember-data/model](./packages/model) is a presentation layer, it integrates with the store via the hooks `instantiateRecord` and `teardownRecord`.
- [@ember-data/adapter](./packages/adapter) provides various network API integrations for APIS built over specific REST or JSON:API conventions.
- [@ember-data/serializer](./packages/serializer) pairs with `@ember-data/adapter` to normalize and serialize data to and from an API format into the `JSON:API` format understood by `@ember-data/json-api`.
- [@ember-data/debug](./packages/debug) provides debugging support for the `ember-inspector`.
- [ember-data](./packages/-ember-data) is a "meta" package which bundles all of these together for convenience

The packages interop with each other through well defined public API boundaries. The core
of the library is the store provided by `@ember-data/store`, while each of the other libraries plugs into the store when installed. Because these packages interop via fully
public APIs, other libraries or applications may provide their own implementations. For instance, [ember-m3](https://github.com/hjdivad/ember-m3) is a commonly used presentation and cache implementation suitable for complex resource objects and graphs.

## Configuration

### Deprecation Stripping

*Ember***Data** allows users to opt-in and remove code that exists to support deprecated behaviors.

If your app has resolved all deprecations present in a given version, you may specify that version as your "compatibility" version to remove the code that supported the deprecated behavior from your app.

```ts
let app = new EmberApp(defaults, {
  emberData: {
    compatWith: '4.8',
  },
});
```

- [Full Documentation](https://api.emberjs.com/ember-data/release/modules/@ember-data%2Fdeprecations)

### randomUUID polyfill

*Ember***Data** uses `UUID V4` by default to generate identifiers for new data created on the client. Identifier generation is configurable, but we also for convenience will polyfill
the necessary feature if your browser support or deployment environment demands it. To
activate this polyfill:

```ts
let app = new EmberApp(defaults, {
  emberData: {
    polyfillUUID: true
  },
});
```

### removing inspector support in production

If you do not want to ship inspector support in your production application, you can specify
that all support for it should be stripped from the build.

```ts
let app = new EmberApp(defaults, {
  emberData: {
    includeDataAdapterInProduction: false,
  },
});
```

- [Full Documentation](https://api.emberjs.com/ember-data/release/modules/@ember-data%2Fdebug)

### Debugging

Many portions of the internals are helpfully instrumented with logging that can be activated
at build time. This instrumentation is always removed from production builds or any builds
that has not explicitly activated it. To activate it set the appropriate flag to `true`.

```ts
let app = new EmberApp(defaults, {
  emberData: {
    debug: {
      LOG_PAYLOADS: false, // data store received to update cache with
      LOG_OPERATIONS: false, // updates to cache remote state
      LOG_MUTATIONS: false, // updates to cache local state
      LOG_NOTIFICATIONS: false,
      LOG_REQUESTS: false, // log Requests issued via the request manager
      LOG_REQUEST_STATUS: false,
      LOG_IDENTIFIERS: false,
      LOG_GRAPH: false, // relationship storage
      LOG_INSTANCE_CACHE: false, // instance creation/deletion
    },
  },
});
```

## Compatibility

The following table lists EmberData versions alongside information about
ember compatibility.

- **Lockstep**: the latest version of ember-source at the time of release
- **Supported**: the versions of ember-source the release officially supports
- **Tested**: the versions of ember-source the project tested this release against
- **Range**: the peer-dep range the release states for ember-source

the version of 
ember-source they were release with (lockstep), as well as the range of versions of ember-source that the
project tested against at the point of release.

| Status | EmberData | Lockstep | Supported | Tested | Range |
| ------ | --------- | -------- | --------- | ------ | ----- |
| Latest | ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/latest?label&color=90EE90) | `5.3.0`    | `4.8` `4.12` `5.*` | `3.28` `4.4` `4.8` `4.12` `5.2` `5.3` | `3.28.12`<br> `>= 4.*` <br> `>= 5.*` |
| LTS    | ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/lts?label&color=90EE90) | `4.12.3`   | `4.*` `5.*` | `3.28` `4.4` `4.8` `4.12` `5.0` | `3.28.12`<br> `>= 4.*` <br> `>= 5.*` |
| Prior LTS    | ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/lts-4-12?label&color=90EE90) | `4.12.3`   | `4.*` `5.*` | `3.28` `4.4` `4.8` `4.12` `5.0` | `3.28.12`<br> `>= 4.*` <br> `>= 5.*` |
| unsupported<br>(prior LTS) | ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/lts-4-8?label&color=90EE90) | `4.8.6`   | `4.*` | `3.28` `4.4` `4.8` | `3.28.12`<br> `>= 4.*` |
| unsupported[^1] | ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/release-4-6?label&color=90EE90) | `4.6.0`   | `3.28` `4.*` | `3.28` `4.4` `4.5` `4.6` | `3.28.12`<br> `>= 4.*` |
| unsupported[^1]<br>(prior LTS) | ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/lts-4-4?label&color=90EE90) | `4.4.6`   | `3.28` `4.*` | `3.28` `4.4` | `3.28.12`<br> `>= 4.*` |

[^1]: This version may receive special long-term patches to assist model-fragments users in creating a migration path onto 5.x and off of ModelFragments

## The Big List of Versions

| Package | Audience | LTS-4-12 | LTS | Stable | Beta | Canary |
| ------- | -------- | -------- | --- | ------ | ---- | ------ |
| [ember-data](./packages/-ember-data#readme) | 🐹 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/ember-data/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/ember-data/lts?label&color=0096FF) | ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/ember-data/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/ember-data/canary?label&color=FFBF00) |
| [@ember-data/active-record](./packages/active-record#readme) | 🌌 |  ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/active-record/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/active-record/lts?label&color=0096FF) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/active-record/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/active-record/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/active-record/canary?label&color=FFBF00) |
| [@ember-data/adapter](./packages/adapter#readme) | 🐹 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/adapter/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/adapter/lts?label&color=0096FF) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/adapter/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/adapter/beta?label&color=FF00FF) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/adapter/canary?label&color=FFBF00) |
| [@warp-drive/build-config](./packages/build-config#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/build-config/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/build-config/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/build-config/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/build-config/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/build-config/canary?label&color=FFBF00) |
| [@ember-data/codemods](./packages/codemods#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/codemods/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/codemods/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/codemods/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/codemods/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/codemods/canary?label&color=FFBF00) |
| [@warp-drive/diagnostic](./packages/diagnostic#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/canary?label&color=FFBF00) |
| [@warp-drive/ember](./packages/ember#readme) | 🐹 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/ember/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/ember/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/ember/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/ember/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/ember/canary?label&color=FFBF00) |
| [@warp-drive/experiments](./packages/experiments#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/experiments/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/experiments/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/experiments/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/experiments/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/experiments/canary?label&color=FFBF00) |
| [eslint-plugin-warp-drive](./packages/eslint-plugin-warp-drive#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/canary?label&color=FFBF00) |
| [@ember-data/graph](./packages/graph#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/graph/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/graph/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/graph/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/graph/beta?label&color=ff00ff) | ![NPM Canarye Version](https://img.shields.io/npm/v/@ember-data/graph/canary?label&color=FFBF00) |
| [@warp-drive/holodeck](./packages/holodeck#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/holodeck/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/holodeck/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/holodeck/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/holodeck/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/holodeck/canary?label&color=FFBF00) |
| [@ember-data/json-api](./packages/json-api#readme) | 🌌🐹 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/json-api/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/json-api/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/json-api/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/json-api/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/json-api/canary?label&color=FFBF00) |
| [@ember-data/legacy-compat](./packages/legacy-compat#readme) | 🐹 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/canary?label&color=FFBF00) |
| [@ember-data/model](./packages/model#readme) | 🐹 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/model/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/model/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/model/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/model/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/model/canary?label&color=FFBF00) |
| [@ember-data/request](./packages/request#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/request/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/request/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/request/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/request/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/request/canary?label&color=FFBF00) |
| [@ember-data/request-utils](./packages/request-utils#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/request-utils/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/request-utils/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/request-utils/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/request-utils/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/request-utils/canary?label&color=FFBF00) |
| [@ember-data/rest](./packages/rest#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/rest/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/rest/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/rest/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/rest/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/rest/canary?label&color=FFBF00) |
| [@warp-drive/schema](./packages/schema#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/schema/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/schema/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/schema/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/schema/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/schema/canary?label&color=FFBF00) |
| [@warp-drive/schema-record](./packages/schema-record#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/schema-record/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/schema-record/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/schema-record/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/schema-record/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/schema-record/canary?label&color=FFBF00) |
| [@ember-data/serializer](./packages/serializer#readme) | 🐹 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/serializer/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/serializer/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/serializer/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/serializer/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/serializer/canary?label&color=FFBF00) |
| [@ember-data/store](./packages/store#readme) | 🌌 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/store/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/store/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/store/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/store/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/store/canary?label&color=FFBF00) |
| [@ember-data/tracking](./packages/tracking#readme) | 🌌🐹 | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/tracking/lts-4-12?label&color=bbbbbb) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/tracking/lts?label&color=0096ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/tracking/latest?label&color=90EE90) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/tracking/beta?label&color=ff00ff) | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/tracking/canary?label&color=FFBF00) |

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.

## Code of Conduct

Refer to the [Code of Conduct](https://github.com/emberjs/data/blob/main/CODE_OF_CONDUCT.md) for community guidelines and inclusivity.

### License

This project is licensed under the [MIT License](LICENSE.md).
