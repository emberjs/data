---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/model-fragments/functions/withLegacy.md
---

&#x20;

# &#x20;withLegacy()

```ts
function withLegacy(schema: WithPartial<LegacyResourceSchema, "identity" | "legacy">): ResourceSchema;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/utilities/with-legacy.ts:14](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model-fragments/utilities/with-legacy.ts#L14)

Used as a helper to setup the relevant parts of a legacy resource schema
migrated from `Model`, applying the `ember-object` and `fragment` object
extensions and a default `@id` identity field.

## Parameters

### schema

[`WithPartial`](../../../core/types/utils/types/WithPartial.md)<[`LegacyResourceSchema`](../../../core/types/schema/fields/types/LegacyResourceSchema.md), `"identity"` | `"legacy"`>

the partial legacy resource schema to complete

## Returns

[`ResourceSchema`](../../../core/types/schema/fields/types/ResourceSchema.md)

the completed resource schema
