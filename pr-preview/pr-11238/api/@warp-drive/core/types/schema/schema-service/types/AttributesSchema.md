---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/core/types/schema/schema-service/types/AttributesSchema.md
description: >-
  Legacy attribute field definitions keyed by attribute name, returned by the
  deprecated `attributesDefinitionFor` schema hook.
---

# &#x20;AttributesSchema

```ts
type AttributesSchema = Record<string, LegacyAttributeField>;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:36](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/schema/schema-service.ts#L36)

A dictionary of [LegacyAttributeField](../../fields/types/LegacyAttributeField.md) definitions keyed by
attribute name, as returned by the deprecated
[attributesDefinitionFor](SchemaService.md#attributesdefinitionfor) hook.
