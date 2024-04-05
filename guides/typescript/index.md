# 💚 TypeScript Guide

We publish types in stages, a bit like canary vs beta vs stable channels for code.

- `private` we don't ship types (yet)
- `alpha` we expect high churn on type signatures and users must opt-in to use these types.
- `beta` we expect moderate churn on type signatures and users must opt-in to use these types.
- `stable` we feel the types story is robust enough to attempt to follow semver when changing these types.

Each package in the project can choose its own stage for types.

TypeScript support for all EmberData and WarpDrive packages is currently `alpha`. **This means that you must opt-in to be able use EmberData's types.**

---

## Installation

There are currently two ways to gain access to EmberData's native types.

1) Use Canary (latest canary is ![NPM Canary Version](https://img.shields.io/npm/v/ember-data/canary?label=%40canary&color=FFBF00))

2) Use the `@ember-data-types/*` and `@warp-drive-types/*` packages
with releases `>= 4.12.*`


> [!CAUTION]
> EmberData does not maintain the DefinitelyTyped types for 
> EmberData (e.g. the `@types/ember-data__*`). If you were
> previously using these, you should uninstall them first.


