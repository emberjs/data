---
url: https://canary.warp-drive.io/api/eslint-plugin-warp-drive.md
description: >-
  ESLint rules and a recommended flat config for apps using WarpDrive, catching
  invalid resource types, ids and relationships, legacy imports and discouraged
  request patterns.
---

Lint rules for helping to ensure best practices and hygiene when using ***Warp*Drive**.

:::tip 💡 Backwards Compatibility
For security and backwards compatibility, this Package is also available as `eslint-plugin-ember-data`
:::

## Rules

* 🛠️ has Autofix
* 〽️ has Partial Autofix
* ✅ Recommended
* 💜 TypeScript Aware

**🏷️ Categories**

* 🐞 Helps prevent buggy code
* ⚡️ Helps prevent performance issues
* 🏆 Enforces a best practice

| Rule | Description | 🏷️ | ✨ |
| ---- | ----------- | -- | -- |
| [no-create-record-rerender](rules/no-create-record-rerender/index.md) | Helps avoid patterns that often lead to excess or broken renders | 🐞⚡️ | ✅ |
| [no-invalid-relationships](rules/no-invalid-relationships/index.md) | Ensures the basic part of relationship configuration is setup appropriately | 🏆 | ✅ |
| [no-legacy-request-patterns](rules/no-legacy-request-patterns/index.md) | Restricts usage of deprecated or discouraged request patterns | 🏆 | ✅ |
| [no-external-request-patterns](rules/no-external-request-patterns/index.md) | Restricts usage of discouraged non-warp-drive request patterns | 🏆 | ✅ |
| [no-invalid-resource-types](rules/no-invalid-resource-types/index.md) | Ensures resource types follow a conventional pattern when used in common APIs | 🏆 | ✅🛠️ |
| [no-invalid-resource-ids](rules/no-invalid-resource-ids/index.md) | Ensures resource ids are strings when used in common APIs | 🏆 | ✅🛠️ |
| [no-legacy-imports](rules/no-legacy-imports/index.md) | Ensures imports use paths specified by the Package Unification RFC | 🏆 | ✅🛠️ |
| [no-test-module-hooks](rules/no-test-module-hooks/index.md) | Disallow `hooks.beforeEach`/`hooks.afterEach` in favor of setup functions each test calls explicitly | ⚡️ | |
| [template-always-use-request-content](rules/template-always-use-request-content/index.md) | Ensures the result of a `<Request>` is actually consumed | 🐞 | |
| [template-require-request-error-block](rules/template-require-request-error-block/index.md) | Ensures `<Request>`/`<Await>` always provide an `:error` block | 🐞 | |
| [require-request-error-block](rules/require-request-error-block/index.md) | Ensures `<Request>` is always given a `states.error` handler | 🐞 | |

## Usage

Recommended Rules are available as a flat config for easy consumption:

```ts
// eslint.config.js (flat config)
const WarpDriveRecommended = require('eslint-plugin-warp-drive/recommended');

module.exports = [
  ...WarpDriveRecommended,
];
```

The template rules, `template-always-use-request-content` and
`template-require-request-error-block`, are available as a separate flat config, since it also
sets `ember-eslint-parser` as the parser for `.gjs`/`.gts` files:

```ts
// eslint.config.js (flat config)
const WarpDriveRecommended = require('eslint-plugin-warp-drive/recommended');
const WarpDriveTemplateRecommended = require('eslint-plugin-warp-drive/recommended-templates');

module.exports = [
  ...WarpDriveRecommended,
  ...WarpDriveTemplateRecommended,
];
```

The React rule, `require-request-error-block`, is available as a separate flat config, since it
also enables JSX parsing for `.jsx`/`.tsx` files:

```ts
// eslint.config.js (flat config)
const WarpDriveRecommended = require('eslint-plugin-warp-drive/recommended');
const WarpDriveReactRecommended = require('eslint-plugin-warp-drive/recommended-react');

module.exports = [
  ...WarpDriveRecommended,
  ...WarpDriveReactRecommended,
];
```

The internal rule, `no-test-module-hooks`, encodes conventions for a large test suite like
***Warp*Drive**'s own rather than for app code, so it is kept out of `recommended` and is
available as its own flat config:

```ts
// eslint.config.js (flat config)
const WarpDriveRecommended = require('eslint-plugin-warp-drive/recommended');
const WarpDriveInternalRecommended = require('eslint-plugin-warp-drive/recommended-internal');

module.exports = [
  ...WarpDriveRecommended,
  ...WarpDriveInternalRecommended,
];
```

## Guides

* [Linting](/guides/linting/): install the plugin and enable its recommended, template and React
  configs.

## Variables

* [export=](variables/export=.md)
