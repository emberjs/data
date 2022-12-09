EmberData
==============================================================================

[![Build Status](https://github.com/emberjs/data/workflows/CI/badge.svg)](https://github.com/emberjs/data/actions?workflow=CI)
[![Code Climate](https://codeclimate.com/github/emberjs/data/badges/gpa.svg)](https://codeclimate.com/github/emberjs/data)
[![Discord Community Server](https://img.shields.io/discord/480462759797063690.svg?logo=discord)](https://discord.gg/zT3asNS)


# Overview

`EmberData` is a lightweight reactive data library for JavaScript applications that provides composable primitives for ordering query/mutation/peek flows, managing network and cache, and reducing data for presentation. You can plug-and-play as desired for any api  structure and format.

It was designed for robustly managing data in applications built with [Ember](https://github.com/emberjs/ember.js/) and is agnostic to the underlying persistence mechanism, so it works just as well with [JSON:API](https://jsonapi.org/) or [GraphQL](https://graphql.org/) over `HTTPS` as it does with streaming `WebSockets` or local `IndexedDB` storage.

It provides many of the features you'd find in server-side `ORM`s like `ActiveRecord`, but is designed specifically for the unique environment of `JavaScript` in the browser.

- [Usage Guide](https://guides.emberjs.com/release/models/)
- [API Documentation](https://api.emberjs.com/ember-data/release)
- [Contributing Guide](./CONTRIBUTING.md)
- [RFCs](https://github.com/emberjs/rfcs/labels/T-ember-data)
- [Community](https://emberjs.com/community)
- [Team](https://emberjs.com/team)
- [Blog](https://emberjs.com/blog)


## Basic Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add -D ember-data
```

`ember-data` is installed by default for new applications generated with `ember-cli`. You can check what version is installed by looking in the `devDependencies` hash of your project's [package.json](https://docs.npmjs.com/cli/v8/configuring-npm/package-json) file.

If you have generated a new `Ember` application using `ember-cli` but do 
not wish to use `ember-data`, remove `ember-data` from your project's `package.json` file and run your package manager's install command to update your lockfile.

## Advanced Installation

EmberData is organized into primitives that compose together via public APIs.

- [@ember-data/store](https://github.com/emberjs/data/tree/master/packages/store) is the core and handles coordination
- [@ember-data/json-api](https://github.com/emberjs/data/tree/master/packages/record-data) is a resource cache for JSON:API structured data. It integrates with the store via the hook `createRecordDataFor`
- [@ember-data/model](https://github.com/emberjs/data/tree/master/packages/model) is a presentation layer, it integrates with the store via the hooks `instantiateRecord` and `teardownRecord`.
- [@ember-data/adapter](https://github.com/emberjs/data/tree/master/packages/adapter) provides various network API integrations for APIS built over specific REST or JSON:API conventions.
- [@ember-data/serializer](https://github.com/emberjs/data/tree/master/packages/serializer) pairs with `@ember-data/adapter` to normalize and serialize data to and from an API format into the `JSON:API` format understood by `@ember-data/json-api`.
- [@ember-data/debug](https://github.com/emberjs/data/tree/master/packages/debug) provides debugging support for the `ember-inspector`.
- [ember-data](https://github.com/emberjs/data/tree/master/packages/-ember-data) is a "meta" package which bundles all of these together for convenience

The packages interop with each other through well defined public API boundaries. The core
of the library is the store provided by `@ember-data/store`, while each of the other libraries plugs into the store when installed. Because these packages interop via fully
public APIs, other libraries or applications may provide their own implementations. For instance, [ember-m3](https://github.com/hjdivad/ember-m3) is a commonly used presentation and cache implementation suitable for complex resource objects and graphs.

## Configuration

### Deprecation Stripping

EmberData allows users to opt-in and remove code that exists to support deprecated behaviors.

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

EmberData uses `UUID V4` by default to generate identifiers for new data created on the client. Identifier generation is configurable, but we also for convenience will polyfill
the necessary feature if your browser support or deployment environment demands it. To
activate this polyfill:

```ts
let app = new EmberApp(defaults, {
  '@embroider/macros': {
    setConfig: {
      '@ember-data/store': {
        polyfillUUID: true
      },
    },
  },
});
```

### removing inspector support in production

If you do not with to ship inspector support in your production application, you can specify
that all support for it should be stripped from the build.

```ts
let app = new EmberApp(defaults, {
  emberData: {
    includeDataAdapterInProduction: false
  }
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
          LOG_REQUEST_STATUS: false,
          LOG_IDENTIFIERS: false,
          LOG_GRAPH: false, // relationship storage
          LOG_INSTANCE_CACHE: false, // instance creation/deletion
      }
    }
  });
  ```

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.


### License

This project is licensed under the [MIT License](LICENSE.md).
