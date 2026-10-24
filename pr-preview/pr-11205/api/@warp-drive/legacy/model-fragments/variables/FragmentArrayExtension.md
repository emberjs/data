---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/model-fragments/variables/FragmentArrayExtension.md
---

&#x20;

# &#x20;FragmentArrayExtension

```ts
const FragmentArrayExtension: {
  features: typeof FragmentArray;
  kind: "array";
  name: "fragment-array";
};
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:95](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L95)

A schema extension that adds the [FragmentArray](../classes/FragmentArray.md) API to migrated
`ModelFragments` array resources.

## Type Declaration

### features

```ts
features: typeof FragmentArray;
```

The features ([FragmentArray](../classes/FragmentArray.md)) added by this extension.

### kind

```ts
kind: "array";
```

This extension applies to `'array'` schemas.

### name

```ts
name: "fragment-array";
```

The registered name of this extension.
