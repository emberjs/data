---
url: https://canary.warp-drive.io/api/@warp-drive/core-types.md
description: >-
  (Legacy) Type-only re-exports of the `@warp-drive/core/types` modules, kept so
  existing `@warp-drive/core-types` imports compile; new code should import from
  `@warp-drive/core/types`.
---

&#x20;

:::warning Legacy package
`@warp-drive/core-types` is a legacy package. New code should use [`@warp-drive/core/types`](/api/@warp-drive/core/types/) instead.

For an app still on these packages, see [Legacy Package Setup](/guides/configuration/legacy-package-setup/).
:::

Every entry point in this package is a type-only re-export of the matching
`@warp-drive/core/types/*` module, kept so existing `@warp-drive/core-types/*`
imports keep compiling. Nothing is declared here; the documentation for each
type lives on the `@warp-drive/core` page it comes from.

| `@warp-drive/core-types` entry | re-exports                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `.` (root)                     | [@warp-drive/core/types](../core/types/index.md)                                       |
| `/cache`                       | [@warp-drive/core/types/cache](../core/types/cache/index.md)                           |
| `/cache/aliases`               | [@warp-drive/core/types/cache/aliases](../core/types/cache/aliases/index.md)           |
| `/cache/change`                | [@warp-drive/core/types/cache/change](../core/types/cache/change/index.md)             |
| `/cache/mutations`             | [@warp-drive/core/types/cache/mutations](../core/types/cache/mutations/index.md)       |
| `/cache/operations`            | [@warp-drive/core/types/cache/operations](../core/types/cache/operations/index.md)     |
| `/cache/relationship`          | [@warp-drive/core/types/cache/relationship](../core/types/cache/relationship/index.md) |
| `/graph`                       | [@warp-drive/core/types/graph](../core/types/graph/index.md)                           |
| `/identifier`                  | [@warp-drive/core/types/identifier](../core/types/identifier/index.md)                 |
| `/json/raw`                    | [@warp-drive/core/types/json/raw](../core/types/json/raw/index.md)                     |
| `/params`                      | [@warp-drive/core/types/params](../core/types/params/index.md)                         |
| `/record`                      | [@warp-drive/core/types/record](../core/types/record/index.md)                         |
| `/request`                     | [@warp-drive/core/types/request](../core/types/request/index.md)                       |
| `/schema/concepts`             | [@warp-drive/core/types/schema/concepts](../core/types/schema/concepts/index.md)       |
| `/schema/fields`               | [@warp-drive/core/types/schema/fields](../core/types/schema/fields/index.md)           |
| `/spec/document`               | [@warp-drive/core/types/spec/document](../core/types/spec/document/index.md)           |
| `/spec/error`                  | [@warp-drive/core/types/spec/error](../core/types/spec/error/index.md)                 |
| `/spec/json-api-raw`           | [@warp-drive/core/types/spec/json-api-raw](../core/types/spec/json-api-raw/index.md)   |
| `/symbols`                     | [@warp-drive/core/types/symbols](../core/types/symbols/index.md)                       |
| `/utils`                       | [@warp-drive/core/types/utils](../core/types/utils/index.md)                           |
