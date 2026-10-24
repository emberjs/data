---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/legacy/model-fragments/functions/withLegacy.md
description: >-
  Legacy ModelFragments migration helper that completes a legacy resource schema
  with an `id` identity, `Model` defaults, and the `ember-object` and `fragment`
  extensions.
---

&#x20;

# &#x20;withLegacy()

```ts
function withLegacy(schema: WithPartial<LegacyResourceSchema, "identity" | "legacy">): ResourceSchema;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/utilities/with-legacy.ts:16](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/utilities/with-legacy.ts#L16)

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
