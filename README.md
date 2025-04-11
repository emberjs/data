<h1 align="center">
  <img
    class="project-logo"
    src="./logos/github-header.svg#gh-light-mode-only"
    alt="WarpDrive | Boldly go where no app has gone before"
    title="WarpDrive | Boldly go where no app has gone before"
    />
  <img
    class="project-logo"
    src="./logos/github-header.svg#gh-dark-mode-only"
    alt="WarpDrive | Boldly go where no app has gone before"
    title="WarpDrive | Boldly go where no app has gone before"
    />
</h1>

![NPM Stable Version](https://img.shields.io/npm/v/ember-data/latest?label=version&style=flat&color=FFC474)
![NPM Downloads](https://img.shields.io/npm/dm/ember-data.svg?style=flat&color=FFC474)
![License](https://img.shields.io/github/license/emberjs/data.svg?style=flat&color=FFC474)
[![Docs](./logos/docs-badge.svg)](https://api.emberjs.com/ember-data/release)
[![Discord Community Server](https://img.shields.io/badge/Discord-grey?logo=discord&logoColor=FFC474)](https://discord.gg/zT3asNS
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
- 💚 Typed
- ⚛️ Works with any API
- 🌲 Focused on being as tiny as possible
- 🚀 SSR Ready
- 🔜 Seamless reactivity in any framework
- 🐹 Built with ♥️ by [Ember](https://emberjs.com)

<br>
<br>

*Get Started* → [Guides](./guides/index.md)

<br>

---

<br>

## Quick Links

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

<br>

## Installation

```sh
pnpm add ember-data
```

> [!NOTE]
> This will install the "legacy" experience. A new installer
> is currently being worked on for the Polaris experience and will
> be available soon.

<br>

## Compatibility

The following table lists WarpDrive/EmberData versions alongside information about
ember compatibility.

- **Lockstep**: the latest version of ember-source at the time of release
- **Supported**: the versions of ember-source the release officially supports
- **Tested**: the versions of ember-source the project tested this release against
- **Range**: the peer-dep range the release states for ember-source

The library is often compatible with a larger range than was officially supported at
the time of release, and we make an effort to test against a larger range than we officially
state is supported. In many cases it will be compatible for a larger range than is shown here.

Where possible, we try to maintain this larger window of support as long as possible, but if
it does become necessary to break compatibility with an older, unsupported release we do not
consider it a breaking change.

The table is generated from [this data](./internal-tooling/src/tasks/-data/compatibility.ts) using the
command `bun sync-readme-tables`.

<!-- START-COMPATIBILITY-TABLE-PLACEHOLDER -->
|  | Status | WarpDrive/EmberData | Lockstep | Supported | Tested | Range |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ | Canary | ![NPM canary Version](https://img.shields.io/npm/v/ember-data/canary?label&color=90EE90) | `6.4` | `4.8`<br>`4.12`<br>`5.*`<br>`6.*` | `3.28`<br>`4.4`<br>`4.8`<br>`4.12`<br>`5.4`<br>`5.8`<br>`5.12`<br>`6.3` | `3.28.12`<br>`>= 4.*`<br>`>= 5.*`<br>`>= 6.*` |
| ✅ | Beta | ![NPM beta Version](https://img.shields.io/npm/v/ember-data/beta?label&color=90EE90) | `6.4` | `4.8`<br>`4.12`<br>`5.*`<br>`6.*` | `3.28`<br>`4.4`<br>`4.8`<br>`4.12`<br>`5.4`<br>`5.8`<br>`5.12`<br>`6.3` | `3.28.12`<br>`>= 4.*`<br>`>= 5.*`<br>`>= 6.*` |
| ✅ | Latest (Stable) | ![NPM latest Version](https://img.shields.io/npm/v/ember-data/latest?label&color=90EE90) | `>= 5.3`<br>`6.0`<br>`6.1`<br>`6.2`<br>`6.3` | `4.8`<br>`4.12`<br>`5.*`<br>`6.*` | `3.28`<br>`4.4`<br>`4.8`<br>`4.12`<br>`5.4`<br>`5.8`<br>`5.12`<br>`6.3` | `3.28.12`<br>`>= 4.*`<br>`>= 5.*`<br>`>= 6.*` |
| ✅ | LTS | ![NPM lts Version](https://img.shields.io/npm/v/ember-data/lts?label&color=90EE90) | `>= 5.3`<br>`6.0`<br>`6.1`<br>`6.2`<br>`6.3` | `4.8`<br>`4.12`<br>`5.*`<br>`6.*` | `3.28`<br>`4.4`<br>`4.8`<br>`4.12`<br>`5.4`<br>`5.8`<br>`5.12`<br>`6.3` | `3.28.12`<br>`>= 4.*`<br>`>= 5.*`<br>`>= 6.*` |
| ✅ | V4 Special Release<br>(vite support)[^1] | ![NPM v4-canary Version](https://img.shields.io/npm/v/ember-data/v4-canary?label&color=90EE90) | `6.3` | `4.*`<br>`5.*`<br>`6.*` | `3.28`<br>`4.4`<br>`4.8`<br>`4.12`<br>`5.4`<br>`5.8`<br>`5.12`<br>`6.3` | `3.28.12`<br>`>= 4.*`<br>`>= 5.*`<br>`>= 6.*` |
| ❌ | (unsupported)<br>Prior LTS | ![NPM lts-4-12 Version](https://img.shields.io/npm/v/ember-data/lts-4-12?label&color=90EE90) | `4.12.3` | `4.*`<br>`5.*` | `3.28`<br>`4.4`<br>`4.8`<br>`4.12`<br>`5.0` | `3.28.12`<br>`>= 4.*`<br>`>= 5.*` |
| ❌ | (unsupported)<br>Prior LTS | ![NPM lts-4-8 Version](https://img.shields.io/npm/v/ember-data/lts-4-8?label&color=90EE90) | `4.8.6` | `4.*` | `3.28`<br>`4.4`<br>`4.8` | `3.28.12`<br>`>= 4.*` |
| ⚠️ | (unsupported)<br>ModelFragments[^2] | ![NPM release-4-6 Version](https://img.shields.io/npm/v/ember-data/release-4-6?label&color=90EE90) | `4.6.0` | `3.28`<br>`4.*` | `3.28`<br>`4.4`<br>`4.5`<br>`4.6` | `3.28.12`<br>`>= 4.*` |
| ⚠️ | (unsupported)<br>Prior LTS[^2] | ![NPM lts-4-4 Version](https://img.shields.io/npm/v/ember-data/lts-4-4?label&color=90EE90) | `4.4.5` | `3.28`<br>`4.*` | `3.28`<br>`4.4` | `3.28.12`<br>`>= 4.*` |
| ⚠️ | (unsupported)<br>Prior LTS[^3] | ![NPM lts-3-28 Version](https://img.shields.io/npm/v/ember-data/lts-3-28?label&color=90EE90) | `3.28.12` | `3.*`<br>`4.*` | `3.20`<br>`3.24`<br>`3.28` | `>= 3.*`<br>`>= 4.*` |
<!-- END-COMPATIBILITY-TABLE-PLACEHOLDER -->

[^1]: Special release to support vite builds in apps using 4.x

[^2]: This version may receive special long-term patches to assist model-fragments users in creating a migration path onto 5.x and off of ModelFragments

[^3]: Special updates have occurred to extend support to ember-source v5 and v6

<br>

## The Big List of Versions

The table below is generated using the command `bun sync-readme-tables`.

<!-- START-VERSIONS-TABLE-PLACEHOLDER -->
| Package | Audience | V4-Canary | LTS-4-12 | LTS | Stable | Beta | Canary |
| ------- | -------- | --------- | -------- | --- | ------ | ---- | ------ |
| [warp-drive](./packages//Users/cthoburn/github/data2/packages/-warp-drive/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/warp-drive/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/warp-drive/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/warp-drive/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/warp-drive/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/warp-drive/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/warp-drive/lts-4-12?label&color=bbbbbb) |
| [eslint-plugin-warp-drive](./packages//Users/cthoburn/github/data2/packages/eslint-plugin-warp-drive/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/eslint-plugin-warp-drive/lts-4-12?label&color=bbbbbb) |
| [ember-data](./packages//Users/cthoburn/github/data2/packages/-ember-data/package.json#readme) | 🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/ember-data/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/ember-data/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/ember-data/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/ember-data/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/ember-data/lts-4-12?label&color=bbbbbb) |
| [@warp-drive/schema-record](./packages//Users/cthoburn/github/data2/packages/schema-record/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/schema-record/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/schema-record/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/schema-record/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/schema-record/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@warp-drive/schema-record/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/schema-record/lts-4-12?label&color=bbbbbb) |
| [@warp-drive/holodeck](./packages//Users/cthoburn/github/data2/packages/holodeck/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/holodeck/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/holodeck/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/holodeck/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/holodeck/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@warp-drive/holodeck/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/holodeck/lts-4-12?label&color=bbbbbb) |
| [@warp-drive/experiments](./packages//Users/cthoburn/github/data2/packages/experiments/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/experiments/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/experiments/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/experiments/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/experiments/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@warp-drive/experiments/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/experiments/lts-4-12?label&color=bbbbbb) |
| [@warp-drive/ember](./packages//Users/cthoburn/github/data2/packages/ember/package.json#readme) | 🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/ember/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/ember/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/ember/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/ember/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@warp-drive/ember/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/ember/lts-4-12?label&color=bbbbbb) |
| [@warp-drive/diagnostic](./packages//Users/cthoburn/github/data2/packages/diagnostic/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/diagnostic/lts-4-12?label&color=bbbbbb) |
| [@warp-drive/core-types](./packages//Users/cthoburn/github/data2/packages/core-types/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/core-types/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/core-types/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/core-types/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/core-types/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@warp-drive/core-types/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/core-types/lts-4-12?label&color=bbbbbb) |
| [@warp-drive/build-config](./packages//Users/cthoburn/github/data2/packages/build-config/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@warp-drive/build-config/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@warp-drive/build-config/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@warp-drive/build-config/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@warp-drive/build-config/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@warp-drive/build-config/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@warp-drive/build-config/lts-4-12?label&color=bbbbbb) |
| [@ember-data/tracking](./packages//Users/cthoburn/github/data2/packages/tracking/package.json#readme) | 🌌🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/tracking/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/tracking/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/tracking/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/tracking/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/tracking/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/tracking/lts-4-12?label&color=bbbbbb) |
| [@ember-data/store](./packages//Users/cthoburn/github/data2/packages/store/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/store/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/store/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/store/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/store/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/store/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/store/lts-4-12?label&color=bbbbbb) |
| [@ember-data/serializer](./packages//Users/cthoburn/github/data2/packages/serializer/package.json#readme) | 🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/serializer/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/serializer/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/serializer/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/serializer/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/serializer/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/serializer/lts-4-12?label&color=bbbbbb) |
| [@ember-data/rest](./packages//Users/cthoburn/github/data2/packages/rest/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/rest/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/rest/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/rest/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/rest/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/rest/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/rest/lts-4-12?label&color=bbbbbb) |
| [@ember-data/request-utils](./packages//Users/cthoburn/github/data2/packages/request-utils/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/request-utils/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/request-utils/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/request-utils/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/request-utils/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/request-utils/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/request-utils/lts-4-12?label&color=bbbbbb) |
| [@ember-data/request](./packages//Users/cthoburn/github/data2/packages/request/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/request/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/request/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/request/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/request/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/request/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/request/lts-4-12?label&color=bbbbbb) |
| [@ember-data/model](./packages//Users/cthoburn/github/data2/packages/model/package.json#readme) | 🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/model/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/model/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/model/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/model/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/model/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/model/lts-4-12?label&color=bbbbbb) |
| [@ember-data/legacy-compat](./packages//Users/cthoburn/github/data2/packages/legacy-compat/package.json#readme) | 🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/legacy-compat/lts-4-12?label&color=bbbbbb) |
| [@ember-data/json-api](./packages//Users/cthoburn/github/data2/packages/json-api/package.json#readme) | 🌌🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/json-api/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/json-api/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/json-api/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/json-api/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/json-api/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/json-api/lts-4-12?label&color=bbbbbb) |
| [@ember-data/graph](./packages//Users/cthoburn/github/data2/packages/graph/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/graph/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/graph/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/graph/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/graph/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/graph/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/graph/lts-4-12?label&color=bbbbbb) |
| [@ember-data/debug](./packages//Users/cthoburn/github/data2/packages/debug/package.json#readme) | 🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/debug/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/debug/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/debug/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/debug/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/debug/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/debug/lts-4-12?label&color=bbbbbb) |
| [@ember-data/codemods](./packages//Users/cthoburn/github/data2/packages/codemods/package.json#readme) | 🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/codemods/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/codemods/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/codemods/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/codemods/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/codemods/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/codemods/lts-4-12?label&color=bbbbbb) |
| [@ember-data/adapter](./packages//Users/cthoburn/github/data2/packages/adapter/package.json#readme) | 🐹 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/adapter/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/adapter/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/adapter/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/adapter/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/adapter/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/adapter/lts-4-12?label&color=bbbbbb) |
| [@ember-data/active-record](./packages//Users/cthoburn/github/data2/packages/active-record/package.json#readme) | 🌌 | ![NPM Canary Version](https://img.shields.io/npm/v/@ember-data/active-record/canary?label&color=FFBF00) | ![NPM Beta Version](https://img.shields.io/npm/v/@ember-data/active-record/beta?label&color=ff00ff) | ![NPM Stable Version](https://img.shields.io/npm/v/@ember-data/active-record/latest?label&color=90EE90) | ![NPM LTS Version](https://img.shields.io/npm/v/@ember-data/active-record/lts?label&color=0096FF) | ![NPM V4 Canary Version](https://img.shields.io/npm/v/@ember-data/active-record/v4-canary?label&color=FFBF00) | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/@ember-data/active-record/lts-4-12?label&color=bbbbbb) |
<!-- END-VERSIONS-TABLE-PLACEHOLDER -->

<br>

## Code of Conduct

Refer to the [Code of Conduct](https://github.com/emberjs/data/blob/main/CODE_OF_CONDUCT.md) for community guidelines and inclusivity.

<br>

### License

This project is licensed under the [MIT License](LICENSE.md).
