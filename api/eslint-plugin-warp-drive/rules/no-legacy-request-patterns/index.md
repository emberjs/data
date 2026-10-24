---
url: >-
  https://canary.warp-drive.io/api/eslint-plugin-warp-drive/rules/no-legacy-request-patterns.md
description: >-
  Lint rule that disallows legacy store and model request methods such as
  `findRecord`, `query`, and `save` in favor of `store.request()`.
---

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `no-legacy-request-patterns` | 🏆 | ✅ |

> \[!TIP]
> A partial autofix for this rule is possible but has not been implemented.
> An autofix PR would be a welcome addition.

> \[!Note]
> This rule disallows using methods which make requests that don't follow the
> recommended RequestManager approach.

## Variables

* [export=](variables/export=.md)
