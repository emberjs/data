---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/types/record/types/TypedRecordInstance.md
description: >-
  Shape of a record type that declares its resource type via the `[Type]`
  symbol, letting WarpDrive APIs infer types for better type safety.
  TypedRecordInstance
---

# &#x20;TypedRecordInstance

```ts
interface TypedRecordInstance {
  ___(unique) Symbol($type): string;
}
```

Defined in: [warp-drive-packages/core/src/types/record.ts:22](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/record.ts#L22)

Records may be anything, They don't even
have to be objects.

Whatever they are, if they have a Type
property, that property will be used by WarpDrive
and WarpDrive to provide better type safety and
intellisense.

## Properties

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): string;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:38](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/record.ts#L38)

The type of the resource.

This is an optional feature that can be used by
record implementations to provide a typescript
hint for the type of the resource.

When used, WarpDrive APIs can
take advantage of this to provide better type
safety and intellisense.
