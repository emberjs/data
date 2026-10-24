---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/model-fragments/functions/withLegacy.md
---

&#x20;

# &#x20;withLegacy()

```ts
function withLegacy(schema: WithPartial<LegacyResourceSchema, "identity" | "legacy">): ResourceSchema;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/utilities/with-legacy.ts:14](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/model-fragments/utilities/with-legacy.ts#L14)

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
