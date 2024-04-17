# 💚 TypeScript Guide

Before getting started, we recommend reading
the following two sections

- [Notice on Type Maturity](#type-maturity)
- [Contributing Type Fixes](#contributing-type-fixes)


---

- Installation
  - [Using Canary](./0-installation.md#using-canary)
  - [Using Types Packages](./0-installation.md#using-types-packages)
- Configuration
  - [Using Canary](./1-configuration.md#using-canary)
  - [Using Types Packages](./1-configuration.md#using-types-packages)
- Usage
  - [Why Brands](./2-why-brands.md)
  - [Typing Models & Transforms](./3-typing-models.md)
  - [Typing Requests & Builders](./4-typing-requests.md)
  - Typing Handlers
  - Using Store APIs

---

## Type Maturity

We publish types in stages, just like `canary | beta | stable` channels for code.

- `private` we don't ship types (yet), even if typed in the repo
- `alpha` we expect high churn on type signatures and users must opt-in to use these types.
- `beta` we expect moderate churn on type signatures and users must opt-in to use these types.
- `stable` we feel the types story is robust enough to attempt to follow semver when changing these types.

Each package in the project can choose its own stage for types.

> [!TIP]
> TypeScript support for all EmberData and WarpDrive packages is currently `alpha`.
>
> **This means that you must opt-in to be able use EmberData's types.**

## Contributing Type Fixes

Even though EmberData is typed, what makes for good types for a project doesn't necessarily make for good types for that project's consumers (your application).

Currently, TypeScript support is `alpha` largely because we expect to need to improve **a lot** of type signatures to make them more useful and correct for your app.

Both strategies for installing and consuming types listed in [installation](./0-installation.md) pull their types from the `main` branch (canary).

Every commit to main can be one-click published by us as a new canary version for both installation strategies, this means we can ship type fixes as quickly as folks contribute them, letting us dogfood our way to robust stable types.
