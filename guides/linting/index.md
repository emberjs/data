---
order: 0
catgoryOrder: 3
categoryTitle: Linting
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


## Usage

Recommended Rules are available as a flat config for easy consumption:

```ts
// eslint.config.js (flat config)
const WarpDriveRecommended = require('eslint-plugin-warp-drive/recommended');

module.exports = [
  ...WarpDriveRecommended,
];
```
