---
url: https://canary.warp-drive.io/pr-preview/pr-11217/guides/linting.md
description: >-
  Install eslint-plugin-warp-drive and enable its recommended, template, and
  React flat configs, including the ember-eslint-parser setup that Glimmer
  template rules need.
---

# Linting

Install the ESLint plugin `eslint-plugin-warp-drive`

::: code-group

```sh [pnpm]
pnpm add -E eslint-plugin-warp-drive@latest
```

```sh [npm]
npm add -E eslint-plugin-warp-drive@latest
```

```sh [yarn]
yarn add -E eslint-plugin-warp-drive@latest
```

```sh [bun]
bun add --exact eslint-plugin-warp-drive@latest
```

:::

## Rules

See the API docs for [eslint-plugin-warp-drive](/api/eslint-plugin-warp-drive/)

## Template Rules

Template rules operate on the Glimmer template AST rather than the JS/TS AST. They require
[`ember-eslint-parser`](https://github.com/NullVoxPopuli/ember-eslint-parser) (a dependency of
`eslint-plugin-warp-drive`) to be configured as the parser for the files being linted, since that's
what exposes template nodes to ESLint as `Glimmer`-prefixed selectors (e.g. `GlimmerElementNode`) for
`.gjs`/`.gts` files, or `ember-eslint-parser/hbs` for classic `.hbs` files. This mirrors the approach
[`eslint-plugin-ember`](https://github.com/ember-cli/eslint-plugin-ember) uses for its own
`template-*` rules, and the direction laid out in the
[First-Class Component Templates RFC](https://rfcs.emberjs.com/id/0779-first-class-component-templates/#linting-and-formatting)
for integrating template linting into ESLint.

## React Rules

React rules operate on the JSX AST rather than the JS/TS AST or the Glimmer template AST used by
the rules above. They don't require any special parser dependency beyond enabling JSX parsing --
ESLint's default parser (or `@typescript-eslint/parser` for `.tsx` files) already exposes plain
`JSX*`-prefixed selectors (e.g. `JSXElement`, `JSXOpeningElement`) once
`parserOptions.ecmaFeatures.jsx` is enabled.

## Usage

Recommended Rules are available as a flat config for easy consumption:

```ts
// eslint.config.js (flat config)
const WarpDriveRecommended = require('eslint-plugin-warp-drive/recommended');
const WarpDriveTemplateRecommended = require('eslint-plugin-warp-drive/recommended-templates');
const WarpDriveReactRecommended = require('eslint-plugin-warp-drive/recommended-react');

module.exports = [
  ...WarpDriveRecommended,
  ...WarpDriveTemplateRecommended,
  ...WarpDriveReactRecommended,
];
```
