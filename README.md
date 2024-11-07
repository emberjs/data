<p align="center">
  <img
    class="project-logo"
    src="./logos/NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="80px"
    title="WarpDrive"
    />
  <img
    class="project-logo"
    src="./logos/NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="80px"
    title="WarpDrive"
    />
</p>

# WarpDrive

![NPM Stable Version](https://img.shields.io/npm/v/ember-data/latest?label=version&style=flat&color=90EE90)
![NPM Downloads](https://img.shields.io/npm/dm/ember-data.svg?style=flat&color=90EE90)
![License](https://img.shields.io/github/license/emberjs/data.svg?style=flat&color=90EE90)
[![Docs](https://img.shields.io/badge/API%20Docs-grey?logo=ember.js)](https://api.emberjs.com/ember-data/release)
[![Discord Community Server](https://img.shields.io/badge/Discord-grey?logo=discord)](https://discord.gg/zT3asNS
)

<p align="center">
  <br>
  <a href="https://warp-drive.io">WarpDrive</a> is a lightweight data library for web apps &mdash;
  <br>
  universal, typed, reactive, and ready to scale.
  <br/><br/>
<p>

WarpDrive provides features that make it easy to build scalable, fast, feature
rich application &mdash; letting you ship better experiences more quickly without re-architecting your app or API. WarpDrive is:

- ⚡️ Committed to Best-In-Class Performance
- 🌲 Focused on being as svelte as possible
- 🚀 SSR Ready
- 💚 Typed
- 🔜 works with any framework
- ⚛️ Supports any API: `GraphQL` `JSON:API` `REST` `tRPC` ...bespoke or a mix
- 🐹 Built with ♥️ by [Ember](https://emberjs.com)

<br>
<br>

*Get Started* → [Guides](./guides/index.md)

<br>

---

<br>

### Quick Links

- [Installation](#installation)
- [API Docs](https://api.emberjs.com/ember-data/release)
- [Guides](./guides/index.md)
- [Build Config](./packages/build-config/README.md)
- [Ember Compatibility](#compatibility)
- [The Big List of Versions](#the-big-list-of-versions)
- [Contributing](./CONTRIBUTING.md)
- [Community & Help](https://emberjs.com/community)
- [RFCs](https://github.com/emberjs/rfcs/labels/T-ember-data)
- [Team](https://emberjs.com/team)
- [Blog](https://emberjs.com/blog)

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add ember-data
```

> [!NOTE]
> `ember-data` is installed by the default application blueprint for new applications generated with `ember-cli`. You can check what version is installed by looking in the `devDependencies` hash of your project's [package.json](https://docs.npmjs.com/cli/v8/configuring-npm/package-json) file.

### Advanced Installation

```sh
npx warp-drive 
```

## Compatibility

The following table lists WarpDrive/EmberData versions alongside information about
ember compatibility.

- **Lockstep**: the latest version of ember-source at the time of release
- **Supported**: the versions of ember-source the release officially supports
- **Tested**: the versions of ember-source the project tested this release against
- **Range**: the peer-dep range the release states for ember-source

the version of 
ember-source they were release with (lockstep), as well as the range of versions of ember-source that the
project tested against at the point of release.

| Status | WarpDrive/ EmberData | Lockstep | Supported | Tested | Range |
| ------ | -------------------- | -------- | --------- | ------ | ----- |
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

## Code of Conduct

Refer to the [Code of Conduct](https://github.com/emberjs/data/blob/main/CODE_OF_CONDUCT.md) for community guidelines and inclusivity.

### License

This project is licensed under the [MIT License](LICENSE.md).
