<p align="center">
  <img
    class="project-logo"
    src="./logos/ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData"
    width="240px"
    title="EmberData"
    />
  <img
    class="project-logo"
    src="./logos/ember-data-logo-dark.svg#gh-dark-mode-only"
    alt="EmberData"
    width="240px"
    title="EmberData"
    />
</p>

<p align="center">
  <br>
  <a href="https://warp-drive.io">EmberData</a> is a lightweight data library for web apps &mdash;
  <br>
  universal, typed, reactive, and ready to scale.
  <br/><br/>
<p>

> [!TIP]
> EmberData is going universal and rebranding as WarpDrive
> with support for any signals based reactive framework!
>
> This means you may already see some references to WarpDrive.

[![Build Status](https://github.com/emberjs/data/workflows/CI/badge.svg)](https://github.com/emberjs/data/actions?workflow=CI)
[![Discord Community Server](https://img.shields.io/discord/480462759797063690.svg?logo=discord)](https://discord.gg/zT3asNS)

---

EmberData provides features that make it easy to build scalable, fast, feature
rich application &mdash; letting you ship better experiences more quickly without re-architecting your app or API. EmberData is:

- ⚡️ Committed to Best-In-Class Performance
- 💚 Typed
- ⚛️ Works with any API
- 🌲 Focused on being as tiny as possible
- 🚀 SSR Ready
- 🔜 Seamless reactivity in any framework
- 🐹 Built with ♥️ by [Ember](https://emberjs.com)

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

*Ember***Data** is both _resource_ centric and _document_ centric in it's approach to caching, requesting and presenting data. Your application's configuration and usage drives which is important and when.

The `Store` is a **coordinator**. When using a `Store` you configure what cache to use, how cache data should be presented to the UI, and where it should look for requested data when it is not available in the cache.

This coordination is handled opaquely to the nature of the requests issued and the format of the data being handled. This approach gives applications broad flexibility to configure *Ember***Data** to best suite their needs. This makes *Ember***Data** a powerful solution for applications regardless of their size and complexity.

*Ember***Data** is designed to scale, with a religious focus on performance and asset-size to keep its footprint small but speedy while still being able to handle large complex APIs in huge data-driven applications with no additional code and no added application complexity. It's goal is to prevent applications from writing code to manage data that is difficult to maintain or reason about.

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

*Ember***Data** is organized into primitives that compose together via public APIs. These primitives are organized into
small packages encapsulating these boundaries. These packages
declare peer-dependencies (sometimes optional peer dependencies)
on the other *Ember***Data**/*Warp***Drive** packages they require use of.

- [@ember-data/request](../packages/request) provides managed `fetch`
- [@ember-data/request-utils](../packages/request-utils) provides optional utilities for managing requests and string manipulation
- [@ember-data/store](../packages/store) provides core functionality around coordinating caching and reactivity 
- [@ember-data/tracking](../packages/tracking) enables integration with Ember's reactivity system
- [@ember-data/json-api](../packages/json-api) provides a cache for data in the [{JSON:API}](https://jsonapi.org) format.
- [@ember-data/debug](../packages/debug) provides (optional) debugging support for the `ember-inspector`.
- [@warp-drive/build-config](../packages/build-config) provides a build plugin which ensures proper settings configuration for deprecations, optional features, development/testing support and debug logging.
- [@warp-drive/core-types](../packages/core-types) provides core types and symbols used by all other packages
- [@warp-drive/schema-record](../packages/schema-record) provides a flexible, schema-based approach to reactive data.
- [@warp-drive/ember](../packages/ember) provides Ember specific components and utilities for reactive control-flow and declarative state management.

Some EmberData APIs are older than others, and these still interop via well-defined public API boundaries but are
no longer the ideal approach.

- [@ember-data/model](../packages/model) provides a class-based approach to declaring schemas for reactive data.
- [@ember-data/legacy-compat](../packages/legacy-compat) provides support for the older adapter/serializer request paradigm that is being phased out
- [@ember-data/adapter](../packages/adapter) provides various network API integrations for APIs built over specific REST or `{JSON:API}` conventions.
- [@ember-data/serializer](../packages/serializer) provides an approach to normalizing and serializing data to and from an API format into the `{JSON:API}` format.

And finally:

- [ember-data](./packages/-ember-data) is a "meta" package which bundles all of these together for convenience

The packages interop with each other through well defined public API boundaries. The core
of the library is the store provided by `@ember-data/store`, while each of the other libraries plugs into the store when installed. Because these packages interop via fully
public APIs, other libraries or applications may provide their own implementations. For instance, [ember-m3](https://github.com/hjdivad/ember-m3) is a commonly used presentation and cache implementation suitable for complex resource objects and graphs.

## Configuration

Settings configuration for deprecations, optional features, development/testing support and debug logging is done using `setConfig` in `ember-cli-build`

```ts
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config');

  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, {
    // settings here
  });

  const { Webpack } = require('@embroider/webpack');
  return require('@embroider/compat').compatBuild(app, Webpack, {});
};

```

### Deprecation Stripping

*Ember***Data** allows users to opt-in and remove code that exists to support deprecated behaviors.

If your app has resolved all deprecations present in a given version, you may specify that version as your "compatibility" version to remove the code that supported the deprecated behavior from your app.

You may also specify that specific deprecations are resolved. These can be used together.

```ts
setConfig(app, __dirname, {
  // declare that all deprecations through "5.0" have been fully resolved
  compatWith: '5.0',

  // mark individual deprecations as resolved by setting them to `false`
  deprecations: {
    // resolve individual deprecations here
  },
});
```

- [Full Documentation](https://api.emberjs.com/ember-data/release/modules/@ember-data%2Fdeprecations)

### randomUUID polyfill

*Ember***Data** uses `UUID V4` by default to generate identifiers for new data created on the client. Identifier generation is configurable, but we also for convenience will polyfill
the necessary feature if your browser support or deployment environment demands it. To
activate this polyfill:

```ts
setConfig(app, __dirname, {
  polyfillUUID: true,
});
```

### removing inspector support in production

If you do not want to ship inspector support in your production application, you can specify
that all support for it should be stripped from the build.

```ts
setConfig(app, __dirname, {
  includeDataAdapterInProduction: false
});
```

- [Full Documentation](https://api.emberjs.com/ember-data/release/modules/@ember-data%2Fdebug)

### Debugging

Many portions of the internals are helpfully instrumented with logging that can be activated
at build time. This instrumentation is always removed from production builds or any builds
that has not explicitly activated it. To activate it set the appropriate flag to `true`.

```ts
setConfig(app, __dirname, {
  includeDataAdapterInProduction: false,
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
});

```

### License

This project is licensed under the [MIT License](LICENSE.md).
