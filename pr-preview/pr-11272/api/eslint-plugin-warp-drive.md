---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/eslint-plugin-warp-drive.md
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

## Usage

Recommended Rules are available as a flat config for easy consumption:

```ts
// eslint.config.js (flat config)
const WarpDriveRecommended = require('eslint-plugin-warp-drive/recommended');

module.exports = [
  ...WarpDriveRecommended,
];
```

## Variables

* [export=](variables/export=.md)
