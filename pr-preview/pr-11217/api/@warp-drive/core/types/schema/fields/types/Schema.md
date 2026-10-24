---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/core/types/schema/fields/types/Schema.md
description: >-
  Union of resource and object schemas, covering any schema that can be
  registered with or returned by the schema service.
---

# &#x20;Schema

```ts
type Schema = ResourceSchema | ObjectSchema;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2570](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/schema/fields.ts#L2570)

A union of [ResourceSchema](ResourceSchema.md) and [ObjectSchema](ObjectSchema.md) representing
any schema that can be registered with or returned by the SchemaService.
