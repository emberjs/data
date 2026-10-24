---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/legacy/model-fragments/functions/registerFragmentExtensions.md
description: >-
  Legacy setup function that registers the fragment and fragment-array schema
  extensions on a `SchemaService` to support migrating off ModelFragments.
---

&#x20;

# &#x20;registerFragmentExtensions()

```ts
function registerFragmentExtensions(schema: SchemaService): void;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/instance-initializers/fragment-extensions.ts:17](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/instance-initializers/fragment-extensions.ts#L17)

Registers the [FragmentExtension](../variables/FragmentExtension.md)/[FragmentArrayExtension](../variables/FragmentArrayExtension.md) schema
extensions on the given `SchemaService`, enabling ModelFragments migration support.

## Parameters

### schema

`SchemaService`

## Returns

`void`
