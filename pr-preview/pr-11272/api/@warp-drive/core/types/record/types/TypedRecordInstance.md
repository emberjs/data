---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/record/types/TypedRecordInstance.md
---

# &#x20;TypedRecordInstance

```ts
interface TypedRecordInstance {
  ___(unique) Symbol($type): string;
}
```

Defined in: [warp-drive-packages/core/src/types/record.ts:14](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/record.ts#L14)

Records may be anything, They don't even
have to be objects.

Whatever they are, if they have a Type
property, that property will be used by WarpDrive
and WarpDrive to provide better type safety and
intellisense.

TypedRecordInstance

## Properties

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): string;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:30](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/record.ts#L30)

The type of the resource.

This is an optional feature that can be used by
record implementations to provide a typescript
hint for the type of the resource.

When used, WarpDrive APIs can
take advantage of this to provide better type
safety and intellisense.
