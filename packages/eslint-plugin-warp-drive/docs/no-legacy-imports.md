# eslint-plugin-warp-drive

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `no-legacy-imports` | 🏆 | ✅ |

> [!TIP]
> This rule is autofixable. Fixes may split a single import/export into multiple
> declarations when different specifiers map to different target modules. Review
> diffs for these splits.

> [!NOTE]
> Rewrites legacy Ember Data import module specifiers to their
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

- Static imports only.
- Default and named specifiers are supported.
- Namespace imports, export-all (`export * from`), re-exports with `from`, CommonJS `require`,
  dynamic imports, and type-only handling are out of scope for v1 (no report).

## Notes

- Deduplication of existing imports from a replacement module is not performed in v1.
