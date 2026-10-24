---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/legacy/model-fragments/variables/FragmentExtension.md
description: >-
  Legacy schema extension named `fragment` that adds the `Fragment` API to
  reactive objects migrated from `ModelFragments`.
---

&#x20;

# &#x20;FragmentExtension

```ts
const FragmentExtension: {
  features: typeof Fragment;
  kind: "object";
  name: "fragment";
};
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:79](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L79)

A schema extension that adds the [Fragment](../classes/Fragment.md) API to migrated
`ModelFragments` object resources.

## Type Declaration

### features

```ts
features: typeof Fragment;
```

The features ([Fragment](../classes/Fragment.md)) added by this extension.

### kind

```ts
kind: "object";
```

This extension applies to `'object'` schemas.

### name

```ts
name: "fragment";
```

The registered name of this extension.
