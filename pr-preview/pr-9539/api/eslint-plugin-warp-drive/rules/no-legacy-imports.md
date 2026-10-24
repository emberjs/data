---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/eslint-plugin-warp-drive/rules/no-legacy-imports.md
description: >-
  Lint rule, with autofix, that rewrites imports from legacy EmberData module
  paths to their modern replacements.
---

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `no-legacy-imports` | 🏆 | ✅ |

> \[!TIP]
> This rule is autofixable. Fixes may split a single import/export into multiple
> declarations when different specifiers map to different target modules. Review
> diffs for these splits.

> \[!NOTE]
> Rewrites legacy EmberData import module specifiers to their
> modern replacements using the enriched public exports mapping embedded from
> `public-exports-mapping-5.5.enriched.json`.

This rule updates module paths only; it does not rename imported identifiers.

## Examples

Before:

```js
import { findRecord } from '@ember-data/rest/request';
export { attr, hasMany } from '@ember-data/model';
```

After:

```js
import { findRecord } from '@warp-drive/utilities/rest';
```

## Scope (v1)

* Static imports only.
* Default and named specifiers are supported, including TypeScript `import type` declarations
  and inline `type` specifiers (e.g. `import { type Foo } from '...'`); their type-only-ness
  is preserved across the rewrite.
* Namespace imports, export-all (`export * from`), re-exports with `from`, CommonJS `require`,
  and dynamic imports are out of scope for v1 (no report).

## Unmapped exports

The embedded mapping is a point-in-time snapshot; it doesn't automatically pick up exports
added afterward. Rather than silently leaving such an import untouched:

* If every export we've ever tracked for a legacy module funnels into the same replacement
  module, an untracked token from that module is routed there too (same export name, no
  guessing at a rename).
* If a legacy module is known but its tracked exports funnel into more than one replacement
  module (e.g. some tokens move to `@warp-drive/core`, others to `@warp-drive/ember`), an
  untracked token from it can't be routed safely. It is reported without an autofix so it
  gets manual attention instead of being silently skipped.
* Imports from modules this rule has no bookkeeping for at all (e.g. third-party packages)
  are still ignored entirely, as before.

## Notes

* Deduplication of existing imports from a replacement module is not performed in v1.

## Variables

* [export=](variables/export=.md)
