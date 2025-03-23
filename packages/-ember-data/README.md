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

![NPM Stable Version](https://img.shields.io/npm/v/ember-data/latest?label=version&style=flat&color=FFC474)
![NPM Downloads](https://img.shields.io/npm/dm/ember-data.svg?style=flat&color=FFC474)
![License](https://img.shields.io/github/license/emberjs/data.svg?style=flat&color=FFC474)
[![Docs](./logos/docs-badge.svg)](https://api.emberjs.com/ember-data/release)
[![Discord Community Server](https://img.shields.io/badge/Discord-grey?logo=discord&logoColor=FFC474)](https://discord.gg/zT3asNS
)

---

> [!TIP]
> EmberData is going universal and rebranding as WarpDrive
> with support for any signals based reactive framework!
>
> This means you may already see some references to WarpDrive.

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

## Quick Links

- Getting Started
  - [Basic Installation](#basic-installation)
  - [Advanced Installation](#advanced-installation)
  - [Configuration](https://github.com/emberjs/data/blob/main/packages/build-config/README.md)
- Learn
  - [API Documentation](https://api.emberjs.com/ember-data/release)
  - [New Guides (🚧 WIP)](https://github.com/emberjs/data/blob/main/guides/index.md)
  - [Community Resources](https://github.com/emberjs/data/blob/main/guides/community-resources.md)
  - [Ember Usage Guide](https://guides.emberjs.com/release/models/)
  - [Ember Tutorial](https://guides.emberjs.com/release/tutorial/part-1/)
- Get Involved
  - [Discord Community](https://discord.com/invite/emberjs)
  - [Community & Help](https://emberjs.com/community)
  - [Contributing](https://github.com/emberjs/data/blob/main/CONTRIBUTING.md)
  - [RFCs](https://github.com/emberjs/rfcs/labels/T-ember-data)
  - [Team](https://emberjs.com/team)
  - [Blog](https://emberjs.com/blog)

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

Some EmberData APIs are older than others, and these still interop via well-defined
 public API boundaries but are no longer the ideal approach.

- [@ember-data/model](../packages/model) provides a class-based approach to declaring schemas for reactive data.
- [@ember-data/legacy-compat](../packages/legacy-compat) provides support for the older adapter/serializer request paradigm that is being phased out
- [@ember-data/adapter](../packages/adapter) provides various network API integrations for APIs built over specific REST or `{JSON:API}` conventions.
- [@ember-data/serializer](../packages/serializer) provides an approach to normalizing and serializing data to and from an API format into the `{JSON:API}` format.

And finally:

- [ember-data](./packages/-ember-data) is a "meta" package which bundles many of these together for convenience in a "legacy" configuration.

### License

This project is licensed under the [MIT License](LICENSE.md).
