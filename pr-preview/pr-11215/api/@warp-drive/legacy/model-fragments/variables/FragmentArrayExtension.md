---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/legacy/model-fragments/variables/FragmentArrayExtension.md
description: >-
  Legacy schema extension named `fragment-array` that adds the `FragmentArray`
  API to reactive arrays migrated from `ModelFragments`.
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

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:101](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L101)

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
