---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/reactive/types/FieldChange.md
---

# &#x20;FieldChange

```ts
interface FieldChange {
  kind: "field";
  localState: Value;
  remoteState: Value | undefined;
}
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:33](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L33)

The local change to a single non-relationship field of a resource, as
reported by [ReactiveResourceState.changes](ReactiveResourceState.md#changes).

Values are in the form the cache stores them, before any
[Transformation](Transformation.md) is applied, the same as `cache.changedAttrs`.

## Properties

### kind

```ts
kind: "field";
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:35](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L35)

identifies this change as a non-relationship field change

***

### localState

```ts
localState: Value;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:39](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L39)

the field's value including the local (uncommitted) change

***

### remoteState

```ts
remoteState: Value | undefined;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:37](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L37)

the field's value as last known from the API, or `undefined` if it has none
